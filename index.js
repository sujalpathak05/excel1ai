
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const papa = require('papaparse');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Database initialization
const db = new sqlite3.Database('./excel_automation.db');

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        operations TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        schedule TEXT,
        template_id INTEGER,
        user_id INTEGER,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(template_id) REFERENCES templates(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [adminPassword]);
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
        }
    }
});

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Registration failed' });
            }
            res.json({ message: 'User registered successfully', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
});

// File upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();
        let data = [];

        if (ext === '.csv') {
            const csvData = fs.readFileSync(filePath, 'utf8');
            const parsed = papa.parse(csvData, { header: true, skipEmptyLines: true });
            data = parsed.data;
        } else {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
        }

        res.json({
            message: 'File uploaded successfully',
            filename: req.file.filename,
            originalName: req.file.originalname,
            data: data.slice(0, 100), // Return first 100 rows for preview
            totalRows: data.length,
            columns: data.length > 0 ? Object.keys(data[0]) : []
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// Data processing routes
app.post('/api/process', authenticateToken, (req, res) => {
    try {
        const { filename, operations } = req.body;
        const filePath = path.join(uploadsDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const ext = path.extname(filename).toLowerCase();
        let data = [];

        // Read file
        if (ext === '.csv') {
            const csvData = fs.readFileSync(filePath, 'utf8');
            const parsed = papa.parse(csvData, { header: true, skipEmptyLines: true });
            data = parsed.data;
        } else {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
        }

        // Apply operations
        operations.forEach(operation => {
            switch (operation.type) {
                case 'removeDuplicates':
                    data = removeDuplicates(data, operation.columns);
                    break;
                case 'trimSpaces':
                    data = trimSpaces(data, operation.columns);
                    break;
                case 'changeCase':
                    data = changeCase(data, operation.columns, operation.caseType);
                    break;
                case 'findReplace':
                    data = findReplace(data, operation.column, operation.find, operation.replace);
                    break;
                case 'filterData':
                    data = filterData(data, operation.column, operation.value, operation.operator);
                    break;
                case 'sortData':
                    data = sortData(data, operation.column, operation.direction);
                    break;
            }
        });

        res.json({
            message: 'Data processed successfully',
            data: data.slice(0, 100),
            totalRows: data.length,
            processedData: data
        });
    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: 'Failed to process data' });
    }
});

// Export routes
app.post('/api/export', authenticateToken, (req, res) => {
    try {
        const { data, format, filename } = req.body;
        const outputFilename = `exported_${Date.now()}.${format}`;
        const outputPath = path.join(uploadsDir, outputFilename);

        if (format === 'csv') {
            const csv = papa.unparse(data);
            fs.writeFileSync(outputPath, csv);
        } else if (format === 'xlsx' || format === 'xls') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
            XLSX.writeFile(workbook, outputPath);
        }

        res.json({
            message: 'File exported successfully',
            downloadUrl: `/api/download/${outputFilename}`
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export file' });
    }
});

// Download route
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Template routes
app.post('/api/templates', authenticateToken, (req, res) => {
    const { name, operations } = req.body;
    const operationsJson = JSON.stringify(operations);
    
    db.run('INSERT INTO templates (name, operations, user_id) VALUES (?, ?, ?)', 
        [name, operationsJson, req.user.userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to save template' });
        }
        res.json({ message: 'Template saved successfully', id: this.lastID });
    });
});

app.get('/api/templates', authenticateToken, (req, res) => {
    db.all('SELECT * FROM templates WHERE user_id = ?', [req.user.userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch templates' });
        }
        const templates = rows.map(row => ({
            ...row,
            operations: JSON.parse(row.operations)
        }));
        res.json(templates);
    });
});

// Analytics route
app.post('/api/analytics', authenticateToken, (req, res) => {
    try {
        const { data, analysisType } = req.body;
        let result = {};

        switch (analysisType) {
            case 'summary':
                result = generateSummary(data);
                break;
            case 'pivot':
                result = generatePivotTable(data, req.body.pivotConfig);
                break;
            case 'groupBy':
                result = groupByAnalysis(data, req.body.groupColumn, req.body.aggregateColumn, req.body.operation);
                break;
        }

        res.json(result);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to perform analysis' });
    }
});

