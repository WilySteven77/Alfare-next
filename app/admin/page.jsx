'use client';

import Script from 'next/script';

// HTML del body extraído tal cual del HTML original (sin modificaciones internas)
const pageHTML = `
    <div class="test-container">
        <!-- Header -->
        <div class="header">
            <h1><span class="logo">Alfa</span>Red - Pruebas de Patrones de Diseño</h1>
            <p style="font-size: 1.6rem; color: var(--light-color);">Testing Factory Method, Proxy y Observer Patterns</p>
            
            <!-- Estado de los módulos -->
            <div class="module-status" id="module-status">
                <div class="loading">Cargando módulos...</div>
            </div>
        </div>

        <!-- Factory Method Tests -->
        <div class="test-section">
            <div class="test-header">🏭 Factory Method Pattern</div>
            <div class="test-content">
                <div class="test-buttons">
                    <button class="test-btn btn-primary" onclick="testFactoryCliente()">Crear Cliente</button>
                    <button class="test-btn btn-primary" onclick="testFactoryTecnico()">Crear Técnico</button>
                    <button class="test-btn btn-primary" onclick="testFactoryContador()">Crear Contador</button>
                    <button class="test-btn btn-primary" onclick="testFactoryAdmin()">Crear Admin</button>
                    <button class="test-btn btn-error" onclick="testFactoryInvalid()">Tipo Inválido</button>
                </div>
                <div id="factory-status"></div>
                <div class="console-output" id="factory-console"></div>
            </div>
        </div>

        <!-- Proxy Pattern Tests -->
        <div class="test-section">
            <div class="test-header">🛡️ Proxy Pattern - Sistema de Pagos</div>
            <div class="test-content">
                <div class="test-buttons">
                    <button class="test-btn btn-success" onclick="testProxyValidPayment()">Pago Válido</button>
                    <button class="test-btn btn-warning" onclick="testProxyInvalidUser()">Usuario Inválido</button>
                    <button class="test-btn btn-warning" onclick="testProxyInvalidAmount()">Monto Inválido</button>
                    <button class="test-btn btn-error" onclick="testProxyMultipleFailures()">Múltiples Fallos</button>
                    <button class="test-btn btn-primary" onclick="testProxyHistorial()">Consultar Historial</button>
                </div>
                <div id="proxy-status"></div>
                <div class="console-output" id="proxy-console"></div>
            </div>
        </div>

        <!-- Observer Pattern Tests -->
        <div class="test-section">
            <div class="test-header">👁️ Observer Pattern - Notificaciones</div>
            <div class="test-content">
                <div class="test-buttons">
                    <button class="test-btn btn-success" onclick="testObserverFactura()">Nueva Factura</button>
                    <button class="test-btn btn-success" onclick="testObserverOrden()">Actualizar Orden</button>
                    <button class="test-btn btn-success" onclick="testObserverPago()">Pago Procesado</button>
                    <button class="test-btn btn-warning" onclick="testObserverSubscribe()">Suscribir Observer</button>
                    <button class="test-btn btn-error" onclick="testObserverUnsubscribe()">Desuscribir Observer</button>
                </div>
                <div id="observer-status"></div>
                <div class="console-output" id="observer-console"></div>
            </div>
        </div>

        <!-- Integración Completa -->
        <div class="test-section">
            <div class="test-header">🔄 Prueba de Integración Completa</div>
            <div class="test-content">
                <div class="test-buttons">
                    <button class="test-btn btn-primary" onclick="testFullIntegration()">Ejecutar Prueba Completa</button>
                    <button class="test-btn btn-success" onclick="testSystemWorkflow()">Flujo Completo del Sistema</button>
                </div>
                <div id="integration-status"></div>
                <div class="console-output" id="integration-console"></div>
            </div>
        </div>

        <!-- Resultados -->
        <div class="results-summary">
            <h3>Resumen de Resultados</h3>
            <div id="results-summary"></div>
            <button class="clear-btn" onclick="clearAllConsoles()">Limpiar Todas las Consolas</button>
        </div>
    </div>
`;

