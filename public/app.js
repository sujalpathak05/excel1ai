
class ExcelAutomationApp {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentData = [];
        this.currentFileId = null;
        this.operations = [];
        this.columns = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        if (this.token) {
            this.showMainContent();
            this.loadUserFiles();
            this.loadTemplates();
        } else {
            this.showAuthModal();
        }
    }

    setupEventListeners() {
        // Auth events
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuth(e));
        document.getElementById('auth-switch').addEventListener('click', () => this.toggleAuthMode());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // File upload events
        document.getElementById('file-upload-area').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e));

        // Drag and drop
        const uploadArea = document.getElementById('file-upload-area');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-blue-500');
        });
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-blue-500');
        });
        uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Operation buttons
        document.querySelectorAll('.operation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.showOperationModal(e.target.dataset.operation));
        });

        // Chart buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.createChart(e.target.dataset.chart));
        });

        // Export buttons
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.exportData(e.target.dataset.format));
        });

        // Modal events
        document.getElementById('modal-cancel').addEventListener('click', () => this.hideModal());
        document.getElementById('modal-apply').addEventListener('click', () => this.applyOperation());

        // Save template
        document.getElementById('save-template-btn').addEventListener('click', () => this.saveTemplate());
    }

    async handleAuth(e) {
        e.preventDefault();
        const isLogin = document.getElementById('auth-title').textContent === 'Login';
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const endpoint = isLogin ? '/api/login' : '/api/register';
        const body = isLogin ? { username, password } : { username, email, password };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.showMainContent();
                this.loadUserFiles();
                this.loadTemplates();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Authentication error');
        }
    }

    toggleAuthMode() {
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('auth-submit');
        const switchText = document.getElementById('auth-switch-text');
        const switchBtn = document.getElementById('auth-switch');
        const emailField = document.getElementById('email-field');

        if (title.textContent === 'Login') {
            title.textContent = 'Register';
            submitBtn.textContent = 'Register';
            switchText.textContent = 'Already have an account?';
            switchBtn.textContent = 'Login';
            emailField.classList.remove('hidden');
        } else {
            title.textContent = 'Login';
            submitBtn.textContent = 'Login';
            switchText.textContent = "Don't have an account?";
            switchBtn.textContent = 'Register';
            emailField.classList.add('hidden');
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.showAuthModal();
    }

    showAuthModal() {
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.getElementById('nav-links').classList.add('hidden');
    }

    showMainContent() {
        document.getElementById('auth-modal').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('nav-links').classList.remove('hidden');
    }

    handleFileDrop(e) {
        e.preventDefault();
        const uploadArea = document.getElementById('file-upload-area');
        uploadArea.classList.remove('border-blue-500');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                this.currentData = data.data;
                this.currentFileId = data.fileId;
                this.columns = data.columns;
                this.displayData(data.data);
                this.showDataPreview();
                this.showOperationsPanel();
                this.loadUserFiles();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Upload error');
        }
    }

    displayData(data) {
        if (data.length === 0) return;

        const thead = document.getElementById('table-head');
        const tbody = document.getElementById('table-body');
        const rowCount = document.getElementById('row-count');

        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Create header
        const headerRow = document.createElement('tr');
        Object.keys(data[0]).forEach(key => {
            const th = document.createElement('th');
            th.className = 'px-4 py-2 text-left font-semibold text-gray-700';
            th.textContent = key;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create rows (limit to first 10 for display)
        const displayData = data.slice(0, 10);
        displayData.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            Object.values(row).forEach(value => {
                const td = document.createElement('td');
                td.className = 'px-4 py-2 text-gray-600';
                td.textContent = value || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        rowCount.textContent = `Showing ${displayData.length} of ${data.length} rows`;
    }

    showDataPreview() {
        document.getElementById('data-preview').classList.remove('hidden');
    }

    showOperationsPanel() {
        document.getElementById('operations-panel').classList.remove('hidden');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active', 'border-blue-500');
            }
        });

        // Show/hide tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    }

    showOperationModal(operation) {
        const modal = document.getElementById('operation-modal');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');

        title.textContent = this.getOperationTitle(operation);
        content.innerHTML = this.getOperationForm(operation);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.dataset.operation = operation;
    }

    getOperationTitle(operation) {
        const titles = {
            'removeDuplicates': 'Remove Duplicates',
            'trimSpaces': 'Trim Spaces',
            'changeCase': 'Change Case',
            'findReplace': 'Find & Replace',
            'filter': 'Filter Data',
            'sort': 'Sort Data',
            'pivot': 'Create Pivot Table'
        };
        return titles[operation] || operation;
    }

    getOperationForm(operation) {
        switch (operation) {
            case 'changeCase':
                return `
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Column:</label>
                        <select id="case-column" class="w-full p-2 border rounded">
                            ${this.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Case Type:</label>
                        <select id="case-type" class="w-full p-2 border rounded">
                            <option value="upper">UPPERCASE</option>
                            <option value="lower">lowercase</option>
                        </select>
                    </div>
                `;

            case 'findReplace':
                return `
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Column:</label>
                        <select id="fr-column" class="w-full p-2 border rounded">
                            ${this.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Find:</label>
                        <input type="text" id="find-text" class="w-full p-2 border rounded">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Replace with:</label>
                        <input type="text" id="replace-text" class="w-full p-2 border rounded">
                    </div>
                `;

            case 'filter':
                return `
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Column:</label>
                        <select id="filter-column" class="w-full p-2 border rounded">
                            ${this.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Operator:</label>
                        <select id="filter-operator" class="w-full p-2 border rounded">
                            <option value="equals">Equals</option>
                            <option value="contains">Contains</option>
                            <option value="greaterThan">Greater Than</option>
                            <option value="lessThan">Less Than</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Value:</label>
                        <input type="text" id="filter-value" class="w-full p-2 border rounded">
                    </div>
                `;

            case 'sort':
                return `
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Column:</label>
                        <select id="sort-column" class="w-full p-2 border rounded">
                            ${this.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Direction:</label>
                        <select id="sort-direction" class="w-full p-2 border rounded">
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                    </div>
                `;

            case 'pivot':
                return `
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Row Fields:</label>
                        <select id="pivot-rows" multiple class="w-full p-2 border rounded">
                            ${this.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Column Fields:</label>
                        <select id="pivot-columns" multiple class="w-full p-2 border rounded">
                            ${this.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Value Fields:</label>
                        <select id="pivot-values" multiple class="w-full p-2 border rounded">
                            ${this.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Aggregation:</label>
                        <select id="pivot-aggregation" class="w-full p-2 border rounded">
                            <option value="sum">Sum</option>
                            <option value="average">Average</option>
                            <option value="count">Count</option>
                            <option value="min">Minimum</option>
                            <option value="max">Maximum</option>
                        </select>
                    </div>
                `;

            default:
                return '<p>No additional parameters required.</p>';
        }
    }

    hideModal() {
        const modal = document.getElementById('operation-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async applyOperation() {
        const modal = document.getElementById('operation-modal');
        const operation = modal.dataset.operation;
        const operationData = this.getOperationData(operation);

        this.operations.push(operationData);

        try {
            const response = await fetch('/api/transform', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    fileId: this.currentFileId,
                    operations: this.operations
                })
            });

            const data = await response.json();
            if (response.ok) {
                this.currentData = data.transformedData;
                this.displayData(data.data);
                this.hideModal();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Operation error');
        }
    }

    getOperationData(operation) {
        const base = { type: operation };

        switch (operation) {
            case 'changeCase':
                return {
                    ...base,
                    column: document.getElementById('case-column').value,
                    caseType: document.getElementById('case-type').value
                };

            case 'findReplace':
                return {
                    ...base,
                    column: document.getElementById('fr-column').value,
                    find: document.getElementById('find-text').value,
                    replace: document.getElementById('replace-text').value
                };

            case 'filter':
                return {
                    ...base,
                    column: document.getElementById('filter-column').value,
                    operator: document.getElementById('filter-operator').value,
                    value: document.getElementById('filter-value').value
                };

            case 'sort':
                return {
                    ...base,
                    column: document.getElementById('sort-column').value,
                    direction: document.getElementById('sort-direction').value
                };

            default:
                return base;
        }
    }

    createChart(chartType) {
        if (this.currentData.length === 0) {
            alert('No data available for chart');
            return;
        }

        const canvas = document.getElementById('chart-canvas');
        canvas.classList.remove('hidden');

        // Get numeric columns for chart data
        const numericColumns = this.columns.filter(col => {
            return this.currentData.some(row => !isNaN(parseFloat(row[col])));
        });

        if (numericColumns.length === 0) {
            alert('No numeric data available for chart');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Clear existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = this.currentData.slice(0, 10).map((row, index) => `Row ${index + 1}`);
        const data = {
            labels: labels,
            datasets: [{
                label: numericColumns[0],
                data: this.currentData.slice(0, 10).map(row => parseFloat(row[numericColumns[0]]) || 0),
                backgroundColor: this.getChartColors(chartType),
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        };

        this.chart = new Chart(ctx, {
            type: chartType,
            data: data,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`
                    }
                }
            }
        });
    }

    getChartColors(chartType) {
        const colors = [
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(6, 182, 212, 0.8)',
            'rgba(245, 101, 101, 0.8)',
            'rgba(139, 69, 19, 0.8)',
            'rgba(255, 20, 147, 0.8)',
            'rgba(0, 191, 255, 0.8)'
        ];

        return chartType === 'pie' ? colors : colors[0];
    }

    async exportData(format) {
        if (this.currentData.length === 0) {
            alert('No data to export');
            return;
        }

        const filename = `export_${Date.now()}`;

        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    data: this.currentData,
                    format: format,
                    filename: filename
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Export error');
            }
        } catch (error) {
            alert('Export error');
        }
    }

    async saveTemplate() {
        if (this.operations.length === 0) {
            alert('No operations to save');
            return;
        }

        const name = prompt('Enter template name:');
        if (!name) return;

        try {
            const response = await fetch('/api/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    name: name,
                    operations: this.operations
                })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Template saved successfully');
                this.loadTemplates();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Save error');
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const templates = await response.json();
            if (response.ok) {
                this.displayTemplates(templates);
            }
        } catch (error) {
            console.error('Error loading templates');
        }
    }

    displayTemplates(templates) {
        const container = document.getElementById('templates-list');
        container.innerHTML = '';

        if (templates.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No saved templates</p>';
            return;
        }

        templates.forEach(template => {
            const div = document.createElement('div');
            div.className = 'bg-gray-50 p-4 rounded-lg';
            div.innerHTML = `
                <h3 class="font-semibold">${template.name}</h3>
                <p class="text-sm text-gray-600">${template.operations.length} operations</p>
                <p class="text-xs text-gray-500">${new Date(template.created_at).toLocaleDateString()}</p>
                <button class="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600" 
                        onclick="app.applyTemplate(${template.id})">
                    Apply Template
                </button>
            `;
            container.appendChild(div);
        });
    }

    async loadUserFiles() {
        try {
            const response = await fetch('/api/files', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const files = await response.json();
            if (response.ok) {
                this.displayFiles(files);
            }
        } catch (error) {
            console.error('Error loading files');
        }
    }

    displayFiles(files) {
        const container = document.getElementById('files-list');
        container.innerHTML = '';

        if (files.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No files uploaded</p>';
            return;
        }

        files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded';
            div.innerHTML = `
                <div>
                    <span class="font-medium">${file.original_name}</span>
                    <span class="text-sm text-gray-500 ml-2">${file.file_type}</span>
                </div>
                <span class="text-xs text-gray-500">${new Date(file.uploaded_at).toLocaleDateString()}</span>
            `;
            container.appendChild(div);
        });
    }
}

// Initialize the app
const app = new ExcelAutomationApp();
