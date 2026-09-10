document.addEventListener('DOMContentLoaded', () => {
    const loginCard = document.getElementById('loginCard');
    const gestionPanel = document.getElementById('gestionPanel');
    const staffLoginForm = document.getElementById('staffLoginForm');
    const tablaPqrsStaff = document.getElementById('tablaPqrsStaff');
    const btnLogoutStaff = document.getElementById('btnLogoutStaff');
    const loginMsg = document.getElementById('loginMsg');

    async function cargarTabla() {
        const res = await apiFetch('/pqrs/todas', {
            __actionLabel: 'Gestión PQRS: listar todas',
        });
        if (!res || !res.success) {
            tablaPqrsStaff.innerHTML = `<p style="color:#c0392b;">${res?.error || 'No autorizado o error al cargar.'}</p>`;
            return;
        }
        const rows = (res.data || []).map((p) => {
            const id = p.id_pqrs;
            const est = (p.estado || '').toString().toUpperCase();
            const puedeTomar = ['NUEVO', 'PENDIENTE'].includes(est);
            const puedeCerrar = est === 'EN_PROCESO';
            return `<tr>
              <td style="border:var(--border); padding:.45rem .6rem;">${id}</td>
              <td style="border:var(--border); padding:.45rem .6rem;">${p.solicitante_id}</td>
              <td style="border:var(--border); padding:.45rem .6rem;">${p.tipo}</td>
              <td style="border:var(--border); padding:.45rem .6rem;">${est}</td>
              <td style="border:var(--border); padding:.45rem .6rem; max-width:220px; overflow:hidden; text-overflow:ellipsis;">${(p.descripcion || '').slice(0, 80)}…</td>
              <td style="border:var(--border); padding:.45rem .6rem; white-space:nowrap;">
                ${puedeTomar ? `<button type="button" class="btn btn-tomar" data-id="${id}" style="font-size:1.1rem;">Tomar</button>` : ''}
                ${puedeCerrar ? `<button type="button" class="btn btn-cerrar" data-id="${id}" style="font-size:1.1rem;">Cerrar</button>` : ''}
              </td>
            </tr>`;
        }).join('');

        tablaPqrsStaff.innerHTML = `
          <table style="width:100%; border-collapse:collapse; font-size:1.15rem;">
            <thead><tr style="background:#f5f5f5;">
              <th style="border:var(--border); padding:.45rem .6rem; text-align:left;">ID</th>
              <th style="border:var(--border); padding:.45rem .6rem; text-align:left;">Usuario</th>
              <th style="border:var(--border); padding:.45rem .6rem; text-align:left;">Tipo</th>
              <th style="border:var(--border); padding:.45rem .6rem; text-align:left;">Estado</th>
              <th style="border:var(--border); padding:.45rem .6rem; text-align:left;">Descripción</th>
              <th style="border:var(--border); padding:.45rem .6rem; text-align:left;">Acciones</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="muted">Sin PQRS.</td></tr>'}</tbody>
          </table>`;

        tablaPqrsStaff.querySelectorAll('.btn-tomar').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                const r = await apiFetch(`/pqrs/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ accion: 'tomar' }),
                    __actionLabel: `Gestión PQRS: tomar caso #${id}`,
                });
                if (r && r.success) {
                    mostrarMensaje('PQRS tomada en atención.', 'success');
                    cargarTabla();
                } else {
                    mostrarMensaje(r?.error || 'No se pudo tomar la PQRS.', 'error');
                }
            });
        });

        tablaPqrsStaff.querySelectorAll('.btn-cerrar').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                const respuesta_final = window.prompt('Respuesta final para el cliente (obligatoria para cerrar):');
                if (!respuesta_final || !respuesta_final.trim()) {
                    mostrarMensaje('Debes escribir una respuesta final.', 'error');
                    return;
                }
                const r = await apiFetch(`/pqrs/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ accion: 'cerrar', respuesta_final }),
                    __actionLabel: `Gestión PQRS: cerrar caso #${id}`,
                });
                if (r && r.success) {
                    mostrarMensaje('PQRS cerrada.', 'success');
                    cargarTabla();
                } else {
                    mostrarMensaje(r?.error || 'No se pudo cerrar.', 'error');
                }
            });
        });
    }

    function mostrarPanelStaff() {
        loginCard.style.display = 'none';
        gestionPanel.style.display = 'block';
        cargarTabla();
    }

    (async function intentarSesionStaff() {
        if (!localStorage.getItem('alfared_token')) return;
        await refreshSessionFromServer();
        const res = await apiFetch('/pqrs/todas', {
            __actionLabel: 'Gestión PQRS: verificar sesión staff',
        });
        if (res && res.success) {
            loginCard.style.display = 'none';
            gestionPanel.style.display = 'block';
            await cargarTabla();
        }
    })();

    staffLoginForm && staffLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('staffEmail').value.trim();
        const contrasena = document.getElementById('staffPass').value;
        loginMsg.textContent = '';
        const res = await login(email, contrasena);
        if (res && res.success) {
            mostrarPanelStaff();
        } else {
            loginMsg.textContent = res?.error || 'Credenciales incorrectas.';
        }
    });

    btnLogoutStaff && btnLogoutStaff.addEventListener('click', () => {
        logout();
        gestionPanel.style.display = 'none';
        loginCard.style.display = 'block';
    });
});