export default function AdminPage() {
  return (
    <>
      {/* Estilos extraídos del HTML original sin modificaciones */}
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600&display=swap");

        :root {
            --yellow: #3137fd;
            --black: #111;
            --white: #ffffff;
            --light-color: #666;
            --light-bg: #eee;
            --box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
            --border: 0.1rem solid rgba(0, 0, 0, 0.3);
            --success: #4CAF50;
            --error: #f44336;
            --warning: #ff9800;
        }

        * {
            font-family: "Poppins", sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: var(--light-bg);
            min-height: 100vh;
            padding: 2rem;
        }

        .test-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem;
            background: var(--white);
            border-radius: 1rem;
            box-shadow: var(--box-shadow);
        }

        .header h1 {
            color: var(--black);
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .header .logo {
            color: var(--yellow);
        }

        .test-section {
            background: var(--white);
            margin-bottom: 2rem;
            border-radius: 1rem;
            box-shadow: var(--box-shadow);
            overflow: hidden;
        }

        .test-header {
            background: var(--yellow);
            color: var(--white);
            padding: 1.5rem 2rem;
            font-size: 1.8rem;
            font-weight: 600;
        }

        .test-content {
            padding: 2rem;
        }

        .test-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .test-btn {
            padding: 1rem 2rem;
            border: none;
            border-radius: 0.5rem;
            font-size: 1.4rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: capitalize;
        }

        .test-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
        }

        .btn-primary {
            background: var(--yellow);
            color: var(--white);
        }

        .btn-success {
            background: var(--success);
            color: var(--white);
        }

        .btn-error {
            background: var(--error);
            color: var(--white);
        }

        .btn-warning {
            background: var(--warning);
            color: var(--white);
        }

        .console-output {
            background: #1e1e1e;
            color: #00ff00;
            padding: 2rem;
            border-radius: 0.5rem;
            font-family: 'Courier New', monospace;
            font-size: 1.2rem;
            min-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
            margin-top: 1rem;
        }

        .status {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 2rem;
            font-size: 1.2rem;
            font-weight: 600;
            margin: 0.5rem;
        }

        .status.success {
            background: var(--success);
            color: var(--white);
        }

        .status.error {
            background: var(--error);
            color: var(--white);
        }

        .status.warning {
            background: var(--warning);
            color: var(--white);
        }

        .results-summary {
            background: var(--white);
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: var(--box-shadow);
            text-align: center;
        }

        .clear-btn {
            background: var(--black);
            color: var(--white);
            padding: 1rem 2rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1.4rem;
            margin-top: 1rem;
        }

        .clear-btn:hover {
            background: var(--light-color);
        }

        .loading {
            color: var(--warning);
        }

        .module-status {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }

        .module-indicator {
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-size: 1.2rem;
            font-weight: 500;
        }

        .module-loaded {
            background: var(--success);
            color: var(--white);
        }

        .module-error {
            background: var(--error);
            color: var(--white);
        }

        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }
            
            .test-buttons {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }

            .module-status {
                flex-direction: column;
            }
        }
      `}</style>

      {/* HTML del body inyectado sin modificaciones usando dangerouslySetInnerHTML */}
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />

      {/* Scripts de modelos de patrones de diseño (deben estar en public/models/) */}
      <Script src="/models/factory_pattern.js" strategy="beforeInteractive" />
      <Script src="/models/observer_pattern.js" strategy="beforeInteractive" />
      <Script src="/models/proxy_pattern.js" strategy="beforeInteractive" />
      <Script src="/controllers/pruebas/patrones-tests.js" strategy="beforeInteractive" />

      {/* Script de pruebas de patrones extraído del HTML original (sin modificaciones) */}
      <Script src="/js/admin-tests.js" strategy="afterInteractive" />
    </>
  );
}