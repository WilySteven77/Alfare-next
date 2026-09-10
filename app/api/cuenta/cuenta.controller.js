document.addEventListener('DOMContentLoaded', () => {
    const panelSesion = document.getElementById('panelSesion');
    const sesionDetalle = document.getElementById('sesionDetalle');
    const panelLogin = document.getElementById('panelLogin');
    const panelRegistro = document.getElementById('panelRegistro');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    const linkGestion = document.getElementById('linkGestion');
    const formLogin = document.getElementById('formLogin');
    const formRegistro = document.getElementById('formRegistro');

    function staffPuedeGestion(tipo) {
        return ['administrador', 'contador', 'tecnico'].includes((tipo || '').toLowerCase());
    }

    function refrescarVistaSesion() {
        const u = getStoredUsuario();
        const token = getToken();
        if (!token || !u) {
            panelSesion.style.display = 'none';
            panelLogin.style.display = 'block';
            panelRegistro.style.display = 'block';
            linkGestion.style.display = 'none';
            return;
        }
        panelSesion.style.display = 'block';
        const nombreLinea =
            u.nombre || u.apellido
                ? `<strong>Nombre:</strong> ${[u.nombre, u.apellido].filter(Boolean).join(' ')}<br/>`
                : '';
        sesionDetalle.innerHTML = `
          ${nombreLinea}
          <strong>Correo:</strong> ${u.email}<br/>
          <strong>ID usuario:</strong> ${u.id_usuario}<br/>
          <strong>Rol:</strong> ${u.tipo}`;
        panelLogin.style.display = 'none';
        panelRegistro.style.display = 'none';
        linkGestion.style.display = staffPuedeGestion(u.tipo) ? 'inline-block' : 'none';
    }

    refrescarVistaSesion();

    (async () => {
        if (!getToken()) return;
        const res = await refreshSessionFromServer();
        if (res && res.success) {
            refrescarVistaSesion();
        } else if (res && !res.skipped && res.code === 'INVALID_TOKEN') {
            refrescarVistaSesion();
            mostrarMensaje('Tu sesión expiró o ya no es válida.', 'error');
        }
    })();

    btnCerrarSesion &&
        btnCerrarSesion.addEventListener('click', () => {
            logout();
            refrescarVistaSesion();
            mostrarMensaje('Sesión cerrada.', 'success');
        });

    formLogin &&
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const contrasena = document.getElementById('loginPass').value;
            const res = await login(email, contrasena);
            if (res && res.success) {
                mostrarMensaje('Bienvenido.', 'success');
                refrescarVistaSesion();
            } else {
                mostrarMensaje(res?.error || 'No se pudo iniciar sesión.', 'error');
            }
        });

    formRegistro &&
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('regNombre').value.trim();
            const apellido = document.getElementById('regApellido').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const contrasena = document.getElementById('regPass').value;
            const res = await register({ nombre, apellido, email, contrasena });
            if (res && res.success) {
                mostrarMensaje('Cuenta creada. Ya puedes iniciar sesión.', 'success');
                document.getElementById('loginEmail').value = email;
                formRegistro.reset();
            } else if (res && res.code === 'EMAIL_EXISTS') {
                mostrarMensaje('Ese correo ya está registrado.', 'error');
            } else {
                mostrarMensaje(res?.error || 'No se pudo registrar.', 'error');
            }
        });
});
