// Controlador del sistema (orquesta modelos y arranque global)

class AlfaredSystem {
    constructor() {
        this.usuarios = new Map();
        this.proxyPagos = new ProxyPagos();
        if (typeof NotificationsController !== 'undefined') {
            NotificationsController.initialize();
        }
    }

    registrarUsuario(tipoUsuario, userData) {
        const usuario = UserFactory.createUser(tipoUsuario, userData);
        this.usuarios.set(usuario.id, usuario);
        return usuario;
    }

    autenticarUsuario(email) {
        for (let usuario of this.usuarios.values()) {
            if (usuario.email === email) {
                return usuario;
            }
        }
        throw new Error('Credenciales inválidas');
    }

    procesarPago(usuarioId, monto, metodoPago) {
        const usuario = this.usuarios.get(usuarioId);
        if (!usuario) throw new Error('Usuario no encontrado');
        const resultado = this.proxyPagos.procesarPago(usuario, monto, metodoPago);
        if (typeof NotificationCenter !== 'undefined') {
            NotificationCenter.notify('pago_procesado', resultado);
        }
        return resultado;
    }

    consultarHistorialPagos(usuarioId) {
        const usuario = this.usuarios.get(usuarioId);
        if (!usuario) throw new Error('Usuario no encontrado');
        return this.proxyPagos.consultarHistorialPagos(usuario);
    }
}

// Boot global
let alfaredSystem = null;
document.addEventListener('DOMContentLoaded', function() {
    if (!alfaredSystem) {
        alfaredSystem = new AlfaredSystem();
        console.log('Sistema AlfaRed inicializado');
    }
});
