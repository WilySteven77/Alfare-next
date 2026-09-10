// DEPRECADO: Este archivo fue dividido en controladores modulares.
// Conservar vacío para compatibilidad si alguna vista antigua lo importa.
// Nuevos archivos:
// - controllers/system.controller.js
// - controllers/notifications.controller.js
// - controllers/auth.controller.js
// - controllers/pricing.controller.js
// - controllers/ui/messages.controller.js


// 1. PATRÓN FACTORY METHOD - Para creación de usuarios
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
}

// Clases base y específicas de usuarios
class Usuario {
    constructor(userData) {
        this.id = userData.id;
        this.nombre = userData.nombre;
        this.email = userData.email;
        this.tipo = userData.tipo;
    }

    login() {
        console.log(`${this.nombre} ha iniciado sesión como ${this.tipo}`);
    }

    logout() {
        console.log(`${this.nombre} ha cerrado sesión`);
    }
}

class Cliente extends Usuario {
    constructor(userData) {
        super(userData);
        this.plan = userData.plan || 'básico';
        this.facturas = [];
    }

    consultarFacturas() {
        console.log(`Cliente ${this.nombre} consultando facturas`);
        return this.facturas;
    }

    consultarPlanes() {
        console.log(`Cliente ${this.nombre} consultando planes disponibles`);
        return ['básico', 'premium', 'ultimate'];
    }

    realizarPago(monto) {
        console.log(`Cliente ${this.nombre} realizando pago de $${monto}`);
        return { success: true, transactionId: Date.now() };
    }
}

class Tecnico extends Usuario {
    constructor(userData) {
        super(userData);
        this.especialidad = userData.especialidad || 'general';
        this.ordenes = [];
    }

    registrarMantenimiento(orden) {
        console.log(`Técnico ${this.nombre} registrando mantenimiento`);
        this.ordenes.push(orden);
        return orden;
    }

    actualizarEstadoOrden(ordenId, nuevoEstado) {
        console.log(`Técnico ${this.nombre} actualizando orden ${ordenId} a ${nuevoEstado}`);
        const orden = this.ordenes.find(o => o.id === ordenId);
        if (orden) {
            orden.estado = nuevoEstado;
            // Notificar a observadores
            NotificationCenter.notify('orden_actualizada', { ordenId, nuevoEstado, tecnico: this.nombre });
        }
        return orden;
    }
}

class Contador extends Usuario {
    constructor(userData) {
        super(userData);
        this.departamento = 'contabilidad';
    }

    generarFactura(clienteId, servicios, monto) {
        console.log(`Contador ${this.nombre} generando factura para cliente ${clienteId}`);
        const factura = {
            id: Date.now(),
            clienteId,
            servicios,
            monto,
            fecha: new Date(),
            estado: 'pendiente'
        };
        
        // Notificar a observadores sobre nueva factura
        NotificationCenter.notify('nueva_factura', factura);
        return factura;
    }

    gestionarPagos() {
        console.log(`Contador ${this.nombre} gestionando pagos`);
    }
}

class Administrador extends Usuario {
    constructor(userData) {
        super(userData);
        this.permisos = ['all'];
    }

    supervisarSistema() {
        console.log(`Administrador ${this.nombre} supervisando el sistema`);
    }

    gestionarUsuarios() {
        console.log(`Administrador ${this.nombre} gestionando usuarios`);
    }

    verReportes() {
        console.log(`Administrador ${this.nombre} visualizando reportes`);
    }
}

// 2. PATRÓN PROXY - Para sistema de pagos seguro
class SistemaPagosReal {
    procesarPago(usuario, monto, metodoPago) {
        console.log(`Procesando pago real de $${monto} para ${usuario.nombre}`);
        // Simulación de procesamiento de pago
        return {
            success: true,
            transactionId: `TXN_${Date.now()}`,
            monto,
            fecha: new Date(),
            metodoPago
        };
    }

    consultarHistorialPagos(usuarioId) {
        console.log(`Consultando historial de pagos para usuario ${usuarioId}`);
        return [
            { id: 1, monto: 250, fecha: '2024-01-15', estado: 'completado' },
            { id: 2, monto: 250, fecha: '2024-02-15', estado: 'completado' }
        ];
    }
}

class ProxyPagos {
    constructor() {
        this.sistemaPagosReal = new SistemaPagosReal();
        this.intentosFallidos = new Map();
    }

