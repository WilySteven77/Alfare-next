// Controlador de pagos: facturas, confirmación, Mercado Pago y historial (entidad Pago)

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (getToken()) await refreshSessionFromServer();
    } catch (_) {}

    try {
        const u = getStoredUsuario();
        const banner = document.getElementById('bannerSesionCliente');
        const searchCustomerIdEl = document.getElementById('searchCustomerId');
        if (u && u.id_usuario && (u.tipo || '').toLowerCase() === 'cliente' && searchCustomerIdEl) {
            searchCustomerIdEl.value = u.id_usuario;
            if (banner) banner.style.display = 'block';
        }
    } catch (_) {}

    const invoiceSearchForm = document.getElementById('invoiceSearchForm');
    const invoiceResult = document.getElementById('invoiceResult');
    const searchCustomerId = document.getElementById('searchCustomerId');
    const facturaDetalleCard = document.getElementById('facturaDetalleCard');
    const facturaDetalleBody = document.getElementById('facturaDetalleBody');
    const overlayConfirmPago = document.getElementById('overlayConfirmPago');
    const confirmPagoTexto = document.getElementById('confirmPagoTexto');
    const confirmPagoSi = document.getElementById('confirmPagoSi');
    const confirmPagoNo = document.getElementById('confirmPagoNo');
    const retornoMercadoPago = document.getElementById('retornoMercadoPago');
    const comprobanteCard = document.getElementById('comprobanteCard');
    const comprobanteBody = document.getElementById('comprobanteBody');
    const btnImprimirComprobante = document.getElementById('btnImprimirComprobante');
    const historialPagosCard = document.getElementById('historialPagosCard');
    const historialPagosBody = document.getElementById('historialPagosBody');

    let pendingFacturaId = null;
    let lastClienteId = null;

    function formatFechaLegible(isoOrDate) {
        if (!isoOrDate) return '—';
        const d = new Date(isoOrDate);
        if (Number.isNaN(d.getTime())) return String(isoOrDate);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function cerrarModal() {
        if (overlayConfirmPago) overlayConfirmPago.style.display = 'none';
        pendingFacturaId = null;
    }

    function mostrarDetalleFactura(f, usuarioId) {
        if (!facturaDetalleCard || !facturaDetalleBody) return;
        const monto = f.monto != null ? Number(f.monto) : null;
        const fechaRaw = f.fecha_vencimiento;
        const estado = (f.estado || '').toString().toUpperCase();
        let problemas = [];
        if (monto == null || Number.isNaN(monto) || monto < 0) problemas.push('monto inválido o nulo');
        if (!fechaRaw) problemas.push('fecha de vencimiento inválida');

        if (problemas.length) {
            facturaDetalleCard.style.display = 'block';
            facturaDetalleBody.innerHTML = `
              <p style="color:#c0392b;">Esta factura presenta un error de facturación (${problemas.join(', ')}).</p>
              <p class="muted">No se muestran datos inconsistentes como válidos.</p>`;
            return;
        }

        facturaDetalleCard.style.display = 'block';
        facturaDetalleBody.innerHTML = `
          <p><strong>ID Factura:</strong> ${f.id_factura || f.id}</p>
          <p><strong>ID Usuario:</strong> ${usuarioId}</p>
          <p><strong>Monto:</strong> $${monto.toLocaleString('es-CO')}</p>
          <p><strong>Fecha de vencimiento:</strong> ${formatFechaLegible(fechaRaw)}</p>
          <p><strong>Estado:</strong> ${estado}</p>`;
    }

    async function cargarHistorialPagos(clienteId) {
        if (!historialPagosCard || !historialPagosBody) return;
        const res = await getPagosPorUsuarioPublico(clienteId);
        if (!res || !res.success || !Array.isArray(res.data)) {
            historialPagosCard.style.display = 'none';
            return;
        }
        historialPagosCard.style.display = 'block';
        if (res.data.length === 0) {
            historialPagosBody.innerHTML = '<p class="muted">No hay transacciones registradas aún para este usuario.</p>';
            return;
        }
        const rows = res.data.map((p) => {
            const est = (p.estado || '').toString().toUpperCase();
            const estLabel = est === 'COMPLETADO' || est === 'APROBADO' ? 'APROBADA' : est === 'RECHAZADO' || est === 'FALLIDO' ? 'RECHAZADA' : est || '—';
            const fecha = p.fecha_pago ? new Date(p.fecha_pago).toLocaleString('es-CO') : '—';
            return `<tr>
              <td style="border:var(--border); padding:.5rem .75rem;">${p.id_pago ?? p.id ?? '—'}</td>
              <td style="border:var(--border); padding:.5rem .75rem;">${p.factura_id}</td>
              <td style="border:var(--border); padding:.5rem .75rem;">${estLabel}</td>
              <td style="border:var(--border); padding:.5rem .75rem;">${p.metodo_pago || '—'}</td>
              <td style="border:var(--border); padding:.5rem .75rem;">${fecha}</td>
            </tr>`;
        }).join('');
        historialPagosBody.innerHTML = `
          <table style="width:100%; border-collapse:collapse; font-size:1.25rem;">
            <thead><tr style="background:#f5f5f5;">
              <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">ID Pago</th>
              <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">ID Factura</th>
              <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">Estado</th>
              <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">Método</th>
              <th style="border:var(--border); padding:.5rem .75rem; text-align:left;">Fecha</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
    }

    async function iniciarPreferencia(factura_id) {
        try {
            const resp = await apiFetch('/pagos/mercadopago/preferencia', {
                method: 'POST',
                body: JSON.stringify({
                    factura_id,
                    frontend_base: window.location.origin
                }),
                __actionLabel: 'Mercado Pago: crear preferencia de checkout',
            });
            if (resp && resp.success && resp.data && resp.data.init_point) {
                window.location.href = resp.data.init_point;
                return;
            }
            mostrarMensaje(resp?.error || 'No se pudo iniciar el pago con la pasarela.', 'error');
        } catch (e) {
            mostrarMensaje('La pasarela no está disponible o hubo un error de red. Intenta más tarde.', 'error');
        }
    }

    function renderListaFacturas(facturas, clienteId) {
        const list = document.createElement('div');
        list.style.marginTop = '1rem';
        facturas.forEach((f) => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:0.8rem 1rem; border: var(--border); background:#fff; margin-bottom:.6rem; display:flex; gap:1rem; align-items:center; justify-content:space-between; flex-wrap:wrap;';
            const idFactura = f.id_factura || f.id;
            const montoFactura = f.monto != null ? Number(f.monto) : NaN;
            const estado = (f.estado || '').toString().toUpperCase();
            const isPaid = estado === 'PAGADA';
            const isPending = estado === 'PENDIENTE';
            const isVoid = estado === 'ANULADA';

            let accionHtml = '';
            if (isPending && !Number.isNaN(montoFactura) && montoFactura >= 0) {
                accionHtml = `<button type="button" class="btn btn-pagar" data-id="${idFactura}" data-monto="${montoFactura}">Pagar online</button>`;
            } else if (isPaid) {
                accionHtml = `<span style="padding:.4rem .8rem; background:#4CAF50; color:#fff; border-radius:4px; font-size:1.2rem;">Pagada</span>
                  <button type="button" class="btn btn-intento-pago" data-estado="PAGADA" style="font-size:1.2rem;">Intentar pagar</button>`;
            } else if (isVoid) {
                accionHtml = `<span class="muted" style="font-size:1.2rem;">No disponible (ANULADA)</span>`;
            } else {
                accionHtml = `<span class="muted" style="font-size:1.2rem;">Solo pagos en estado PENDIENTE</span>`;
            }

            item.innerHTML = `
                <div>
                  <strong>Factura #${idFactura}</strong>
                  <div style="font-size:1.3rem; color:var(--light-color);">Vence: ${formatFechaLegible(f.fecha_vencimiento)} • Estado: ${estado}</div>
                </div>
                <div style="display:flex; gap:.5rem; align-items:center; flex-wrap:wrap;">
                  <span style="font-weight:600;">${Number.isNaN(montoFactura) ? '—' : '$' + montoFactura.toLocaleString('es-CO')}</span>
                  ${accionHtml}
                  <button type="button" class="btn ver-detalle" data-json="${encodeURIComponent(JSON.stringify(f))}" style="font-size:1.2rem;">Ver detalle</button>
                </div>
            `;
            list.appendChild(item);
        });

        list.querySelectorAll('.ver-detalle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const f = JSON.parse(decodeURIComponent(btn.getAttribute('data-json')));
                mostrarDetalleFactura(f, clienteId);
            });
        });

        list.querySelectorAll('.btn-pagar').forEach((btn) => {
            btn.addEventListener('click', () => {
                const factura_id = parseInt(btn.getAttribute('data-id'), 10);
                const monto = btn.getAttribute('data-monto');
                pendingFacturaId = factura_id;
                if (confirmPagoTexto) {
                    confirmPagoTexto.innerHTML = `<strong>Factura:</strong> #${factura_id}<br/><strong>Monto:</strong> $${Number(monto).toLocaleString('es-CO')} COP`;
                }
                if (overlayConfirmPago) overlayConfirmPago.style.display = 'flex';
            });
        });

        list.querySelectorAll('.btn-intento-pago').forEach((btn) => {
            btn.addEventListener('click', () => {
                mostrarMensaje('Esta factura ya fue pagada. No se enviará ninguna transacción a la pasarela.', 'error');
            });
        });

        return list;
    }

    if (confirmPagoNo) confirmPagoNo.addEventListener('click', cerrarModal);
    if (overlayConfirmPago) {
        overlayConfirmPago.addEventListener('click', (e) => {
            if (e.target === overlayConfirmPago) cerrarModal();
        });
    }
    if (confirmPagoSi) {
        confirmPagoSi.addEventListener('click', async () => {
            const id = pendingFacturaId;
            cerrarModal();
            if (id) await iniciarPreferencia(id);
        });
    }

    invoiceSearchForm && invoiceSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clienteId = parseInt(searchCustomerId.value, 10);
        invoiceResult.innerHTML = '';
        if (facturaDetalleCard) facturaDetalleCard.style.display = 'none';
        if (comprobanteCard) comprobanteCard.style.display = 'none';
        lastClienteId = clienteId;
        try {
            sessionStorage.setItem('alfared_last_cliente_id', String(clienteId));
        } catch (_) {}

        const res = await getFacturasByCliente(clienteId);
        if (!res) {
            invoiceResult.innerHTML = '<p>Error consultando facturas.</p>';
            return;
        }
        if (res.success === false && res.code === 'USER_NOT_FOUND') {
            invoiceResult.innerHTML = '<p style="color:#c0392b;">El ID ingresado no es válido o no existe en el sistema. No se muestran facturas.</p>';
            if (historialPagosCard) historialPagosCard.style.display = 'none';
            return;
        }
        if (res.success === false && (res.code === 'NO_TOKEN' || res.code === 'INVALID_TOKEN' || res.code === 'ACCESS_DENIED')) {
            invoiceResult.innerHTML = '<p>Debe iniciar sesión y consultar con su propio ID de usuario.</p>';
            return;
        }

        const facturas = Array.isArray(res.data) ? res.data : [];
        if (!facturas.length) {
            invoiceResult.innerHTML = '<p>No hay facturas registradas para este usuario (lista vacía).</p>';
            await cargarHistorialPagos(clienteId);
            return;
        }

        invoiceResult.appendChild(renderListaFacturas(facturas, clienteId));
        await cargarHistorialPagos(clienteId);
    });

    function procesarRetornoMercadoPago() {
        const params = new URLSearchParams(window.location.search);
        const collectionStatus = (params.get('collection_status') || '').toLowerCase();
        const paidParam = params.get('paid');
        const clienteQs = params.get('cliente_id');

        if (clienteQs && searchCustomerId) {
            searchCustomerId.value = clienteQs;
            try {
                sessionStorage.setItem('alfared_last_cliente_id', clienteQs);
            } catch (_) {}
        }

        const approved =
            paidParam === '1' ||
            collectionStatus === 'approved' ||
            params.get('status') === 'approved';

        const rejected =
            paidParam === '0' ||
            collectionStatus === 'rejected' ||
            collectionStatus === 'failure' ||
            collectionStatus === 'cancelled';

        const pending = paidParam === 'pending' || collectionStatus === 'pending' || collectionStatus === 'in_process';

        if (!params.has('paid') && !collectionStatus && !params.get('status')) {
            return;
        }

        if (retornoMercadoPago) {
            retornoMercadoPago.style.display = 'block';
            if (approved) {
                retornoMercadoPago.innerHTML = `
                  <div class="card-body" style="background:#f6fff7; border:1px solid #c7eccf;">
                    <h3 style="margin-bottom:.5rem;">Pago aprobado</h3>
                    <p style="font-size:1.3rem;">La pasarela confirmó el pago. Tu factura debe aparecer como <strong>PAGADA</strong> al refrescar la lista.</p>
                  </div>`;
                mostrarMensaje('Pago aprobado por la pasarela.', 'success');
                if (comprobanteCard && comprobanteBody) {
                    comprobanteCard.style.display = 'block';
                    const fid = params.get('external_reference') || '—';
                    comprobanteBody.innerHTML = `
                      <p><strong>ID Factura (referencia):</strong> ${fid}</p>
                      <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
                      <p class="muted">Guarda o imprime este comprobante. También queda registrado en tu historial de pagos.</p>`;
                }
            } else if (rejected) {
                retornoMercadoPago.innerHTML = `
                  <div class="card-body" style="background:#fff5f5; border:1px solid #f5b7b1;">
                    <h3 style="margin-bottom:.5rem;">Transacción no aprobada</h3>
                    <p style="font-size:1.3rem;">Tu factura permanece en estado pendiente. No se genera comprobante.</p>
                    <p style="font-size:1.2rem;" class="muted">Motivo (si la pasarela no lo envía): operación rechazada o cancelada. Si necesitas ayuda, contacta soporte.</p>
                  </div>`;
                mostrarMensaje('El pago no fue aprobado.', 'error');
            } else if (pending) {
                retornoMercadoPago.innerHTML = `
                  <div class="card-body">
                    <h3 style="margin-bottom:.5rem;">Pago pendiente</h3>
                    <p style="font-size:1.3rem;">Mercado Pago está procesando el pago. Vuelve en unos minutos y consulta de nuevo tus facturas.</p>
                  </div>`;
                mostrarMensaje('Pago pendiente de confirmación.', 'error');
            } else {
                retornoMercadoPago.innerHTML = `
                  <div class="card-body">
                    <p style="font-size:1.3rem;">Retorno desde Mercado Pago registrado.</p>
                  </div>`;
            }
        }

        const cid = clienteQs || sessionStorage.getItem('alfared_last_cliente_id');
        if (cid && searchCustomerId) {
            searchCustomerId.value = cid;
            setTimeout(() => invoiceSearchForm && invoiceSearchForm.dispatchEvent(new Event('submit')), 400);
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (btnImprimirComprobante && comprobanteCard) {
        btnImprimirComprobante.addEventListener('click', () => window.print());
    }

    try {
        const stored = sessionStorage.getItem('alfared_last_cliente_id');
        if (stored && searchCustomerId && !searchCustomerId.value) searchCustomerId.value = stored;
    } catch (_) {}

    procesarRetornoMercadoPago();
});
