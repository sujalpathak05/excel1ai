
// Global variables
let currentData = [];
let originalData = [];
let currentFilename = '';
let operationsQueue = [];
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentChart = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    if (authToken) {
        showMainApp();
        loadUserInfo();
    }
    
    setupEventListeners();
    loadTemplates();
});

// Setup event listeners
function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = document.getElementById('fileUploadArea');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect();
        }
    });
    
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showAlert('Login successful!', 'success');
            showMainApp();
            loadUserInfo();
        } else {
            showAlert(data.error, 'error');
        }
    } catch (error) {
        showAlert('Login failed. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success');
            showTab('login');
        } else {
            showAlert(data.error, 'error');
        }
    } catch (error) {
        showAlert('Registration failed. Please try again.', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('userInfo').classList.add('hidden');
    showAlert('Logged out successfully!', 'info');
}

function loadUserInfo() {
    if (currentUser) {
        document.getElementById('usernameDisplay').textContent = `Welcome, ${currentUser.username}`;
        document.getElementById('userInfo').classList.remove('hidden');
    }
}

function showMainApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
}

// Tab functions
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function showAnalyticsTab(tabName) {
    document.querySelectorAll('#analyticsCard .tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#analyticsCard .tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// File handling functions
async function handleFileSelect() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading('Uploading and processing file...');
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentData = data.data;
            originalData = [...data.data];
            currentFilename = data.filename;
            
            showAlert(`File uploaded successfully! ${data.totalRows} rows loaded.`, 'success');
            displayData(currentData);
            setupOperationColumns(data.columns);
            showDataCards();
            generateStats(currentData);
        } else {
            showAlert(data.error, 'error');
        }
    } catch (error) {
        showAlert('Failed to upload file. Please try again.', 'error');
    }
    
    hideLoading();
}

