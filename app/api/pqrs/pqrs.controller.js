// PQRS cliente: validación, envío al API y listado "Mis PQRS"

async function initPQRS() {
    try {
        if (getToken()) await refreshSessionFromServer();
    } catch (_) {}

    try {
        const u = getStoredUsuario();
        const banner = document.getElementById('bannerSesionCliente');
        const uidInput = document.getElementById('pqrsUserId');
        if (u && u.id_usuario && (u.tipo || '').toLowerCase() === 'cliente' && uidInput) {
            uidInput.value = u.id_usuario;
            if (banner) banner.style.display = 'block';
            const reUid = document.getElementById('reabrirUserId');
            if (reUid && !String(reUid.value || '').trim()) reUid.value = u.id_usuario;
        }
    } catch (_) {}

    const pqrsForm = document.getElementById('pqrsForm');
    const pqrsClear = document.getElementById('pqrsClear');
    const pqrsResult = document.getElementById('pqrsResult');
    const btnCargarMisPqrs = document.getElementById('btnCargarMisPqrs');
    const misPqrsBody = document.getElementById('misPqrsBody');
    const misPqrsCard = document.getElementById('misPqrsCard');

    function validarCampos() {
        const nombre = document.getElementById('pqrsName').value.trim();
        const email = document.getElementById('pqrsEmail').value.trim();
        const tipo = document.getElementById('pqrsType').value;
        const mensaje = document.getElementById('pqrsMessage').value.trim();
        const uid = document.getElementById('pqrsUserId').value;
        const errores = [];
        if (!nombre) errores.push('El nombre es obligatorio.');
        if (!email) errores.push('El correo es obligatorio.');
        if (!tipo) errores.push('Debes seleccionar un tipo de PQRS.');
        if (!mensaje) errores.push('El mensaje es obligatorio.');
        if (!uid) errores.push('El ID de usuario es obligatorio.');
        return { ok: errores.length === 0, errores, nombre, email, tipo, mensaje, uid: parseInt(uid, 10) };
    }

    async function cargarMisPqrs(uidExplicito) {
        const uid =
            typeof uidExplicito === 'number' && !Number.isNaN(uidExplicito)
                ? uidExplicito
                : parseInt(document.getElementById('pqrsUserId').value, 10);
        if (!uid || Number.isNaN(uid)) {
            mostrarMensaje('Ingresa un ID de usuario para cargar tus PQRS.', 'error');
            return;
        }
        const res = await apiFetch(`/pqrs/listado/${uid}`, {
            __actionLabel: `PQRS: listado público para usuario ${uid}`,
        });
        if (!res || res.success === false) {
            if (res && res.code === 'USER_NOT_FOUND') {
                mostrarMensaje('El ID de usuario no existe.', 'error');
            } else if (res && res.code === 'NOT_FOUND') {
                pqrsResult.textContent =
                    (pqrsResult.textContent ? pqrsResult.textContent + ' ' : '') +
                    '(No se pudo actualizar el listado: reinicia el servidor backend o comprueba la URL de la API.)';
            } else {
                mostrarMensaje(res?.error || 'No se pudieron cargar las PQRS.', 'error');
            }
            return;
        }
        if (!misPqrsCard || !misPqrsBody) return;
        misPqrsCard.style.display = 'block';
        const rows = (res.data || []).map((p) => `
            <tr>
              <td style="border:var(--border); padding:.5rem .75rem;">${p.id_pqrs ?? '—'}</td>
              <td style="border:var(--border); padding:.5rem .75rem;">${p.tipo}</td>
              <td style="border:var(--border); padding:.5rem .75rem;">${p.estado}</td>
              <td style="border:var(--border); padding:.5rem .75rem;">${p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleString('es-CO') : '—'}</td>
            </tr>`).join('');
        misPqrsBody.innerHTML = rows
            ? `<table style="width:100%; border-collapse:collapse; font-size:1.25rem;">
                <thead><tr style="background:#f5f5f5;">
                  <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">ID</th>
                  <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">Tipo</th>
                  <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">Estado</th>
                  <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">Fecha</th>
                </tr></thead><tbody>${rows}</tbody></table>`
            : '<p class="muted">No tienes PQRS registradas con ese ID.</p>';
    }

    if (pqrsForm) {
        pqrsForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const v = validarCampos();
            if (!v.ok) {
                mostrarMensaje(v.errores.join(' '), 'error');
                return;
            }
            const descripcion = `Nombre: ${v.nombre}\nCorreo: ${v.email}\n\n${v.mensaje}`;
            try {
                const res = await apiFetch('/pqrs', {
                    method: 'POST',
                    body: JSON.stringify({
                        tipo: v.tipo,
                        descripcion,
                        solicitante_id: v.uid
                    }),
                    __actionLabel: 'PQRS: registrar solicitud',
                });
                if (res && res.success) {
                    mostrarMensaje('PQRS registrada correctamente.', 'success');
                    pqrsResult.textContent = `Radicado: ${res.data.id_pqrs || ''} • Estado inicial: ${res.data.estado || ''}`;
                    pqrsForm.reset();
                    document.getElementById('pqrsUserId').value = v.uid;
                    await cargarMisPqrs(v.uid);
                } else if (res && res.code === 'USER_NOT_FOUND') {
                    mostrarMensaje('El ID de usuario no existe. Corrige el ID e intenta de nuevo.', 'error');
                } else {
                    mostrarMensaje(res?.error || 'No se pudo registrar la PQRS.', 'error');
                }
            } catch (err) {
                mostrarMensaje('Error de red al registrar la PQRS.', 'error');
            }
        });
    }

    if (pqrsClear) {
        pqrsClear.addEventListener('click', function () {
            pqrsForm.reset();
            pqrsResult.textContent = '';
        });
    }

    if (btnCargarMisPqrs) {
        btnCargarMisPqrs.addEventListener('click', cargarMisPqrs);
    }
}

document.addEventListener('DOMContentLoaded', initPQRS);
