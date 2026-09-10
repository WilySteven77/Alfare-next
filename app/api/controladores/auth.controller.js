// Controlador de autenticación y UI de opciones por rol

function configurarEventosLogin() {
    const loginForm = document.querySelector('.login-form');
    if (!loginForm) return;
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const emailEl = loginForm.querySelector('input[type="email"]');
        const passEl = loginForm.querySelector('input[type="password"]');
        if (!emailEl || !passEl) return;
        const email = emailEl.value;
        const password = passEl.value;
        try {
            const usuario = alfaredSystem.autenticarUsuario(email, password);
            mostrarMensaje(`Bienvenido ${usuario.nombre}`, 'success');
            sessionStorage.setItem('currentUser', JSON.stringify(usuario));
            loginForm.classList.remove('active');
            mostrarOpcionesUsuario(usuario);
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    });
}

function mostrarOpcionesUsuario(usuario) {
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
    mostrarPanelOpciones(usuario.nombre, opciones);
}

function mostrarPanelOpciones(nombreUsuario, opciones) {
    const panel = document.createElement('div');
    panel.className = 'user-options-panel';
    panel.innerHTML = `
        <div class="panel-content">
            <h3>Bienvenido ${nombreUsuario}</h3>
            <div class="options">${opciones}</div>
            <button onclick="cerrarPanelOpciones()">Cerrar</button>
        </div>
    `;
    document.body.appendChild(panel);
}

function cerrarPanelOpciones() {
    const panel = document.querySelector('.user-options-panel');
    if (panel) panel.remove();
}

document.addEventListener('DOMContentLoaded', configurarEventosLogin);