    validarCredenciales(usuario) {
        // Validación básica de credenciales
        return usuario && usuario.id && usuario.email && usuario.tipo;
    }

    validarPermisos(usuario) {
        // Solo clientes pueden realizar pagos
        return usuario.tipo === 'cliente';
    }

    registrarOperacion(usuario, operacion, resultado) {
        console.log(`[PROXY LOG] Usuario: ${usuario.nombre}, Operación: ${operacion}, Resultado: ${resultado ? 'ÉXITO' : 'FALLO'}`);
        
        if (!resultado) {
            const intentos = this.intentosFallidos.get(usuario.id) || 0;
            this.intentosFallidos.set(usuario.id, intentos + 1);
            
            if (intentos >= 3) {
                console.log(`[PROXY SECURITY] Usuario ${usuario.nombre} bloqueado por múltiples intentos fallidos`);
                return false;
            }
        } else {
            this.intentosFallidos.delete(usuario.id);
        }
        return true;
    }

    procesarPago(usuario, monto, metodoPago) {
        console.log(`[PROXY] Interceptando solicitud de pago de ${usuario.nombre}`);

        // Validaciones de seguridad
        if (!this.validarCredenciales(usuario)) {
            console.log('[PROXY] Acceso denegado: Credenciales inválidas');
            this.registrarOperacion(usuario, 'pago', false);
            throw new Error('Credenciales inválidas');
        }

        if (!this.validarPermisos(usuario)) {
            console.log('[PROXY] Acceso denegado: Permisos insuficientes');
            this.registrarOperacion(usuario, 'pago', false);
            throw new Error('No tiene permisos para realizar pagos');
        }

        if (monto <= 0 || monto > 10000) {
            console.log('[PROXY] Acceso denegado: Monto inválido');
            this.registrarOperacion(usuario, 'pago', false);
            throw new Error('Monto inválido');
        }

        // Si todas las validaciones pasan, proceder con el pago real
        try {
            const resultado = this.sistemaPagosReal.procesarPago(usuario, monto, metodoPago);
            this.registrarOperacion(usuario, 'pago', true);
            console.log('[PROXY] Pago procesado exitosamente');
            return resultado;
        } catch (error) {
            this.registrarOperacion(usuario, 'pago', false);
            throw error;
        }
    }

    consultarHistorialPagos(usuario) {
        console.log(`[PROXY] Interceptando consulta de historial de ${usuario.nombre}`);

        if (!this.validarCredenciales(usuario)) {
            console.log('[PROXY] Acceso denegado: Credenciales inválidas');
            throw new Error('Credenciales inválidas');
        }

        if (!this.validarPermisos(usuario) && usuario.tipo !== 'contador' && usuario.tipo !== 'administrador') {
            console.log('[PROXY] Acceso denegado: Permisos insuficientes');
            throw new Error('No tiene permisos para consultar historial');
        }

        return this.sistemaPagosReal.consultarHistorialPagos(usuario.id);
    }
}

// 3. PATRÓN OBSERVER - Para notificaciones automáticas
class NotificationCenter {
    static observers = new Map();

    static subscribe(event, observer) {
        if (!this.observers.has(event)) {
            this.observers.set(event, []);
        }
        this.observers.get(event).push(observer);
        console.log(`Observer suscrito al evento: ${event}`);
    }

    static unsubscribe(event, observer) {
        if (this.observers.has(event)) {
            const observers = this.observers.get(event);
            const index = observers.indexOf(observer);
            if (index > -1) {
                observers.splice(index, 1);
                console.log(`Observer desuscrito del evento: ${event}`);
            }
        }
    }

    static notify(event, data) {
        console.log(`[NOTIFICATION CENTER] Notificando evento: ${event}`);
        if (this.observers.has(event)) {
            this.observers.get(event).forEach(observer => {
                observer.update(event, data);
            });
        }
    }
}

// Observadores específicos
class EmailNotificationObserver {
    constructor(name) {
        this.name = name;
    }

    update(event, data) {
        switch (event) {
            case 'nueva_factura':
                this.enviarEmailFactura(data);
                break;
            case 'orden_actualizada':
                this.enviarEmailOrden(data);
                break;
            case 'pago_procesado':
                this.enviarEmailPago(data);
                break;
        }
    }

