// Variables globales para el sistema contable
let accountingData = {
    transactions: [],
    income: {
        installations: [],
        monthly: []
    },
    expenses: {
        equipment: [],
        payroll: [],
        operational: []
    },
    reports: [],
    closings: []
};

// Función para mostrar secciones
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionId).classList.add('active');
    
    // Activar el botón correspondiente
    event.target.classList.add('active');
}

// Función para generar ID único
function generateId() {
    return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Función para mostrar alertas
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
    
    const container = document.querySelector('.accounting-container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Función para actualizar totales
function updateTotals() {
    // Calcular totales de ingresos
    const installationTotal = accountingData.income.installations.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const monthlyTotal = accountingData.income.monthly.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalIncome = installationTotal + monthlyTotal;

    // Calcular totales de gastos
    const equipmentTotal = accountingData.expenses.equipment.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const payrollTotal = accountingData.expenses.payroll.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const operationalTotal = accountingData.expenses.operational.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalExpenses = equipmentTotal + payrollTotal + operationalTotal;

    // Actualizar elementos en el DOM
    document.getElementById('installationTotal').textContent = `$${installationTotal.toLocaleString()}`;
    document.getElementById('monthlyTotal').textContent = `$${monthlyTotal.toLocaleString()}`;
    document.getElementById('totalIncome').textContent = `$${totalIncome.toLocaleString()}`;
    document.getElementById('equipmentTotal').textContent = `$${equipmentTotal.toLocaleString()}`;
    document.getElementById('payrollTotal').textContent = `$${payrollTotal.toLocaleString()}`;
    document.getElementById('operationalTotal').textContent = `$${operationalTotal.toLocaleString()}`;
    document.getElementById('totalExpenses').textContent = `$${totalExpenses.toLocaleString()}`;
}

// Función para actualizar tabla de transacciones
function updateTransactionsTable() {
    const tbody = document.getElementById('transactionsTable');
    tbody.innerHTML = '';
    
    accountingData.transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.transactionType}</td>
            <td>$${parseFloat(transaction.transactionAmount).toLocaleString()}</td>
            <td>${new Date(transaction.transactionDate).toLocaleDateString()}</td>
            <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
            <td>
                <button class="btn-secondary" onclick="processTransaction('${transaction.id}')">
                    <i class="fas fa-cog"></i> Procesar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Función para procesar transacción
function processTransaction(transactionId) {
    const transaction = accountingData.transactions.find(t => t.id === transactionId);
    if (transaction) {
        transaction.status = 'completado';
        updateTransactionsTable();
        showAlert('Transacción procesada correctamente', 'success');
    }
}

// Función para generar reportes
function generateReport(reportData) {
    const reportDisplay = document.getElementById('reportDisplay');
    const reportContent = document.getElementById('reportContent');
    
    let reportHTML = `
        <div class="workflow-step">
            <h4>Reporte: ${reportData.reportType}</h4>
            <p>Período: ${reportData.reportPeriod}</p>
            <p>Generado el: ${new Date().toLocaleString()}</p>
        </div>
    `;
    
    switch (reportData.reportType) {
        case 'ingresos':
            const totalIncome = accountingData.income.installations.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) +
                             accountingData.income.monthly.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            reportHTML += `
                <div class="summary-cards">
                    <div class="summary-card">
                        <h3>Total Ingresos</h3>
                        <div class="amount">$${totalIncome.toLocaleString()}</div>
                    </div>
                </div>
            `;
            break;
        case 'gastos':
            const totalExpenses = accountingData.expenses.equipment.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) +
                                 accountingData.expenses.payroll.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) +
                                 accountingData.expenses.operational.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            reportHTML += `
                <div class="summary-cards">
                    <div class="summary-card">
                        <h3>Total Gastos</h3>
                        <div class="amount">$${totalExpenses.toLocaleString()}</div>
                    </div>
                </div>
            `;
            break;
        case 'completo':
            const totalIncomeComplete = accountingData.income.installations.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) +
                                       accountingData.income.monthly.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            const totalExpensesComplete = accountingData.expenses.equipment.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) +
                                         accountingData.expenses.payroll.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) +
                                         accountingData.expenses.operational.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            reportHTML += `
                <div class="summary-cards">
                    <div class="summary-card">
                        <h3>Resumen Completo</h3>
                        <div class="amount">$${(totalIncomeComplete - totalExpensesComplete).toLocaleString()}</div>
                        <div class="label">Resultado Neto</div>
                    </div>
                </div>
            `;
            break;
    }
    
    reportContent.innerHTML = reportHTML;
    reportDisplay.style.display = 'block';
}

