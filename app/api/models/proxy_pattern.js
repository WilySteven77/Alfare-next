// ===== PATRÓN PROXY - Para sistema de pagos seguro =====

class SistemaPagosReal {
    constructor() {
        this.transacciones = [];
    }

    procesarPago(usuario, monto, metodoPago) {
        const transaccion = {
            success: true,
            transactionId: `TXN_${Date.now()}`,
            usuarioId: usuario.id,
            monto,
            fecha: new Date().toISOString(),
            metodoPago,
            estado: 'completado'
        };
        
        this.transacciones.push(transaccion);
        return transaccion;
    }

    consultarHistorialPagos(usuarioId) {
        return this.transacciones
            .filter(t => t.usuarioId === usuarioId)
            .map(t => ({
                id: t.transactionId,
                monto: t.monto,
                fecha: t.fecha,
                estado: t.estado,
                metodoPago: t.metodoPago
            }));
    }

    // GET: Obtener estadísticas de pagos
    getEstadisticasPagos() {
        const total = this.transacciones.reduce((sum, t) => sum + t.monto, 0);
        return {
            success: true,
            data: {
                totalTransacciones: this.transacciones.length,
                montoTotal: total,
                ultimaTransaccion: this.transacciones[this.transacciones.length - 1]
            }
        };
    }
}

class ProxyPagos {
    constructor() {
        this.sistemaPagosReal = new SistemaPagosReal();
        this.intentosFallidos = new Map();
        this.sesionesActivas = new Set();
        this.logAccesos = [];
    }

    // Middleware de validación
    validarCredenciales(usuario) {
        if (!usuario) return false;
        return usuario.id && usuario.email && usuario.tipo && usuario.nombre;
    }

    validarPermisos(usuario, operacion = 'pago') {
        const permisosMap = {
            'pago': ['cliente'],
            'consultar_historial': ['cliente', 'contador', 'administrador'],
            'consultar_estadisticas': ['contador', 'administrador']
        };

        return permisosMap[operacion]?.includes(usuario.tipo);
    }

    validarMonto(monto) {
        return monto > 0 && monto <= 10000 && !isNaN(monto);
    }

    validarMetodoPago(metodoPago) {
        const metodosValidos = ['tarjeta_credito', 'tarjeta_debito', 'paypal', 'transferencia'];
        return metodosValidos.includes(metodoPago);
    }

    registrarOperacion(usuario, operacion, resultado, error = null) {
        const log = {
            usuarioId: usuario?.id || 'unknown',
            operacion,
            resultado,
            error,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1' // Simulado
        };
        
        this.logAccesos.push(log);

        if (!resultado && usuario?.id) {
            const intentos = this.intentosFallidos.get(usuario.id) || 0;
            this.intentosFallidos.set(usuario.id, intentos + 1);
            
            if (intentos >= 2) {
                return { bloqueado: true, intentos: intentos + 1 };
            }
        } else if (resultado && usuario?.id) {
            this.intentosFallidos.delete(usuario.id);
        }
        
        return { bloqueado: false, intentos: this.intentosFallidos.get(usuario?.id) || 0 };
    }

    validarBloqueo(usuario) {
        const intentos = this.intentosFallidos.get(usuario.id) || 0;
        return intentos >= 3;
    }

    // POST: Procesar pago con validaciones de seguridad
    procesarPago(usuario, monto, metodoPago) {
        try {
            // Validar bloqueo previo
            if (this.validarBloqueo(usuario)) {
                const error = 'Usuario bloqueado por múltiples intentos fallidos';
                this.registrarOperacion(usuario, 'pago', false, error);
                throw new Error(error);
            }

            // Validar credenciales
            if (!this.validarCredenciales(usuario)) {
                const error = 'Credenciales inválidas';
                this.registrarOperacion(usuario, 'pago', false, error);
                throw new Error(error);
            }

            // Validar permisos
            if (!this.validarPermisos(usuario, 'pago')) {
                const error = 'No tiene permisos para realizar pagos';
                this.registrarOperacion(usuario, 'pago', false, error);
                throw new Error(error);
            }

            // Validar monto
            if (!this.validarMonto(monto)) {
                const error = 'Monto inválido (debe ser mayor a 0 y menor a 10,000)';
                this.registrarOperacion(usuario, 'pago', false, error);
                throw new Error(error);
            }

            // Validar método de pago
            if (!this.validarMetodoPago(metodoPago)) {
                const error = 'Método de pago no válido';
                this.registrarOperacion(usuario, 'pago', false, error);
                throw new Error(error);
            }

            // Procesar pago en sistema real
            const resultado = this.sistemaPagosReal.procesarPago(usuario, monto, metodoPago);
            this.registrarOperacion(usuario, 'pago', true);
            
            // Notificar al sistema observer si está disponible
            if (typeof NotificationCenter !== 'undefined') {
                NotificationCenter.notify('pago_procesado', resultado);
            }
            
            return {
                success: true,
                data: resultado,
                message: 'Pago procesado exitosamente'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'PAYMENT_FAILED'
            };
        }
    }

