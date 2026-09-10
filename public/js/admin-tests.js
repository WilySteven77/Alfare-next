        // Variables globales para testing
        let testResults = {
            factory: [],
            proxy: [],
            observer: [],
            integration: []
        };

        // Estado y verificación se manejan en ../../controllers/pruebas/patrones-tests.js

        // Funciones de testing para Factory Method
        function testFactoryCliente() {
            if (!modulesLoaded.factory) {
                logToConsole('factory-console', '❌ ERROR: Módulo Factory Pattern no cargado');
                return;
            }

            try {
                const response = UserFactory.createUserEndpoint({
                    userType: 'cliente',
                    userData: {
                        id: 1,
                        nombre: 'Juan Pérez',
                        email: 'juan@test.com',
                        tipo: 'cliente',
                        plan: 'premium'
                    }
                });
                
                if (response.success) {
                    const output = `✅ ÉXITO: Cliente creado correctamente
Nombre: ${response.data.nombre}
Email: ${response.data.email}
Tipo: ${response.data.tipo}
Creado: ${response.data.createdAt}`;
                    
                    logToConsole('factory-console', output);
                    addStatus('factory-status', response.message, 'success');
                    testResults.factory.push({ test: 'Cliente', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('factory-console', output);
                addStatus('factory-status', 'Error creando cliente', 'error');
                testResults.factory.push({ test: 'Cliente', success: false });
            }
        }

        function testFactoryTecnico() {
            if (!modulesLoaded.factory) {
                logToConsole('factory-console', '❌ ERROR: Módulo Factory Pattern no cargado');
                return;
            }

            try {
                const response = UserFactory.createUserEndpoint({
                    userType: 'tecnico',
                    userData: {
                        id: 2,
                        nombre: 'María García',
                        email: 'maria@test.com',
                        tipo: 'tecnico',
                        especialidad: 'redes'
                    }
                });
                
                if (response.success) {
                    const output = `✅ ÉXITO: Técnico creado correctamente
Nombre: ${response.data.nombre}
Email: ${response.data.email}
Tipo: ${response.data.tipo}`;
                    
                    logToConsole('factory-console', output);
                    addStatus('factory-status', response.message, 'success');
                    testResults.factory.push({ test: 'Técnico', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('factory-console', output);
                addStatus('factory-status', 'Error creando técnico', 'error');
                testResults.factory.push({ test: 'Técnico', success: false });
            }
        }

        function testFactoryContador() {
            if (!modulesLoaded.factory) {
                logToConsole('factory-console', '❌ ERROR: Módulo Factory Pattern no cargado');
                return;
            }

            try {
                const response = UserFactory.createUserEndpoint({
                    userType: 'contador',
                    userData: {
                        id: 3,
                        nombre: 'Carlos López',
                        email: 'carlos@test.com',
                        tipo: 'contador'
                    }
                });
                
                if (response.success) {
                    const output = `✅ ÉXITO: Contador creado correctamente
Nombre: ${response.data.nombre}
Email: ${response.data.email}
Tipo: ${response.data.tipo}`;
                    
                    logToConsole('factory-console', output);
                    addStatus('factory-status', response.message, 'success');
                    testResults.factory.push({ test: 'Contador', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('factory-console', output);
                addStatus('factory-status', 'Error creando contador', 'error');
                testResults.factory.push({ test: 'Contador', success: false });
            }
        }

        function testFactoryAdmin() {
            if (!modulesLoaded.factory) {
                logToConsole('factory-console', '❌ ERROR: Módulo Factory Pattern no cargado');
                return;
            }

            try {
                const response = UserFactory.createUserEndpoint({
                    userType: 'administrador',
                    userData: {
                        id: 4,
                        nombre: 'Ana Rodríguez',
                        email: 'ana@test.com',
                        tipo: 'administrador'
                    }
                });
                
                if (response.success) {
                    const output = `✅ ÉXITO: Administrador creado correctamente
Nombre: ${response.data.nombre}
Email: ${response.data.email}
Tipo: ${response.data.tipo}`;
                    
                    logToConsole('factory-console', output);
                    addStatus('factory-status', response.message, 'success');
                    testResults.factory.push({ test: 'Administrador', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('factory-console', output);
                addStatus('factory-status', 'Error creando administrador', 'error');
                testResults.factory.push({ test: 'Administrador', success: false });
            }
        }

        function testFactoryInvalid() {
            if (!modulesLoaded.factory) {
                logToConsole('factory-console', '❌ ERROR: Módulo Factory Pattern no cargado');
                return;
            }

            try {
                const response = UserFactory.createUserEndpoint({
                    userType: 'tipo_inexistente',
                    userData: {
                        id: 5,
                        nombre: 'Test',
                        email: 'test@test.com'
                    }
                });
                
                if (!response.success) {
                    const output = `✅ ÉXITO: Error capturado correctamente
Mensaje: ${response.error}
Código: ${response.code}`;
                    logToConsole('factory-console', output);
                    addStatus('factory-status', 'Error manejado correctamente', 'success');
                    testResults.factory.push({ test: 'Tipo Inválido', success: true });
                } else {
                    throw new Error('Debería haber fallado');
                }
                
            } catch (error) {
                const output = `❌ FALLO: ${error.message}`;
                logToConsole('factory-console', output);
                addStatus('factory-status', 'Test falló', 'error');
                testResults.factory.push({ test: 'Tipo Inválido', success: false });
            }
        }

        // Funciones de testing para Proxy
        function testProxyValidPayment() {
            if (!modulesLoaded.proxy || !modulesLoaded.factory) {
                logToConsole('proxy-console', '❌ ERROR: Módulos requeridos no cargados');
                return;
            }

            try {
                const cliente = UserFactory.createUser('cliente', {
                    id: 1,
                    nombre: 'Juan Pérez',
                    email: 'juan@test.com',
                    tipo: 'cliente'
                });

                const proxy = new ProxyPagos();
                const response = proxy.procesarPago(cliente, 500, 'tarjeta_credito');
                
                if (response.success) {
                    const output = `✅ ÉXITO: Pago procesado correctamente
Transaction ID: ${response.data.transactionId}
Monto: $${response.data.monto}
Método: ${response.data.metodoPago}`;
                    
                    logToConsole('proxy-console', output);
                    addStatus('proxy-status', response.message, 'success');
                    testResults.proxy.push({ test: 'Pago Válido', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('proxy-console', output);
                addStatus('proxy-status', 'Error en pago válido', 'error');
                testResults.proxy.push({ test: 'Pago Válido', success: false });
            }
        }

        function testProxyInvalidUser() {
            if (!modulesLoaded.proxy) {
                logToConsole('proxy-console', '❌ ERROR: Módulo Proxy Pattern no cargado');
                return;
            }

            try {
                const usuarioInvalido = {
                    id: null,
                    nombre: 'Usuario Inválido',
                    email: null,
                    tipo: 'cliente'
                };

                const proxy = new ProxyPagos();
                const response = proxy.procesarPago(usuarioInvalido, 500, 'tarjeta_credito');
                
                if (!response.success) {
                    const output = `✅ ÉXITO: Usuario inválido rechazado correctamente
Mensaje: ${response.error}
Código: ${response.code}`;
                    logToConsole('proxy-console', output);
                    addStatus('proxy-status', 'Usuario inválido rechazado', 'success');
                    testResults.proxy.push({ test: 'Usuario Inválido', success: true });
                } else {
                    throw new Error('Debería haber rechazado usuario inválido');
                }
                
            } catch (error) {
                const output = `❌ FALLO: ${error.message}`;
                logToConsole('proxy-console', output);
                addStatus('proxy-status', 'Test falló', 'error');
                testResults.proxy.push({ test: 'Usuario Inválido', success: false });
            }
        }

        function testProxyInvalidAmount() {
            if (!modulesLoaded.proxy || !modulesLoaded.factory) {
                logToConsole('proxy-console', '❌ ERROR: Módulos requeridos no cargados');
                return;
            }

            try {
                const cliente = UserFactory.createUser('cliente', {
                    id: 1,
                    nombre: 'Juan Pérez',
                    email: 'juan@test.com',
                    tipo: 'cliente'
                });

                const proxy = new ProxyPagos();
                const response = proxy.procesarPago(cliente, -100, 'tarjeta_credito');
                
                if (!response.success) {
                    const output = `✅ ÉXITO: Monto inválido rechazado correctamente
Mensaje: ${response.error}`;
                    logToConsole('proxy-console', output);
                    addStatus('proxy-status', 'Monto inválido rechazado', 'success');
                    testResults.proxy.push({ test: 'Monto Inválido', success: true });
                } else {
                    throw new Error('Debería haber rechazado monto inválido');
                }
                
            } catch (error) {
                const output = `❌ FALLO: ${error.message}`;
                logToConsole('proxy-console', output);
                addStatus('proxy-status', 'Test falló', 'error');
                testResults.proxy.push({ test: 'Monto Inválido', success: false });
            }
        }

        function testProxyMultipleFailures() {
            if (!modulesLoaded.proxy || !modulesLoaded.factory) {
                logToConsole('proxy-console', '❌ ERROR: Módulos requeridos no cargados');
                return;
            }

            try {
                const cliente = UserFactory.createUser('cliente', {
                    id: 999,
                    nombre: 'Test User',
                    email: 'test@test.com',
                    tipo: 'cliente'
                });

                const proxy = new ProxyPagos();
                
                // Realizar múltiples intentos fallidos
                for (let i = 0; i < 3; i++) {
                    proxy.procesarPago(cliente, -100, 'tarjeta_credito');
                }
                
                // Verificar estado del usuario
                const estado = proxy.verificarEstadoUsuario(cliente);
                
                const output = `✅ ÉXITO: Sistema de múltiples fallos funcionando
Usuario bloqueado: ${estado.data.bloqueado}
Intentos fallidos: ${estado.data.intentosFallidos}`;
                
                logToConsole('proxy-console', output);
                addStatus('proxy-status', 'Sistema de bloqueo funcionando', 'success');
                testResults.proxy.push({ test: 'Múltiples Fallos', success: true });
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('proxy-console', output);
                addStatus('proxy-status', 'Error en test múltiples fallos', 'error');
                testResults.proxy.push({ test: 'Múltiples Fallos', success: false });
            }
        }

        function testProxyHistorial() {
            if (!modulesLoaded.proxy || !modulesLoaded.factory) {
                logToConsole('proxy-console', '❌ ERROR: Módulos requeridos no cargados');
                return;
            }

            try {
                const cliente = UserFactory.createUser('cliente', {
                    id: 1,
                    nombre: 'Juan Pérez',
                    email: 'juan@test.com',
                    tipo: 'cliente'
                });

                const proxy = new ProxyPagos();
                const response = proxy.consultarHistorialPagos(cliente);
                
                if (response.success) {
                    const output = `✅ ÉXITO: Historial consultado correctamente
Registros encontrados: ${response.data.length}
Mensaje: ${response.message}`;
                    
                    logToConsole('proxy-console', output);
                    addStatus('proxy-status', response.message, 'success');
                    testResults.proxy.push({ test: 'Consultar Historial', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('proxy-console', output);
                addStatus('proxy-status', 'Error consultando historial', 'error');
                testResults.proxy.push({ test: 'Consultar Historial', success: false });
            }
        }

        // Funciones de testing para Observer
        function testObserverFactura() {
            if (!modulesLoaded.observer) {
                logToConsole('observer-console', '❌ ERROR: Módulo Observer Pattern no cargado');
                return;
            }

            try {
                // Crear centro de notificaciones
                const notificationCenter = new NotificationCenter();
                
                // Crear observers
                const emailObserver = new EmailNotificationObserver('EmailService');
                const webObserver = new WebNotificationObserver('WebNotifications');
                
                // Suscribir observers
                notificationCenter.subscribe('nueva_factura', emailObserver);
                notificationCenter.subscribe('nueva_factura', webObserver);
                
                // Crear datos de prueba
                const facturaData = {
                    id: 12345,
                    clienteId: 1,
                    servicios: ['Internet', 'Soporte'],
                    monto: 500,
                    fecha: new Date(),
                    estado: 'pendiente'
                };
                
                // Notificar evento
                const response = notificationCenter.notify('nueva_factura', facturaData);
                
                if (response.success) {
                    const output = `✅ ÉXITO: Observer Pattern funcionando correctamente
${response.message}
Observadores notificados: ${response.data.observersNotified}
Notificaciones exitosas: ${response.data.successCount}
Datos de factura:
- ID: ${facturaData.id}
- Monto: ${facturaData.monto}
- Cliente: ${facturaData.clienteId}`;
                    
                    logToConsole('observer-console', output);
                    addStatus('observer-status', 'Notificación de factura enviada', 'success');
                    testResults.observer.push({ test: 'Nueva Factura', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('observer-console', output);
                addStatus('observer-status', 'Error en notificación de factura', 'error');
                testResults.observer.push({ test: 'Nueva Factura', success: false });
            }
        }

        function testObserverOrden() {
            if (!modulesLoaded.observer) {
                logToConsole('observer-console', '❌ ERROR: Módulo Observer Pattern no cargado');
                return;
            }

            try {
                const notificationCenter = new NotificationCenter();
                const emailObserver = new EmailNotificationObserver('EmailService');
                const webObserver = new WebNotificationObserver('WebNotifications');
                
                notificationCenter.subscribe('orden_actualizada', emailObserver);
                notificationCenter.subscribe('orden_actualizada', webObserver);
                
                const ordenData = {
                    ordenId: 'ORD-001',
                    nuevoEstado: 'completada',
                    tecnico: 'Carlos López',
                    fechaActualizacion: new Date()
                };
                
                const response = notificationCenter.notify('orden_actualizada', ordenData);
                
                if (response.success) {
                    const output = `✅ ÉXITO: Notificación de orden enviada correctamente
${response.message}
Observadores notificados: ${response.data.observersNotified}
Datos de orden:
- ID: ${ordenData.ordenId}
- Estado: ${ordenData.nuevoEstado}
- Técnico: ${ordenData.tecnico}`;
                    
                    logToConsole('observer-console', output);
                    addStatus('observer-status', 'Notificación de orden enviada', 'success');
                    testResults.observer.push({ test: 'Actualizar Orden', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('observer-console', output);
                addStatus('observer-status', 'Error en notificación de orden', 'error');
                testResults.observer.push({ test: 'Actualizar Orden', success: false });
            }
        }

        function testObserverPago() {
            if (!modulesLoaded.observer) {
                logToConsole('observer-console', '❌ ERROR: Módulo Observer Pattern no cargado');
                return;
            }

            try {
                const notificationCenter = new NotificationCenter();
                const emailObserver = new EmailNotificationObserver('EmailService');
                const webObserver = new WebNotificationObserver('WebNotifications');
                
                notificationCenter.subscribe('pago_procesado', emailObserver);
                notificationCenter.subscribe('pago_procesado', webObserver);
                
                const pagoData = {
                    transactionId: 'TXN-12345',
                    clienteId: 1,
                    monto: 500,
                    metodoPago: 'tarjeta_credito',
                    fecha: new Date()
                };
                
                const response = notificationCenter.notify('pago_procesado', pagoData);
                
                if (response.success) {
                    const output = `✅ ÉXITO: Notificación de pago enviada correctamente
${response.message}
Observadores notificados: ${response.data.observersNotified}
Datos de pago:
- Transaction ID: ${pagoData.transactionId}
- Monto: $${pagoData.monto}
- Método: ${pagoData.metodoPago}`;
                    
                    logToConsole('observer-console', output);
                    addStatus('observer-status', 'Notificación de pago enviada', 'success');
                    testResults.observer.push({ test: 'Pago Procesado', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('observer-console', output);
                addStatus('observer-status', 'Error en notificación de pago', 'error');
                testResults.observer.push({ test: 'Pago Procesado', success: false });
            }
        }

        function testObserverSubscribe() {
            if (!modulesLoaded.observer) {
                logToConsole('observer-console', '❌ ERROR: Módulo Observer Pattern no cargado');
                return;
            }

            try {
                const notificationCenter = new NotificationCenter();
                const newObserver = new EmailNotificationObserver('NuevoObserver');
                
                const response = notificationCenter.subscribe('nuevo_evento', newObserver);
                
                if (response.success) {
                    const output = `✅ ÉXITO: Observer suscrito correctamente
${response.message}
Evento: nuevo_evento
Observer: NuevoObserver`;
                    
                    logToConsole('observer-console', output);
                    addStatus('observer-status', 'Observer suscrito correctamente', 'success');
                    testResults.observer.push({ test: 'Suscribir Observer', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('observer-console', output);
                addStatus('observer-status', 'Error suscribiendo observer', 'error');
                testResults.observer.push({ test: 'Suscribir Observer', success: false });
            }
        }

        function testObserverUnsubscribe() {
            if (!modulesLoaded.observer) {
                logToConsole('observer-console', '❌ ERROR: Módulo Observer Pattern no cargado');
                return;
            }

            try {
                const notificationCenter = new NotificationCenter();
                const observerToRemove = new EmailNotificationObserver('ObserverARemover');
                
                // Primero suscribir
                notificationCenter.subscribe('evento_prueba', observerToRemove);
                
                // Luego desuscribir
                const response = notificationCenter.unsubscribe('evento_prueba', observerToRemove);
                
                if (response.success) {
                    const output = `✅ ÉXITO: Observer desuscrito correctamente
${response.message}
Evento: evento_prueba
Observer: ObserverARemover`;
                    
                    logToConsole('observer-console', output);
                    addStatus('observer-status', 'Observer desuscrito correctamente', 'success');
                    testResults.observer.push({ test: 'Desuscribir Observer', success: true });
                } else {
                    throw new Error(response.error);
                }
                
            } catch (error) {
                const output = `❌ ERROR: ${error.message}`;
                logToConsole('observer-console', output);
                addStatus('observer-status', 'Error desuscribiendo observer', 'error');
                testResults.observer.push({ test: 'Desuscribir Observer', success: false });
            }
        }

        // Funciones de utilidad
        function logToConsole(consoleId, message) {
            const consoleElement = document.getElementById(consoleId);
            consoleElement.textContent += message + '\n';
            consoleElement.scrollTop = consoleElement.scrollHeight;
        }

        function addStatus(statusId, message, type) {
            const statusElement = document.getElementById(statusId);
            statusElement.innerHTML = `<div class="status ${type}">${message}</div>`;
        }

        function clearAllConsoles() {
            const consoles = ['factory-console', 'proxy-console', 'observer-console', 'integration-console'];
            const statuses = ['factory-status', 'proxy-status', 'observer-status', 'integration-status'];
            
            consoles.forEach(id => {
                document.getElementById(id).textContent = '';
            });
            
            statuses.forEach(id => {
                document.getElementById(id).innerHTML = '';
            });
            
            testResults = {
                factory: [],
                proxy: [],
                observer: [],
                integration: []
            };
            
            updateResultsSummary();
        }

        function updateResultsSummary() {
            const summaryElement = document.getElementById('results-summary');
            let summaryHTML = '';
            
            const sections = [
                { name: 'Factory Pattern', key: 'factory' },
                { name: 'Proxy Pattern', key: 'proxy' },
                { name: 'Observer Pattern', key: 'observer' },
                { name: 'Integración', key: 'integration' }
            ];
            
            sections.forEach(section => {
                const tests = testResults[section.key];
                const total = tests.length;
                const passed = tests.filter(test => test.success).length;
                const failed = total - passed;
                
                summaryHTML += `
                    <div style="margin: 1rem 0;">
                        <h4>${section.name}</h4>
                        <div>Total: ${total} | Aprobados: <span style="color: var(--success);">${passed}</span> | Fallados: <span style="color: var(--error);">${failed}</span></div>
                    </div>
                `;
            });
            
            summaryElement.innerHTML = summaryHTML;
        }

        // Inicialización
        window.addEventListener('DOMContentLoaded', function() {
            // Verificar módulos después de un breve tiempo para permitir la carga
            setTimeout(checkModulesLoaded, 100);
            
            // Actualizar resumen de resultados periódicamente
            setInterval(updateResultsSummary, 2000);
        });
