// ===== PATRÓN FACTORY METHOD - Para creación de usuarios =====

class UserFactory {
    static createUser(userType, userData) {
        switch (userType.toLowerCase()) {
            case 'cliente':
                return new Cliente(userData);
            case 'tecnico':
                return new Tecnico(userData);
            case 'contador':
                return new Contador(userData);
            case 'administrador':
                return new Administrador(userData);
            default:
                throw new Error(`Tipo de usuario no válido: ${userType}`);
        }
    }

    // GET: Obtener tipos de usuarios disponibles
    static getAvailableUserTypes() {
        return {
            success: true,
            data: ['cliente', 'tecnico', 'contador', 'administrador'],
            message: 'Tipos de usuarios disponibles'
        };
    }

    // POST: Crear usuario con validación
    static createUserEndpoint(requestData) {
        try {
            const { userType, userData } = requestData;
            
            // Validaciones
            if (!userType) {
                throw new Error('Tipo de usuario requerido');
            }
            if (!userData || !userData.nombre || !userData.email) {
                throw new Error('Datos de usuario incompletos (nombre y email requeridos)');
            }

            const user = this.createUser(userType, userData);
            
            return {
                success: true,
                data: {
                    id: user.id,
                    nombre: user.nombre,
                    email: user.email,
                    tipo: user.tipo,
                    createdAt: new Date().toISOString()
                },
                message: `Usuario ${userType} creado exitosamente`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'USER_CREATION_FAILED'
            };
        }
    }
}

// Clases base y específicas de usuarios
class Usuario {
    constructor(userData) {
        this.id = userData.id || Date.now();
        this.nombre = userData.nombre;
        this.email = userData.email;
        this.tipo = userData.tipo;
        this.createdAt = new Date();
    }

    login() {
        return `${this.nombre} ha iniciado sesión como ${this.tipo}`;
    }

    logout() {
        return `${this.nombre} ha cerrado sesión`;
    }

    // GET: Obtener información del usuario
    getUserInfo() {
        return {
            success: true,
            data: {
                id: this.id,
                nombre: this.nombre,
                email: this.email,
                tipo: this.tipo,
                createdAt: this.createdAt
            }
        };
    }
}

class Cliente extends Usuario {
    constructor(userData) {
        super(userData);
        this.plan = userData.plan || 'básico';
        this.facturas = [];
    }

    consultarFacturas() {
        return {
            success: true,
            data: this.facturas,
            message: `Cliente ${this.nombre} consultando facturas`
        };
    }

    consultarPlanes() {
        return {
            success: true,
            data: ['básico', 'premium', 'ultimate']
        };
    }

    // POST: Realizar pago
    realizarPago(monto) {
        try {
            if (monto <= 0) {
                throw new Error('Monto debe ser mayor a 0');
            }
            
            return {
                success: true,
                data: {
                    transactionId: Date.now(),
                    monto: monto,
                    fecha: new Date().toISOString(),
                    estado: 'completado'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

class Tecnico extends Usuario {
    constructor(userData) {
        super(userData);
        this.especialidad = userData.especialidad || 'general';
        this.ordenes = [];
    }

    // POST: Registrar mantenimiento
    registrarMantenimiento(orden) {
        try {
            const nuevaOrden = {
                id: Date.now(),
                ...orden,
                tecnicoId: this.id,
                fechaRegistro: new Date().toISOString(),
                estado: 'registrada'
            };
            
            this.ordenes.push(nuevaOrden);
            
            return {
                success: true,
                data: nuevaOrden,
                message: 'Mantenimiento registrado exitosamente'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // PUT: Actualizar estado de orden
    actualizarEstadoOrden(ordenId, nuevoEstado) {
        try {
            const orden = this.ordenes.find(o => o.id == ordenId);
            if (!orden) {
                throw new Error('Orden no encontrada');
            }
            
            orden.estado = nuevoEstado;
            orden.fechaActualizacion = new Date().toISOString();
            
            // Notificar al sistema observer si está disponible
            if (typeof NotificationCenter !== 'undefined') {
                NotificationCenter.notify('orden_actualizada', {
                    ordenId,
                    nuevoEstado,
                    tecnico: this.nombre
                });
            }
            
            return {
                success: true,
                data: orden,
                message: 'Estado de orden actualizado'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // GET: Obtener órdenes del técnico
    getOrdenes() {
        return {
            success: true,
            data: this.ordenes
        };
    }
}

class Contador extends Usuario {
    constructor(userData) {
        super(userData);
        this.departamento = 'contabilidad';
        this.facturas = [];
    }

    // POST: Generar factura
    generarFactura(clienteId, servicios, monto) {
        try {
            if (!clienteId || !servicios || monto <= 0) {
                throw new Error('Datos de factura incompletos');
            }
            
            const factura = {
                id: Date.now(),
                clienteId,
                servicios,
                monto,
                fecha: new Date().toISOString(),
                estado: 'pendiente',
                contadorId: this.id
            };
            
            this.facturas.push(factura);
            
            // Notificar al sistema observer si está disponible
            if (typeof NotificationCenter !== 'undefined') {
                NotificationCenter.notify('nueva_factura', factura);
            }
            
            return {
                success: true,
                data: factura,
                message: 'Factura generada exitosamente'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // GET: Obtener facturas del contador
    getFacturas() {
        return {
            success: true,
            data: this.facturas
        };
    }
}

class Administrador extends Usuario {
    constructor(userData) {
        super(userData);
        this.permisos = ['all'];
    }

    supervisarSistema() {
        return {
            success: true,
            data: {
                sistema: 'operativo',
                usuarios_activos: Math.floor(Math.random() * 100) + 50,
                timestamp: new Date().toISOString()
            },
            message: `Administrador ${this.nombre} supervisando el sistema`
        };
    }

    gestionarUsuarios() {
        return {
            success: true,
            message: `Administrador ${this.nombre} gestionando usuarios`
        };
    }
}

// Exportar para uso en navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UserFactory,
        Usuario,
        Cliente,
        Tecnico,
        Contador,
        Administrador
    };
}