// Helper functions
function removeDuplicates(data, columns) {
    const seen = new Set();
    return data.filter(row => {
        const key = columns.map(col => row[col]).join('|');
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function trimSpaces(data, columns) {
    return data.map(row => {
        const newRow = { ...row };
        columns.forEach(col => {
            if (typeof newRow[col] === 'string') {
                newRow[col] = newRow[col].trim();
            }
        });
        return newRow;
    });
}

function changeCase(data, columns, caseType) {
    return data.map(row => {
        const newRow = { ...row };
        columns.forEach(col => {
            if (typeof newRow[col] === 'string') {
                newRow[col] = caseType === 'upper' ? newRow[col].toUpperCase() : newRow[col].toLowerCase();
            }
        });
        return newRow;
    });
}

function findReplace(data, column, find, replace) {
    return data.map(row => {
        const newRow = { ...row };
        if (typeof newRow[column] === 'string') {
            newRow[column] = newRow[column].replace(new RegExp(find, 'g'), replace);
        }
        return newRow;
    });
}

function filterData(data, column, value, operator) {
    return data.filter(row => {
        const cellValue = row[column];
        switch (operator) {
            case 'equals':
                return cellValue == value;
            case 'contains':
                return String(cellValue).includes(value);
            case 'greater':
                return Number(cellValue) > Number(value);
            case 'less':
                return Number(cellValue) < Number(value);
            default:
                return true;
        }
    });
}

function sortData(data, column, direction) {
    return data.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        
        if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

function generateSummary(data) {
    if (data.length === 0) return {};
    
    const columns = Object.keys(data[0]);
    const summary = {};
    
    columns.forEach(col => {
        const values = data.map(row => row[col]).filter(val => val !== null && val !== undefined && val !== '');
        const numericValues = values.filter(val => !isNaN(val) && val !== '').map(Number);
        
        summary[col] = {
            count: values.length,
            unique: new Set(values).size,
            nullCount: data.length - values.length
        };
        
        if (numericValues.length > 0) {
            summary[col].min = Math.min(...numericValues);
            summary[col].max = Math.max(...numericValues);
            summary[col].avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            summary[col].sum = numericValues.reduce((a, b) => a + b, 0);
        }
    });
    
    return summary;
}

function generatePivotTable(data, config) {
    const { rows, columns, values, aggregation } = config;
    const pivot = {};
    
    data.forEach(row => {
        const rowKey = rows.map(r => row[r]).join('|');
        const colKey = columns.map(c => row[c]).join('|');
        
        if (!pivot[rowKey]) pivot[rowKey] = {};
        if (!pivot[rowKey][colKey]) pivot[rowKey][colKey] = [];
        
        values.forEach(val => {
            pivot[rowKey][colKey].push(Number(row[val]) || 0);
        });
    });
    
    // Apply aggregation
    Object.keys(pivot).forEach(rowKey => {
        Object.keys(pivot[rowKey]).forEach(colKey => {
            const vals = pivot[rowKey][colKey];
            switch (aggregation) {
                case 'sum':
                    pivot[rowKey][colKey] = vals.reduce((a, b) => a + b, 0);
                    break;
                case 'avg':
                    pivot[rowKey][colKey] = vals.reduce((a, b) => a + b, 0) / vals.length;
                    break;
                case 'count':
                    pivot[rowKey][colKey] = vals.length;
                    break;
                case 'min':
                    pivot[rowKey][colKey] = Math.min(...vals);
                    break;
                case 'max':
                    pivot[rowKey][colKey] = Math.max(...vals);
                    break;
                default:
                    pivot[rowKey][colKey] = vals.length;
            }
        });
    });
    
    return pivot;
}

function groupByAnalysis(data, groupColumn, aggregateColumn, operation) {
    const groups = {};
    
    data.forEach(row => {
        const groupKey = row[groupColumn];
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(Number(row[aggregateColumn]) || 0);
    });
    
    const result = {};
    Object.keys(groups).forEach(key => {
        const values = groups[key];
        switch (operation) {
            case 'sum':
                result[key] = values.reduce((a, b) => a + b, 0);
                break;
            case 'avg':
                result[key] = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case 'count':
                result[key] = values.length;
                break;
            case 'min':
                result[key] = Math.min(...values);
                break;
            case 'max':
                result[key] = Math.max(...values);
                break;
        }
    });
    
    return result;
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Excel Automation Server running on http://0.0.0.0:${PORT}`);
});