function displayData(data) {
    if (data.length === 0) {
        document.getElementById('dataTableContainer').innerHTML = '<p>No data to display</p>';
        return;
    }
    
    const columns = Object.keys(data[0]);
    let tableHTML = '<table><thead><tr>';
    
    columns.forEach(col => {
        tableHTML += `<th>${col}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    data.slice(0, 50).forEach(row => {
        tableHTML += '<tr>';
        columns.forEach(col => {
            tableHTML += `<td>${row[col] || ''}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    
    if (data.length > 50) {
        tableHTML += `<p style="margin-top: 10px; color: #666;">Showing first 50 rows of ${data.length} total rows</p>`;
    }
    
    document.getElementById('dataTableContainer').innerHTML = tableHTML;
}

function setupOperationColumns(columns) {
    const containers = [
        'duplicateColumns', 'trimColumns', 'caseColumns'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        columns.forEach(col => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="${containerId}_${col}" value="${col}">
                <label for="${containerId}_${col}">${col}</label>
            `;
            container.appendChild(div);
        });
    });
    
    // Setup select dropdowns
    const selects = ['findReplaceColumn', 'filterColumn', 'sortColumn', 'pivotRows', 'pivotColumns', 'pivotValues'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select column</option>';
            columns.forEach(col => {
                select.innerHTML += `<option value="${col}">${col}</option>`;
            });
        }
    });
}

function showDataCards() {
    document.getElementById('dataPreviewCard').classList.remove('hidden');
    document.getElementById('operationsCard').classList.remove('hidden');
    document.getElementById('analyticsCard').classList.remove('hidden');
    document.getElementById('exportCard').classList.remove('hidden');
}

// Operations functions
function addOperation(type) {
    let operation = { type };
    
    switch (type) {
        case 'removeDuplicates':
            const duplicateCols = getCheckedColumns('duplicateColumns');
            if (duplicateCols.length === 0) {
                showAlert('Please select at least one column for duplicate checking.', 'error');
                return;
            }
            operation.columns = duplicateCols;
            break;
            
        case 'trimSpaces':
            const trimCols = getCheckedColumns('trimColumns');
            if (trimCols.length === 0) {
                showAlert('Please select at least one column to trim.', 'error');
                return;
            }
            operation.columns = trimCols;
            break;
            
        case 'changeCase':
            const caseCols = getCheckedColumns('caseColumns');
            if (caseCols.length === 0) {
                showAlert('Please select at least one column for case change.', 'error');
                return;
            }
            operation.columns = caseCols;
            operation.caseType = document.getElementById('caseType').value;
            break;
            
        case 'findReplace':
            const findCol = document.getElementById('findReplaceColumn').value;
            const findText = document.getElementById('findText').value;
            const replaceText = document.getElementById('replaceText').value;
            
            if (!findCol || !findText) {
                showAlert('Please select column and enter find text.', 'error');
                return;
            }
            
            operation.column = findCol;
            operation.find = findText;
            operation.replace = replaceText;
            break;
            
        case 'filterData':
            const filterCol = document.getElementById('filterColumn').value;
            const filterOp = document.getElementById('filterOperator').value;
            const filterVal = document.getElementById('filterValue').value;
            
            if (!filterCol || !filterVal) {
                showAlert('Please select column and enter filter value.', 'error');
                return;
            }
            
            operation.column = filterCol;
            operation.operator = filterOp;
            operation.value = filterVal;
            break;
            
        case 'sortData':
            const sortCol = document.getElementById('sortColumn').value;
            const sortDir = document.getElementById('sortDirection').value;
            
            if (!sortCol) {
                showAlert('Please select a column to sort.', 'error');
                return;
            }
            
            operation.column = sortCol;
            operation.direction = sortDir;
            break;
    }
    
    operationsQueue.push(operation);
    updateOperationsQueue();
    showAlert('Operation added to queue!', 'success');
}

function getCheckedColumns(containerId) {
    const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateOperationsQueue() {
    const container = document.getElementById('operationsQueue');
    
    if (operationsQueue.length === 0) {
        container.innerHTML = '<p>No operations in queue</p>';
        return;
    }
    
    let html = '<div style="background: #f7fafc; padding: 15px; border-radius: 8px;">';
    operationsQueue.forEach((op, index) => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; margin: 5px 0; border-radius: 6px;">`;
        html += `<span><strong>${op.type}</strong> - ${getOperationDescription(op)}</span>`;
        html += `<button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="removeOperation(${index})">Remove</button>`;
        html += '</div>';
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function getOperationDescription(op) {
    switch (op.type) {
        case 'removeDuplicates':
            return `Remove duplicates from: ${op.columns.join(', ')}`;
        case 'trimSpaces':
            return `Trim spaces from: ${op.columns.join(', ')}`;
        case 'changeCase':
            return `Change case to ${op.caseType} for: ${op.columns.join(', ')}`;
        case 'findReplace':
            return `Replace "${op.find}" with "${op.replace}" in ${op.column}`;
        case 'filterData':
            return `Filter ${op.column} ${op.operator} "${op.value}"`;
        case 'sortData':
            return `Sort by ${op.column} (${op.direction})`;
        default:
            return 'Unknown operation';
    }
}

function removeOperation(index) {
    operationsQueue.splice(index, 1);
    updateOperationsQueue();
}

function clearOperations() {
    operationsQueue = [];
    updateOperationsQueue();
    showAlert('Operations queue cleared!', 'info');
}

async function processOperations() {
    if (operationsQueue.length === 0) {
        showAlert('No operations to process!', 'error');
        return;
    }
    
    if (!authToken) {
        showAlert('Please login to process operations.', 'error');
        return;
    }
    
    showLoading('Processing operations...');
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                filename: currentFilename,
                operations: operationsQueue
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentData = data.processedData;
            displayData(currentData);
            generateStats(currentData);
            showAlert(`Operations processed successfully! ${data.totalRows} rows remaining.`, 'success');
            clearOperations();
        } else {
            showAlert(data.error, 'error');
        }
    } catch (error) {
        showAlert('Failed to process operations. Please try again.', 'error');
    }
    
    hideLoading();
}

// Analytics functions
async function generateSummary() {
    if (currentData.length === 0) {
        showAlert('No data to analyze!', 'error');
        return;
    }
    
    if (!authToken) {
        showAlert('Please login to generate analytics.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                data: currentData,
                analysisType: 'summary'
            })
        });
        
        const summary = await response.json();
        
        if (response.ok) {
            displaySummary(summary);
        } else {
            showAlert('Failed to generate summary.', 'error');
        }
    } catch (error) {
        showAlert('Failed to generate summary.', 'error');
    }
}

