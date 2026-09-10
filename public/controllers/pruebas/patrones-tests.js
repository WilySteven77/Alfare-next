        var modulesLoaded = {
            factory: typeof UserFactory !== 'undefined',
            proxy: typeof ProxyPagos !== 'undefined',
            observer: typeof NotificationCenter !== 'undefined'
        };

        function checkModulesLoaded() {
            var statusElement = document.getElementById('module-status');
            if (!statusElement) return;

            statusElement.innerHTML = '';

            var statuses = [
                { key: 'factory', label: 'Factory Pattern', loaded: typeof UserFactory !== 'undefined' },
                { key: 'proxy', label: 'Proxy Pattern', loaded: typeof ProxyPagos !== 'undefined' },
                { key: 'observer', label: 'Observer Pattern', loaded: typeof NotificationCenter !== 'undefined' }
            ];

            statuses.forEach(function(item) {
                var div = document.createElement('div');
                div.className = 'module-indicator ' + (item.loaded ? 'module-loaded' : 'module-error');
                div.textContent = item.label + ': ' + (item.loaded ? 'Cargado' : 'Error');
                statusElement.appendChild(div);

                modulesLoaded[item.key] = item.loaded;
            });

            if (statuses.every(s => s.loaded)) {
                statusElement.innerHTML += '<div class="module-indicator module-loaded">Todos los módulos cargados</div>';
            }
        }

        function testFullIntegration() {
            if (!modulesLoaded.factory || !modulesLoaded.proxy || !modulesLoaded.observer) {
                logToConsole('integration-console', '❌ ERROR: No todos los módulos están cargados');
                return;
            }

            try {
                logToConsole('integration-console', '=== INICIANDO PRUEBA DE INTEGRACIÓN COMPLETA ===\n');

                NotificationCenter.clear();

                logToConsole('integration-console', '[1] Creando cliente usando Factory Method...');
                var cliente = UserFactory.createUser('cliente', {
                    id: 100,
                    nombre: 'Integration Test User',
                    email: 'integration@test.com',
                    tipo: 'cliente',
                    plan: 'premium'
                });
                logToConsole('integration-console', '✅ Cliente creado: ' + cliente.nombre + ' (' + cliente.email + ')\n');

                logToConsole('integration-console', '[2] Suscribiendo observers al evento "pago_procesado"...');
                var emailObserver = new EmailNotificationObserver('IntegrationEmailService');
                var webObserver = new WebNotificationObserver('IntegrationWebNotifications');
                NotificationCenter.subscribe('pago_procesado', emailObserver);
                NotificationCenter.subscribe('pago_procesado', webObserver);
                logToConsole('integration-console', '✅ 2 observers suscritos\n');

                logToConsole('integration-console', '[3] Procesando pago con Proxy...');
                var proxy = new ProxyPagos();
                var paymentResult = proxy.procesarPago(cliente, 750, 'tarjeta_credito');
                if (paymentResult.success) {
                    logToConsole('integration-console',
                        '✅ Pago procesado exitosamente\n' +
                        '  Transaction ID: ' + paymentResult.data.transactionId + '\n' +
                        '  Monto: $' + paymentResult.data.monto + '\n' +
                        '  Estado: ' + paymentResult.data.estado + '\n');
                } else {
                    throw new Error(paymentResult.error || 'Error en pago');
                }

                logToConsole('integration-console', '[4] Verificando notificaciones del Observer...');
                var notifyResult = NotificationCenter.notify('pago_procesado', paymentResult.data);
                if (notifyResult && notifyResult.data && notifyResult.data.observersNotified) {
                    logToConsole('integration-console',
                        '✅ Notificaciones enviadas\n' +
                        '  Observers notificados: ' + notifyResult.data.observersNotified + '\n' +
                        '  Notificaciones exitosas: ' + notifyResult.data.successCount + '\n');
                }

                logToConsole('integration-console', '[5] Consultando historial de pagos...');
                var historyResult = proxy.consultarHistorialPagos(cliente);
                if (historyResult.success) {
                    logToConsole('integration-console',
                        '✅ Historial consultado: ' + historyResult.data.length + ' transacción(es)\n' +
                        '  ' + JSON.stringify(historyResult.data[0]) + '\n');
                } else {
                    throw new Error(historyResult.error || 'Error consultando historial');
                }

                logToConsole('integration-console', '=== PRUEBA DE INTEGRACIÓN COMPLETA: ÉXITO ===');
                addStatus('integration-status', 'Integración completa exitosa', 'success');
                testResults.integration.push({ test: 'Integración Completa', success: true });

            } catch (error) {
                logToConsole('integration-console', '❌ ERROR EN INTEGRACIÓN: ' + error.message);
                addStatus('integration-status', 'Error en integración', 'error');
                testResults.integration.push({ test: 'Integración Completa', success: false });
            }
        }

        function testSystemWorkflow() {
            if (!modulesLoaded.factory || !modulesLoaded.proxy || !modulesLoaded.observer) {
                logToConsole('integration-console', '❌ ERROR: No todos los módulos están cargados');
                return;
            }

            try {
                logToConsole('integration-console', '=== INICIANDO FLUJO COMPLETO DEL SISTEMA ===\n');

                NotificationCenter.clear();

                logToConsole('integration-console', '[1] Registrando múltiples tipos de usuarios...');

                var admin = UserFactory.createUser('administrador', {
                    id: 200,
                    nombre: 'Admin Sistema',
                    email: 'admin@test.com',
                    tipo: 'administrador'
                });
                logToConsole('integration-console', '✅ Usuario registrado: ' + admin.nombre + ' (administrador)');

                var tecnico = UserFactory.createUser('tecnico', {
                    id: 201,
                    nombre: 'Técnico Redes',
                    email: 'tecnico@test.com',
                    tipo: 'tecnico',
                    especialidad: 'redes'
                });
                logToConsole('integration-console', '✅ Usuario registrado: ' + tecnico.nombre + ' (tecnico)');

                var contador = UserFactory.createUser('contador', {
                    id: 202,
                    nombre: 'Contador Sistema',
                    email: 'contador@test.com',
                    tipo: 'contador'
                });
                logToConsole('integration-console', '✅ Usuario registrado: ' + contador.nombre + ' (contador)\n');

                logToConsole('integration-console', '[2] Suscribiendo observers a todos los eventos...');
                var emailObs = new EmailNotificationObserver('SystemEmailService');
                var webObs = new WebNotificationObserver('SystemWebNotifications');

                NotificationCenter.subscribe('nueva_factura', emailObs);
                NotificationCenter.subscribe('nueva_factura', webObs);
                NotificationCenter.subscribe('orden_actualizada', emailObs);
                NotificationCenter.subscribe('orden_actualizada', webObs);
                NotificationCenter.subscribe('pago_procesado', emailObs);
                NotificationCenter.subscribe('pago_procesado', webObs);
                logToConsole('integration-console', '✅ 6 suscripciones creadas (2 observers x 3 eventos)\n');

                logToConsole('integration-console', '[3] Generando factura (evento: nueva_factura)...');
                var factura = contador.generarFactura(100, ['Internet', 'Soporte'], 1250);
                if (factura.success) {
                    var notifyFactura = NotificationCenter.notify('nueva_factura', factura.data);
                    logToConsole('integration-console',
                        '✅ Factura generada y notificada\n' +
                        '  ID: ' + factura.data.id + '\n' +
                        '  Cliente: ' + factura.data.clienteId + '\n' +
                        '  Monto: $' + factura.data.monto + '\n');
                } else {
                    throw new Error(factura.error || 'Error generando factura');
                }

                logToConsole('integration-console', '[4] Procesando pago (evento: pago_procesado)...');
                var proxy = new ProxyPagos();
                var cliente = UserFactory.createUser('cliente', {
                    id: 100,
                    nombre: 'Cliente Sistema',
                    email: 'cliente@test.com',
                    tipo: 'cliente',
                    plan: 'premium'
                });
                var pago = proxy.procesarPago(cliente, 1250, 'tarjeta_credito');
                if (pago.success) {
                    logToConsole('integration-console',
                        '✅ Pago procesado\n' +
                        '  Transaction ID: ' + pago.data.transactionId + '\n' +
                        '  Monto: $' + pago.data.monto + '\n');
                } else {
                    throw new Error(pago.error || 'Error en pago');
                }

                logToConsole('integration-console', '[5] Actualizando orden de técnico (evento: orden_actualizada)...');
                var ordenData = {
                    ordenId: 'ORD-FLUJO-001',
                    nuevoEstado: 'completada',
                    tecnico: tecnico.nombre
                };
                var notifyOrden = NotificationCenter.notify('orden_actualizada', ordenData);
                logToConsole('integration-console',
                    '✅ Orden actualizada y notificada\n' +
                    '  Orden: ' + ordenData.ordenId + '\n' +
                    '  Estado: ' + ordenData.nuevoEstado + '\n');

                logToConsole('integration-console', '[6] Obteniendo estadísticas del sistema...');
                var stats = NotificationCenter.clear();
                var emailStats = emailObs.getEmailStats();
                var webStats = webObs.getNotificationStats();
                logToConsole('integration-console',
                    '✅ Estadísticas obtenidas\n' +
                    '  Emails enviados: ' + emailStats.data.totalEmails + '\n' +
                    '  Web notificaciones: ' + webStats.data.totalNotifications + '\n');

                logToConsole('integration-console', '[7] Consultando historial de pagos del cliente...');
                var historial = proxy.consultarHistorialPagos(cliente);
                if (historial.success) {
                    logToConsole('integration-console',
                        '✅ Historial consultado\n' +
                        '  Transacciones: ' + historial.data.length + '\n');
                } else {
                    logToConsole('integration-console', '⚠ No se pudo consultar historial: ' + historial.error + '\n');
                }

                logToConsole('integration-console', '=== FLUJO COMPLETO DEL SISTEMA: ÉXITO ===');
                addStatus('integration-status', 'Flujo completo exitoso', 'success');
                testResults.integration.push({ test: 'Flujo del Sistema', success: true });

            } catch (error) {
                logToConsole('integration-console', '❌ ERROR EN FLUJO: ' + error.message);
                addStatus('integration-status', 'Error en flujo del sistema', 'error');
                testResults.integration.push({ test: 'Flujo del Sistema', success: false });
            }
        }
