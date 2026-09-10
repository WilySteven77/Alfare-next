'use client';

import { useState } from 'react';

export default function ContadorPage() {
  const [activeSection, setActiveSection] = useState('transactions');

  const showSection = (sectionId) => {
    setActiveSection(sectionId);
  };

  const [activeTab, setActiveTab] = useState('transactions');

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
    setActiveTab(sectionId);
  };

  return (
    <>
      <link rel="stylesheet" href="/assets/Css/contador.css" />
      <main>
        <div className="accounting-container">
          {/* Header */}
          <div className="accounting-header">
            <h1><span className="logo">Alfa</span>Red - Sistema Contable</h1>
            <p style={{ fontSize: '1.6rem', color: 'var(--light-color)' }}>Gestión Integral de Procesos Contables</p>
            
            {/* Navegación */}
             <div className="accounting-nav">
               <button className={`nav-btn ${activeSection === 'transactions' ? 'active' : ''}`} onClick={() => handleNavClick('transactions')}>
                 <i className="fas fa-exchange-alt"></i> Transacciones
               </button>
               <button className={`nav-btn ${activeSection === 'income' ? 'active' : ''}`} onClick={() => handleNavClick('income')}>
                 <i className="fas fa-arrow-up"></i> Ingresos
               </button>
               <button className={`nav-btn ${activeSection === 'expenses' ? 'active' : ''}`} onClick={() => handleNavClick('expenses')}>
                 <i className="fas fa-arrow-down"></i> Gastos
               </button>
               <button className={`nav-btn ${activeSection === 'reports' ? 'active' : ''}`} onClick={() => handleNavClick('reports')}>
                 <i className="fas fa-chart-bar"></i> Reportes
               </button>
               <button className={`nav-btn ${activeSection === 'closing' ? 'active' : ''}`} onClick={() => handleNavClick('closing')}>
                 <i className="fas fa-lock"></i> Cierres
               </button>
             </div>
          </div>

          {/* Sección: Gestión de Transacciones */}
          <div id="transactions" className={`section ${activeSection === 'transactions' ? 'active' : ''}`}>
            <h2><i className="fas fa-exchange-alt"></i> Gestión de Transacciones</h2>
            
            <div className="workflow-step">
              <h4>Registro y Procesamiento de Transacciones</h4>
              <p>Gestión completa del ciclo de vida de las transacciones contables</p>
            </div>

            <form id="transactionForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="transactionId">ID de Transacción:</label>
                  <input type="text" id="transactionId" name="transactionId" readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="transactionType">Tipo de Transacción:</label>
                  <select id="transactionType" name="transactionType" required>
                    <option value="">Seleccionar tipo</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="gasto">Gasto</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="transactionAmount">Monto:</label>
                  <input type="number" id="transactionAmount" name="transactionAmount" step="0.01" required />
                </div>
                <div className="form-group">
                  <label htmlFor="transactionDate">Fecha:</label>
                  <input type="date" id="transactionDate" name="transactionDate" required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="transactionDescription">Descripción:</label>
                <textarea id="transactionDescription" name="transactionDescription" rows="3"></textarea>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-save"></i> Registrar Transacción
              </button>
            </form>

            {/* Tabla de Transacciones */}
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="transactionsTable">
                {/* Las transacciones se cargarán dinámicamente */}
              </tbody>
            </table>
          </div>

          {/* Sección: Ingresos */}
          <div id="income" className={`section ${activeSection === 'income' ? 'active' : ''}`}>
            <h2><i className="fas fa-arrow-up"></i> Gestión de Ingresos</h2>
            
            <div className="summary-cards">
              <div className="summary-card">
                <h3>Pagos de Instalación</h3>
                <div className="amount" id="installationTotal">$0</div>
                <div className="label">Total del período</div>
              </div>
              <div className="summary-card">
                <h3>Mensualidades</h3>
                <div className="amount" id="monthlyTotal">$0</div>
                <div className="label">Total del período</div>
              </div>
              <div className="summary-card">
                <h3>Total Ingresos</h3>
                <div className="amount" id="totalIncome">$0</div>
                <div className="label">Suma total</div>
              </div>
            </div>

            <div className="workflow-step">
              <h4>Pagos de Instalación</h4>
              <p>Registro de ingresos por servicios de instalación</p>
            </div>

            <form id="installationForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="installationNumber">Número de Instalación:</label>
                  <input type="text" id="installationNumber" name="installationNumber" required />
                </div>
                <div className="form-group">
                  <label htmlFor="receiptNumber">Número de Recibo:</label>
                  <input type="text" id="receiptNumber" name="receiptNumber" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="installationAmount">Monto:</label>
                  <input type="number" id="installationAmount" name="installationAmount" step="0.01" required />
                </div>
                <div className="form-group">
                  <label htmlFor="installationDate">Fecha:</label>
                  <input type="date" id="installationDate" name="installationDate" required />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-plus"></i> Registrar Pago de Instalación
              </button>
            </form>

            <div className="workflow-step">
              <h4>Mensualidades</h4>
              <p>Registro de ingresos por servicios mensuales</p>
            </div>

            <form id="monthlyForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="clientBillingNumber">Número de Facturación del Cliente:</label>
                  <input type="text" id="clientBillingNumber" name="clientBillingNumber" required />
                </div>
                <div className="form-group">
                  <label htmlFor="invoiceNumber">Número de Factura:</label>
                  <input type="text" id="invoiceNumber" name="invoiceNumber" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="invoiceRegistrationNumber">Número de Registro de Factura:</label>
                  <input type="text" id="invoiceRegistrationNumber" name="invoiceRegistrationNumber" required />
                </div>
                <div className="form-group">
                  <label htmlFor="monthlyAmount">Monto:</label>
                  <input type="number" id="monthlyAmount" name="monthlyAmount" step="0.01" required />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-plus"></i> Registrar Mensualidad
              </button>
            </form>
          </div>

          {/* Sección: Gastos */}
          <div id="expenses" className={`section ${activeSection === 'expenses' ? 'active' : ''}`}>
            <h2><i className="fas fa-arrow-down"></i> Gestión de Gastos</h2>
            
            <div className="summary-cards">
              <div className="summary-card">
                <h3>Compra de Equipos</h3>
                <div className="amount" id="equipmentTotal">$0</div>
                <div className="label">Total del período</div>
              </div>
              <div className="summary-card">
                <h3>Nóminas</h3>
                <div className="amount" id="payrollTotal">$0</div>
                <div className="label">Total del período</div>
              </div>
              <div className="summary-card">
                <h3>Gastos Operativos</h3>
                <div className="amount" id="operationalTotal">$0</div>
                <div className="label">Total del período</div>
              </div>
              <div className="summary-card">
                <h3>Total Gastos</h3>
                <div className="amount" id="totalExpenses">$0</div>
                <div className="label">Suma total</div>
              </div>
            </div>

            <div className="workflow-step">
              <h4>Compra de Equipos</h4>
              <p>Registro de gastos por adquisición de equipos</p>
            </div>

            <form id="equipmentForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="purchaseNumber">Número de la Compra:</label>
                  <input type="text" id="purchaseNumber" name="purchaseNumber" required />
                </div>
                <div className="form-group">
                  <label htmlFor="equipmentQuantity">Cantidad de Equipos:</label>
                  <input type="number" id="equipmentQuantity" name="equipmentQuantity" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="equipmentAmount">Monto Total:</label>
                  <input type="number" id="equipmentAmount" name="equipmentAmount" step="0.01" required />
                </div>
                <div className="form-group">
                  <label htmlFor="equipmentPayment">Pago y Registro de Equipos:</label>
                  <select id="equipmentPayment" name="equipmentPayment" required>
                    <option value="">Seleccionar estado</option>
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Pago Parcial</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-plus"></i> Registrar Compra de Equipos
              </button>
            </form>

            <div className="workflow-step">
              <h4>Nóminas</h4>
              <p>Gestión de pagos a empleados</p>
            </div>

            <form id="payrollForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employeeDataRecord">Registro de Datos del Empleado:</label>
                  <input type="text" id="employeeDataRecord" name="employeeDataRecord" required />
                </div>
                <div className="form-group">
                  <label htmlFor="hoursWorked">Número de Horas Trabajadas:</label>
                  <input type="number" id="hoursWorked" name="hoursWorked" step="0.1" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="payrollAmount">Monto de Nómina:</label>
                  <input type="number" id="payrollAmount" name="payrollAmount" step="0.01" required />
                </div>
                <div className="form-group">
                  <label htmlFor="payrollStatus">Estado de Nómina:</label>
                  <select id="payrollStatus" name="payrollStatus" required>
                    <option value="">Seleccionar estado</option>
                    <option value="procesada">Procesada</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagada">Pagada</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-plus"></i> Registrar Nómina
              </button>
            </form>

            <div className="workflow-step">
              <h4>Gastos Operativos</h4>
              <p>Registro de gastos operativos diversos</p>
            </div>

            <form id="operationalForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="operationalType">Tipo de Gasto:</label>
                  <select id="operationalType" name="operationalType" required>
                    <option value="">Seleccionar tipo</option>
                    <option value="cableado">Cableado</option>
                    <option value="combustible">Combustible</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="servicios">Servicios</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="operationalAmount">Monto:</label>
                  <input type="number" id="operationalAmount" name="operationalAmount" step="0.01" required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="operationalDescription">Descripción:</label>
                <textarea id="operationalDescription" name="operationalDescription" rows="3"></textarea>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-plus"></i> Registrar Gasto Operativo
              </button>
            </form>
          </div>

          {/* Sección: Reportes */}
          <div id="reports" className={`section ${activeSection === 'reports' ? 'active' : ''}`}>
            <h2><i className="fas fa-chart-bar"></i> Generación de Reportes Financieros</h2>
            
            <div className="workflow-step">
              <h4>Generar Reportes Financieros</h4>
              <p>Creación de reportes basados en datos contables registrados</p>
            </div>

            <form id="reportForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reportType">Tipo de Reporte:</label>
                  <select id="reportType" name="reportType" required>
                    <option value="">Seleccionar tipo</option>
                    <option value="ingresos">Reporte de Ingresos</option>
                    <option value="gastos">Reporte de Gastos</option>
                    <option value="balance">Balance General</option>
                    <option value="flujo">Flujo de Caja</option>
                    <option value="completo">Reporte Completo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="reportPeriod">Período:</label>
                  <select id="reportPeriod" name="reportPeriod" required>
                    <option value="">Seleccionar período</option>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>
              </div>
              <div className="form-row" id="customPeriod" style={{ display: 'none' }}>
                <div className="form-group">
                  <label htmlFor="startDate">Fecha Inicio:</label>
                  <input type="date" id="startDate" name="startDate" />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">Fecha Fin:</label>
                  <input type="date" id="endDate" name="endDate" />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-file-pdf"></i> Generar Reporte
              </button>
            </form>

            <div id="reportDisplay" style={{ display: 'none' }}>
              <h3>Reporte Generado</h3>
              <div id="reportContent"></div>
            </div>
          </div>

          {/* Sección: Cierres Contables */}
          <div id="closing" className={`section ${activeSection === 'closing' ? 'active' : ''}`}>
            <h2><i className="fas fa-lock"></i> Cierres Contables y Declaraciones</h2>
            
            <div className="workflow-step">
              <h4>Cierres Contables</h4>
              <p>Proceso de cierre contable del período</p>
            </div>

            <form id="closingForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="closingPeriod">Período a Cerrar:</label>
                  <select id="closingPeriod" name="closingPeriod" required>
                    <option value="">Seleccionar período</option>
                    <option value="enero">Enero</option>
                    <option value="febrero">Febrero</option>
                    <option value="marzo">Marzo</option>
                    <option value="abril">Abril</option>
                    <option value="mayo">Mayo</option>
                    <option value="junio">Junio</option>
                    <option value="julio">Julio</option>
                    <option value="agosto">Agosto</option>
                    <option value="septiembre">Septiembre</option>
                    <option value="octubre">Octubre</option>
                    <option value="noviembre">Noviembre</option>
                    <option value="diciembre">Diciembre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="closingYear">Año:</label>
                  <input type="number" id="closingYear" name="closingYear" min="2020" max="2030" required />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-lock"></i> Realizar Cierre Contable
              </button>
            </form>

            <div className="workflow-step">
              <h4>Presentar Declaración de Renta</h4>
              <p>Gestión de declaraciones fiscales</p>
            </div>

            <form id="taxForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="declarationNumber">Número de la Declaración:</label>
                  <input type="text" id="declarationNumber" name="declarationNumber" required />
                </div>
                <div className="form-group">
                  <label htmlFor="taxYear">Año Fiscal:</label>
                  <input type="number" id="taxYear" name="taxYear" min="2020" max="2030" required />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-file-alt"></i> Presentar Declaración
              </button>
            </form>

            <div className="workflow-step">
              <h4>Elaborar Estado Financiero Anual</h4>
              <p>Preparación de estados financieros anuales</p>
            </div>

            <form id="financialStatementForm">
              <div className="form-group">
                <label htmlFor="businessAssets">Activos Empresariales:</label>
                <textarea id="businessAssets" name="businessAssets" rows="5" placeholder="Detalle de activos empresariales..."></textarea>
              </div>
              <button type="submit" className="btn-primary">
                <i className="fas fa-chart-line"></i> Elaborar Estado Financiero
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}