    // GET: Consultar historial de pagos con validaciones
    consultarHistorialPagos(usuario) {
        try {
            if (!this.validarCredenciales(usuario)) {
                const error = 'Credenciales inválidas';
                this.registrarOperacion(usuario, 'consultar_historial', false, error);
                throw new Error(error);
            }

            if (!this.validarPermisos(usuario, 'consultar_historial')) {
                const error = 'No tiene permisos para consultar historial';
                this.registrarOperacion(usuario, 'consultar_historial', false, error);
                throw new Error(error);
            }

            const historial = this.sistemaPagosReal.consultarHistorialPagos(usuario.id);
            this.registrarOperacion(usuario, 'consultar_historial', true);
            
            return {
                success: true,
                data: historial,
                message: 'Historial consultado exitosamente'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'HISTORY_ACCESS_DENIED'
            };
        }
    }

    // GET: Obtener estadísticas (solo para contadores y admins)
    consultarEstadisticas(usuario) {
        try {
            if (!this.validarCredenciales(usuario)) {
                throw new Error('Credenciales inválidas');
            }

            if (!this.validarPermisos(usuario, 'consultar_estadisticas')) {
                throw new Error('No tiene permisos para consultar estadísticas');
            }

            const estadisticas = this.sistemaPagosReal.getEstadisticasPagos();
            this.registrarOperacion(usuario, 'consultar_estadisticas', true);
            
            return {
                success: true,
                data: estadisticas.data,
                message: 'Estadísticas consultadas exitosamente'
            };

        } catch (error) {
            this.registrarOperacion(usuario, 'consultar_estadisticas', false, error.message);
            return {
                success: false,
                error: error.message,
                code: 'STATS_ACCESS_DENIED'
            };
        }
    }

    // GET: Obtener log de accesos (solo para admins)
    getLogAccesos(usuario) {
        try {
            if (!this.validarCredenciales(usuario) || usuario.tipo !== 'administrador') {
                throw new Error('Acceso denegado');
            }

            return {
                success: true,
                data: this.logAccesos.slice(-50), // Últimos 50 logs
                message: 'Log de accesos obtenido'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // POST: Desbloquear usuario (solo admins)
    desbloquearUsuario(adminUser, usuarioId) {
        try {
            if (!this.validarCredenciales(adminUser) || adminUser.tipo !== 'administrador') {
                throw new Error('Solo administradores pueden desbloquear usuarios');
            }

            this.intentosFallidos.delete(usuarioId);
            
            return {
                success: true,
                message: `Usuario ${usuarioId} desbloqueado exitosamente`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // GET: Verificar estado de usuario
    verificarEstadoUsuario(usuario) {
        const intentos = this.intentosFallidos.get(usuario.id) || 0;
        const bloqueado = intentos >= 3;
        
        return {
            success: true,
            data: {
                usuarioId: usuario.id,
                bloqueado: bloqueado,
                intentosFallidos: intentos,
                sesionActiva: this.sesionesActivas.has(usuario.id)
            }
        };
    }
}

// Sistema de cache para mejorar rendimiento
class CacheProxy {
    constructor(proxyPagos) {
        this.proxy = proxyPagos;
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutos
    }

    getCacheKey(metodo, parametros) {
        return `${metodo}_${JSON.stringify(parametros)}`;
    }

    isValidCache(timestamp) {
        return Date.now() - timestamp < this.ttl;
    }

    consultarHistorialPagos(usuario) {
        const cacheKey = this.getCacheKey('historial', { usuarioId: usuario.id });
        const cached = this.cache.get(cacheKey);

        if (cached && this.isValidCache(cached.timestamp)) {
            return {
                success: true,
                data: cached.data,
                message: 'Historial obtenido desde cache',
                fromCache: true
            };
        }

        const resultado = this.proxy.consultarHistorialPagos(usuario);
        
        if (resultado.success) {
            this.cache.set(cacheKey, {
                data: resultado.data,
                timestamp: Date.now()
            });
        }

        return resultado;
    }
}

// Exportar para uso en navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ProxyPagos,
        SistemaPagosReal,
        CacheProxy
    };
}