    enviarEmailFactura(factura) {
        console.log(`[EMAIL] Enviando notificación de nueva factura #${factura.id} por $${factura.monto} al cliente ${factura.clienteId}`);
    }

    enviarEmailOrden(orden) {
        console.log(`[EMAIL] Enviando notificación de orden #${orden.ordenId} actualizada a estado: ${orden.nuevoEstado} por técnico ${orden.tecnico}`);
    }

    enviarEmailPago(pago) {
        console.log(`[EMAIL] Enviando confirmación de pago #${pago.transactionId} por $${pago.monto}`);
    }
}

class WebNotificationObserver {
    constructor(name) {
        this.name = name;
    }

    update(event, data) {
        switch (event) {
            case 'nueva_factura':
                this.mostrarNotificacionWeb(`Nueva factura generada: $${data.monto}`);
                break;
            case 'orden_actualizada':
                this.mostrarNotificacionWeb(`Orden #${data.ordenId} actualizada: ${data.nuevoEstado}`);
                break;
            case 'pago_procesado':
                this.mostrarNotificacionWeb(`Pago procesado exitosamente: $${data.monto}`);
                break;
        }
    }

    mostrarNotificacionWeb(mensaje) {
        console.log(`[WEB NOTIFICATION] ${mensaje}`);
        // En una implementación real, esto mostraría una notificación en el navegador
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('AlfaRed', { body: mensaje });
        }
    }
}

// ===== SISTEMA DE GESTIÓN ALFARED =====
class AlfaredSystem {
    constructor() {
        this.usuarios = new Map();
        this.proxyPagos = new ProxyPagos();
        this.inicializarObservadores();
    }

    inicializarObservadores() {
        // Crear observadores
        const emailObserver = new EmailNotificationObserver('EmailService');
        const webObserver = new WebNotificationObserver('WebNotifications');

        // Suscribir observadores a eventos
        NotificationCenter.subscribe('nueva_factura', emailObserver);
        NotificationCenter.subscribe('nueva_factura', webObserver);
        NotificationCenter.subscribe('orden_actualizada', emailObserver);
        NotificationCenter.subscribe('orden_actualizada', webObserver);
        NotificationCenter.subscribe('pago_procesado', emailObserver);
        NotificationCenter.subscribe('pago_procesado', webObserver);
    }

    registrarUsuario(tipoUsuario, userData) {
        try {
            const usuario = UserFactory.createUser(tipoUsuario, userData);
            this.usuarios.set(usuario.id, usuario);
            console.log(`Usuario ${usuario.nombre} registrado exitosamente como ${tipoUsuario}`);
            return usuario;
        } catch (error) {
            console.error('Error al registrar usuario:', error.message);
            throw error;
        }
    }

    autenticarUsuario(email, password) {
        // Simulación de autenticación
        for (let usuario of this.usuarios.values()) {
            if (usuario.email === email) {
                console.log(`Usuario ${usuario.nombre} autenticado exitosamente`);
                return usuario;
            }
        }
        throw new Error('Credenciales inválidas');
    }

    procesarPago(usuarioId, monto, metodoPago) {
        const usuario = this.usuarios.get(usuarioId);
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        try {
            const resultado = this.proxyPagos.procesarPago(usuario, monto, metodoPago);
            NotificationCenter.notify('pago_procesado', resultado);
            return resultado;
        } catch (error) {
            console.error('Error al procesar pago:', error.message);
            throw error;
        }
    }

    consultarHistorialPagos(usuarioId) {
        const usuario = this.usuarios.get(usuarioId);
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        return this.proxyPagos.consultarHistorialPagos(usuario);
    }
}

// ===== INTEGRACIÓN CON LA PÁGINA WEB =====
// Variable global para el sistema
let alfaredSystem = null;

// Inicializar sistema cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    alfaredSystem = new AlfaredSystem();
    console.log('Sistema AlfaRed inicializado');
    
    // Configurar eventos de la página
    configurarEventosLogin();
    configurarEventosPagos();
});

function configurarEventosLogin() {
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            
            try {
                const usuario = alfaredSystem.autenticarUsuario(email, password);
                mostrarMensaje(`Bienvenido ${usuario.nombre}`, 'success');
                
                // Guardar usuario en sessionStorage
                sessionStorage.setItem('currentUser', JSON.stringify(usuario));
                
                // Ocultar formulario de login
                loginForm.classList.remove('active');
                
                // Mostrar opciones según el tipo de usuario
                mostrarOpcionesUsuario(usuario);
                
            } catch (error) {
                mostrarMensaje(error.message, 'error');
            }
        });
    }
}

