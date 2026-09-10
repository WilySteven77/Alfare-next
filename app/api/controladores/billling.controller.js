// Controlador de pagos y facturación (usa ProxyPagos a través de AlfaredSystem)

function initBilling() {
    const paymentForm = document.getElementById('paymentForm');
    const historyForm = document.getElementById('historyForm');
    const historyResult = document.getElementById('historyResult');

    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const userId = parseInt(document.getElementById('payCustomerId').value);
            const amount = parseFloat(document.getElementById('payAmount').value);
            const method = document.getElementById('payMethod').value;

            try {
                const result = alfaredSystem.procesarPago(userId, amount, method);
                mostrarMensaje(`Pago procesado: ${result.transactionId}`, 'success');
            } catch (err) {
                mostrarMensaje(err.message, 'error');
            }
        });
    }

    if (historyForm) {
        historyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const userId = parseInt(document.getElementById('historyCustomerId').value);
            try {
                const res = alfaredSystem.consultarHistorialPagos(userId);
                if (res && res.data && Array.isArray(res.data)) {
                    const list = res.data.map(x => `${x.id || x.transactionId} - $${x.monto} - ${x.metodoPago || x.metodo} - ${x.fecha}`).join('<br/>');
                    historyResult.innerHTML = list || 'Sin registros';
                } else if (Array.isArray(res)) {
                    historyResult.innerHTML = res.map(x => `${x.id} - $${x.monto} - ${x.metodoPago || ''} - ${x.fecha}`).join('<br/>') || 'Sin registros';
                } else {
                    historyResult.textContent = 'Sin registros';
                }
            } catch (err) {
                mostrarMensaje(err.message, 'error');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initBilling);