// Inicializar datos de ejemplo
function initializeSampleData() {
    // Datos de ejemplo para demostración
    accountingData.income.installations.push({
        id: generateId(),
        installationNumber: 'INST-001',
        receiptNumber: 'REC-001',
        amount: 150000,
        date: '2024-01-15',
        createdAt: new Date().toISOString()
    });
    
    accountingData.income.monthly.push({
        id: generateId(),
        clientBillingNumber: 'CLI-001',
        invoiceNumber: 'INV-001',
        invoiceRegistrationNumber: 'REG-001',
        amount: 50000,
        createdAt: new Date().toISOString()
    });
    
    updateTotals();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Generar ID de transacción automáticamente
    document.getElementById('transactionId').value = generateId();
    
    // Establecer fecha actual
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
    document.getElementById('installationDate').value = today;
    
    // Mostrar/ocultar período personalizado
    document.getElementById('reportPeriod').addEventListener('change', function() {
        const customPeriod = document.getElementById('customPeriod');
        if (this.value === 'personalizado') {
            customPeriod.style.display = 'block';
        } else {
            customPeriod.style.display = 'none';
        }
    });


    // Formulario de transacciones
    document.getElementById('transactionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const transactionData = Object.fromEntries(formData);
        
        transactionData.id = generateId();
        transactionData.status = 'pendiente';
        transactionData.createdAt = new Date().toISOString();
        
        accountingData.transactions.push(transactionData);
        updateTransactionsTable();
        showAlert('Transacción registrada correctamente', 'success');
        this.reset();
        document.getElementById('transactionId').value = generateId();
    });

    // Formulario de pagos de instalación
    document.getElementById('installationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const installationData = Object.fromEntries(formData);
        
        installationData.id = generateId();
        installationData.createdAt = new Date().toISOString();
        
        accountingData.income.installations.push(installationData);
        updateTotals();
        showAlert('Pago de instalación registrado correctamente', 'success');
        this.reset();
    });

    // Formulario de mensualidades
    document.getElementById('monthlyForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const monthlyData = Object.fromEntries(formData);
        
        monthlyData.id = generateId();
        monthlyData.createdAt = new Date().toISOString();
        
        accountingData.income.monthly.push(monthlyData);
        updateTotals();
        showAlert('Mensualidad registrada correctamente', 'success');
        this.reset();
    });

    // Formulario de equipos
    document.getElementById('equipmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const equipmentData = Object.fromEntries(formData);
        
        equipmentData.id = generateId();
        equipmentData.createdAt = new Date().toISOString();
        
        accountingData.expenses.equipment.push(equipmentData);
        updateTotals();
        showAlert('Compra de equipos registrada correctamente', 'success');
        this.reset();
    });

    // Formulario de nóminas
    document.getElementById('payrollForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const payrollData = Object.fromEntries(formData);
        
        payrollData.id = generateId();
        payrollData.createdAt = new Date().toISOString();
        
        accountingData.expenses.payroll.push(payrollData);
        updateTotals();
        showAlert('Nómina registrada correctamente', 'success');
        this.reset();
    });

    // Formulario de gastos operativos
    document.getElementById('operationalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const operationalData = Object.fromEntries(formData);
        
        operationalData.id = generateId();
        operationalData.createdAt = new Date().toISOString();
        
        accountingData.expenses.operational.push(operationalData);
        updateTotals();
        showAlert('Gasto operativo registrado correctamente', 'success');
        this.reset();
    });

    // Formulario de reportes
    document.getElementById('reportForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const reportData = Object.fromEntries(formData);
        
        generateReport(reportData);
        showAlert('Reporte generado correctamente', 'success');
    });

    // Formulario de cierres
    document.getElementById('closingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const closingData = Object.fromEntries(formData);
        
        closingData.id = generateId();
        closingData.createdAt = new Date().toISOString();
        closingData.status = 'completado';
        
        accountingData.closings.push(closingData);
        showAlert('Cierre contable realizado correctamente', 'success');
        this.reset();
    });

    // Formulario de declaración de renta
    document.getElementById('taxForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const taxData = Object.fromEntries(formData);
        
        showAlert('Declaración de renta presentada correctamente', 'success');
        this.reset();
    });

    // Formulario de estado financiero
    document.getElementById('financialStatementForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const financialData = Object.fromEntries(formData);
        
        showAlert('Estado financiero elaborado correctamente', 'success');
        this.reset();
    });

    // Inicializar datos de ejemplo
    initializeSampleData();
});