function configurarEventosPagos() {
    // Agregar botones de pago a los planes
    const planesContainer = document.querySelector('#pricing .box-container');
    if (planesContainer) {
        const planes = planesContainer.querySelectorAll('.box');
        planes.forEach((plan, index) => {
            const botonPlan = plan.querySelector('.btn');
            if (botonPlan) {
                botonPlan.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
                    if (!currentUser.id) {
                        mostrarMensaje('Debe iniciar sesión para seleccionar un plan', 'error');
                        return;
                    }
                    
                    const precios = [250, 650, 1250];
                    const monto = precios[index];
                    
                    procesarPagoSeguro(currentUser.id, monto, 'tarjeta_credito');
                });
            }
        });
    }
}

function procesarPagoSeguro(usuarioId, monto, metodoPago) {
    try {
        const resultado = alfaredSystem.procesarPago(usuarioId, monto, metodoPago);
        mostrarMensaje(`Pago procesado exitosamente. ID: ${resultado.transactionId}`, 'success');
    } catch (error) {
        mostrarMensaje(`Error en el pago: ${error.message}`, 'error');
    }
}

function mostrarOpcionesUsuario(usuario) {
    // Crear panel de opciones según el tipo de usuario
    let opciones = '';
    
    switch (usuario.tipo) {
        case 'cliente':
            opciones = `
                <button onclick="consultarFacturas(${usuario.id})">Ver Facturas</button>
                <button onclick="consultarPlanes()">Ver Planes</button>
                <button onclick="consultarHistorialPagos(${usuario.id})">Historial de Pagos</button>
            `;
            break;
        case 'tecnico':
            opciones = `
                <button onclick="verOrdenesTrabajo(${usuario.id})">Ver Órdenes de Trabajo</button>
                <button onclick="registrarMantenimiento(${usuario.id})">Registrar Mantenimiento</button>
            `;
            break;
        case 'contador':
            opciones = `
                <button onclick="generarFactura()">Generar Factura</button>
                <button onclick="gestionarPagos()">Gestionar Pagos</button>
            `;
            break;
        case 'administrador':
            opciones = `
                <button onclick="supervisarSistema()">Supervisar Sistema</button>
                <button onclick="gestionarUsuarios()">Gestionar Usuarios</button>
                <button onclick="verReportes()">Ver Reportes</button>
            `;
            break;
    }
    
    // Mostrar opciones en un modal o panel
    mostrarPanelOpciones(usuario.nombre, opciones);
}

function mostrarPanelOpciones(nombreUsuario, opciones) {
    const panel = document.createElement('div');
    panel.className = 'user-options-panel';
    panel.innerHTML = `
        <div class="panel-content">
            <h3>Bienvenido ${nombreUsuario}</h3>
            <div class="options">
                ${opciones}
            </div>
            <button onclick="cerrarPanelOpciones()">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(panel);
}

function cerrarPanelOpciones() {
    const panel = document.querySelector('.user-options-panel');
    if (panel) {
        panel.remove();
    }
}

function mostrarMensaje(mensaje, tipo) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${tipo}`;
    messageDiv.textContent = mensaje;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        background-color: ${tipo === 'success' ? '#4CAF50' : '#f44336'};
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Funciones auxiliares para las opciones de usuario
function consultarFacturas(usuarioId) {
    const usuario = alfaredSystem.usuarios.get(usuarioId);
    if (usuario && usuario.consultarFacturas) {
        const facturas = usuario.consultarFacturas();
        console.log('Facturas consultadas:', facturas);
        mostrarMensaje('Facturas consultadas exitosamente', 'success');
    }
}

function consultarPlanes() {
    mostrarMensaje('Consulte la sección de Planes en la página', 'success');
    document.querySelector('#pricing').scrollIntoView({ behavior: 'smooth' });
}

function consultarHistorialPagos(usuarioId) {
    try {
        const historial = alfaredSystem.consultarHistorialPagos(usuarioId);
        console.log('Historial de pagos:', historial);
        mostrarMensaje('Historial consultado exitosamente', 'success');
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UserFactory,
        ProxyPagos,
        NotificationCenter,
        AlfaredSystem
    };
}

