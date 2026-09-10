// Contratación de planes (inicio): sesión cliente → formulario → factura → Mercado Pago

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('overlaySolicitudPlan');
    const form = document.getElementById('formSolicitudPlan');
    const btnCerrar = document.getElementById('planModalCerrar');

    let selectedPlanKey = null;
    let selectedPlanTitle = '';
    let selectedPlanPrice = 0;

    function cuentaHref() {
        return `${window.location.origin}/views/cuenta.html`;
    }

    function prefillUsuario() {
        const u = typeof getStoredUsuario === 'function' ? getStoredUsuario() : null;
        const nom = document.getElementById('planFormNombre');
        const ape = document.getElementById('planFormApellido');
        const em = document.getElementById('planFormEmail');
        if (u) {
            if (nom && u.nombre) nom.value = u.nombre;
            if (ape && u.apellido) ape.value = u.apellido;
            if (em && u.email) em.value = u.email;
        }
    }

    async function abrirModal(planKey, title, priceNum) {
        if (planKey === 'diferente') {
            if (typeof mostrarMensaje === 'function') {
                mostrarMensaje('Este plan es personalizado. Escríbenos en la sección Contacto para cotizar.', 'success');
            }
            document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        if (typeof getToken !== 'function' || !getToken()) {
            if (typeof mostrarMensaje === 'function') {
                mostrarMensaje('Inicia sesión con una cuenta cliente para contratar un plan.', 'error');
            }
            setTimeout(() => {
                window.location.href = cuentaHref();
            }, 900);
            return;
        }

        if (typeof refreshSessionFromServer === 'function') {
            await refreshSessionFromServer();
        }

        const u = typeof getStoredUsuario === 'function' ? getStoredUsuario() : null;
        if (!u || String(u.tipo || '').toLowerCase() !== 'cliente') {
            if (typeof mostrarMensaje === 'function') {
                mostrarMensaje('Solo las cuentas con rol cliente pueden contratar planes aquí.', 'error');
            }
            return;
        }

        selectedPlanKey = planKey;
        selectedPlanTitle = title;
        selectedPlanPrice = priceNum;

        const tituloEl = document.getElementById('planModalTitulo');
        const precioEl = document.getElementById('planModalPrecio');
        if (tituloEl) tituloEl.textContent = title;
        if (precioEl) {
            precioEl.textContent = `Monto a pagar (mensualidad del plan): $${Number(priceNum).toLocaleString('es-CO')} COP`;
        }
        prefillUsuario();
        if (overlay) overlay.style.display = 'flex';
    }

    document.querySelectorAll('.btn-solicitar-plan').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-plan-key');
            const title = btn.getAttribute('data-plan-title') || 'Plan';
            const price = parseInt(btn.getAttribute('data-plan-price') || '0', 10);
            abrirModal(key, title, price);
        });
    });

    btnCerrar &&
        btnCerrar.addEventListener('click', () => {
            if (overlay) overlay.style.display = 'none';
        });

    overlay &&
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        });

    form &&
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('planFormNombre').value.trim();
            const apellido = document.getElementById('planFormApellido').value.trim();
            const email = document.getElementById('planFormEmail').value.trim();
            const telefono = document.getElementById('planFormTelefono').value.trim();
            const observaciones = document.getElementById('planFormObs').value.trim();

            if (!nombre || !apellido || !email || !telefono) {
                mostrarMensaje('Completa nombre, apellido, correo y teléfono.', 'error');
                return;
            }

            const res = await solicitudFacturaPlan({
                plan_key: selectedPlanKey,
                nombre,
                apellido,
                email,
                telefono,
                observaciones,
            });

            if (!res || !res.success || !res.data || !res.data.factura) {
                mostrarMensaje(res?.error || 'No se pudo generar la factura del plan.', 'error');
                return;
            }

            const facturaId = res.data.factura.id_factura;
            const pref = await apiFetch('/pagos/mercadopago/preferencia', {
                method: 'POST',
                body: JSON.stringify({
                    factura_id: facturaId,
                    frontend_base: window.location.origin,
                }),
                __actionLabel: 'Mercado Pago: checkout plan internet',
            });

            if (pref && pref.success && pref.data && pref.data.init_point) {
                window.location.href = pref.data.init_point;
                return;
            }

            mostrarMensaje(
                pref?.error ||
                    'La factura quedó creada, pero no se abrió Mercado Pago. Puedes pagarla desde la página Pagos con tu ID de usuario.',
                'error'
            );
            if (overlay) overlay.style.display = 'none';
        });
});