function displaySummary(summary) {
    const container = document.getElementById('summaryResults');
    let html = '<div style="margin-top: 20px;"><h4>Data Summary</h4>';
    
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">';
    
    Object.keys(summary).forEach(column => {
        const stats = summary[column];
        html += `
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h5 style="margin-bottom: 15px; color: #4a5568;">${column}</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div><strong>Count:</strong> ${stats.count}</div>
                    <div><strong>Unique:</strong> ${stats.unique}</div>
                    <div><strong>Null:</strong> ${stats.nullCount}</div>
                    ${stats.min !== undefined ? `<div><strong>Min:</strong> ${stats.min}</div>` : ''}
                    ${stats.max !== undefined ? `<div><strong>Max:</strong> ${stats.max}</div>` : ''}
                    ${stats.avg !== undefined ? `<div><strong>Avg:</strong> ${stats.avg.toFixed(2)}</div>` : ''}
                    ${stats.sum !== undefined ? `<div><strong>Sum:</strong> ${stats.sum}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
}

async function generatePivot() {
    const rows = Array.from(document.getElementById('pivotRows').selectedOptions).map(o => o.value);
    const columns = Array.from(document.getElementById('pivotColumns').selectedOptions).map(o => o.value);
    const values = Array.from(document.getElementById('pivotValues').selectedOptions).map(o => o.value);
    const aggregation = document.getElementById('pivotAggregation').value;
    
    if (rows.length === 0 || values.length === 0) {
        showAlert('Please select at least one row field and one value field.', 'error');
        return;
    }
    
    if (!authToken) {
        showAlert('Please login to generate pivot tables.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                data: currentData,
                analysisType: 'pivot',
                pivotConfig: { rows, columns, values, aggregation }
            })
        });
        
        const pivot = await response.json();
        
        if (response.ok) {
            displayPivotTable(pivot);
        } else {
            showAlert('Failed to generate pivot table.', 'error');
        }
    } catch (error) {
        showAlert('Failed to generate pivot table.', 'error');
    }
}

function displayPivotTable(pivot) {
    const container = document.getElementById('pivotResults');
    let html = '<div style="margin-top: 20px;"><h4>Pivot Table Results</h4>';
    
    html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
    html += '<thead><tr style="background: #f7fafc;"><th style="padding: 12px; border: 1px solid #e2e8f0;">Row</th>';
    
    // Get all column keys
    const allColumns = new Set();
    Object.values(pivot).forEach(row => {
        Object.keys(row).forEach(col => allColumns.add(col));
    });
    
    allColumns.forEach(col => {
        html += `<th style="padding: 12px; border: 1px solid #e2e8f0;">${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    Object.keys(pivot).forEach(rowKey => {
        html += `<tr><td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">${rowKey}</td>`;
        allColumns.forEach(col => {
            const value = pivot[rowKey][col] || 0;
            html += `<td style="padding: 12px; border: 1px solid #e2e8f0;">${value}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}

function generateChart() {
    if (currentData.length === 0) {
        showAlert('No data to chart!', 'error');
        return;
    }
    
    const chartType = document.getElementById('chartType').value;
    const canvas = document.getElementById('dataChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Prepare data for chart
    const columns = Object.keys(currentData[0]);
    const numericColumns = columns.filter(col => {
        return currentData.some(row => !isNaN(row[col]) && row[col] !== '');
    });
    
    if (numericColumns.length === 0) {
        showAlert('No numeric columns found for charting!', 'error');
        return;
    }
    
    const firstNumCol = numericColumns[0];
    const labels = currentData.slice(0, 10).map((row, index) => `Row ${index + 1}`);
    const data = currentData.slice(0, 10).map(row => Number(row[firstNumCol]) || 0);
    
    const chartConfig = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: firstNumCol,
                data: data,
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
                    '#ffecd2', '#fcb69f'
                ],
                borderColor: '#667eea',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${firstNumCol} Data Visualization`
                }
            }
        }
    };
    
    currentChart = new Chart(ctx, chartConfig);
    showAlert('Chart generated successfully!', 'success');
}

// Export functions
async function exportData(format) {
    if (currentData.length === 0) {
        showAlert('No data to export!', 'error');
        return;
    }
    
    if (!authToken) {
        showAlert('Please login to export data.', 'error');
        return;
    }
    
    showLoading('Exporting data...');
    
    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                data: currentData,
                format: format,
                filename: `exported_data.${format}`
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Export successful!', 'success');
            // Create download link
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = `exported_data.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            showAlert(result.error, 'error');
        }
    } catch (error) {
        showAlert('Export failed. Please try again.', 'error');
    }
    
    hideLoading();
}

function exportPDF() {
    if (currentData.length === 0) {
        showAlert('No data to export!', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Excel Automation Report', 20, 20);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Total Rows: ${currentData.length}`, 20, 40);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);
    
    // Add data preview (first few rows)
    if (currentData.length > 0) {
        const columns = Object.keys(currentData[0]);
        let yPosition = 70;
        
        // Headers
        doc.setFontSize(10);
        columns.slice(0, 5).forEach((col, index) => {
            doc.text(col, 20 + (index * 30), yPosition);
        });
        
        yPosition += 10;
        
        // Data rows (first 20 rows)
        currentData.slice(0, 20).forEach(row => {
            columns.slice(0, 5).forEach((col, index) => {
                const value = String(row[col] || '').substring(0, 15);
                doc.text(value, 20 + (index * 30), yPosition);
            });
            yPosition += 8;
            
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
        });
    }
    
    doc.save('excel_automation_report.pdf');
    showAlert('PDF exported successfully!', 'success');
}

// Template functions
async function saveTemplate() {
    if (operationsQueue.length === 0) {
        showAlert('No operations to save as template!', 'error');
        return;
    }
    
    if (!authToken) {
        showAlert('Please login to save templates.', 'error');
        return;
    }
    
    const name = prompt('Enter template name:');
    if (!name) return;
    
    try {
        const response = await fetch('/api/templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: name,
                operations: operationsQueue
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Template saved successfully!', 'success');
            loadTemplates();
        } else {
            showAlert(result.error, 'error');
        }
    } catch (error) {
        showAlert('Failed to save template.', 'error');
    }
}

async function loadTemplates() {
    if (!authToken) return;
    
    try {
        const response = await fetch('/api/templates', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const templates = await response.json();
        
        if (response.ok) {
            displayTemplates(templates);
        }
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

function displayTemplates(templates) {
    const container = document.getElementById('templatesList');
    
    if (templates.length === 0) {
        container.innerHTML = '<p>No saved templates</p>';
        return;
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    
    templates.forEach(template => {
        html += `
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h4 style="margin-bottom: 10px;">${template.name}</h4>
                <p style="color: #666; margin-bottom: 15px;">${template.operations.length} operations</p>
                <p style="font-size: 12px; color: #999;">Created: ${new Date(template.created_at).toLocaleDateString()}</p>
                <button class="btn btn-info" onclick="loadTemplate(${template.id})" style="margin-top: 10px;">Load Template</button>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function loadTemplate(templateId) {
    // This would load a template's operations into the queue
    // For demo purposes, we'll just show an alert
    showAlert('Template loaded! (Feature would load operations into queue)', 'info');
}

// Utility functions
function generateStats(data) {
    if (data.length === 0) return;
    
    const totalRows = data.length;
    const totalColumns = Object.keys(data[0]).length;
    const completenessRate = calculateCompletenessRate(data);
    
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-number">${totalRows}</div>
            <div class="stat-label">Total Rows</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${totalColumns}</div>
            <div class="stat-label">Total Columns</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${completenessRate}%</div>
            <div class="stat-label">Data Completeness</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${getCurrentDataSize()}</div>
            <div class="stat-label">Data Size</div>
        </div>
    `;
    
    document.getElementById('statsGrid').innerHTML = statsHTML;
}

function calculateCompletenessRate(data) {
    if (data.length === 0) return 0;
    
    const totalCells = data.length * Object.keys(data[0]).length;
    let filledCells = 0;
    
    data.forEach(row => {
        Object.values(row).forEach(value => {
            if (value !== null && value !== undefined && value !== '') {
                filledCells++;
            }
        });
    });
    
    return Math.round((filledCells / totalCells) * 100);
}

function getCurrentDataSize() {
    const dataString = JSON.stringify(currentData);
    const bytes = new Blob([dataString]).size;
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
    // Add new alert
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoading(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}
