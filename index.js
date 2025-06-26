
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database initialization
const db = new sqlite3.Database('excel_automation.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT,
    original_name TEXT,
    file_path TEXT,
    file_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    operations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    template_id INTEGER,
    schedule TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (template_id) REFERENCES templates (id)
  )`);
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'User already exists' });
        }
        const token = jwt.sign({ id: this.lastID, username }, 'your-secret-key');
        res.json({ token, user: { id: this.lastID, username, email } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, 'your-secret-key');
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

// File upload and parsing
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    let data = [];

    if (fileType === '.csv') {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(csvContent, { header: true });
      data = parsed.data;
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    // Save file info to database
    db.run(
      'INSERT INTO files (user_id, filename, original_name, file_path, file_type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.file.filename, req.file.originalname, filePath, fileType],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ 
          fileId: this.lastID, 
          data: data.slice(0, 100), // Send first 100 rows for preview
          totalRows: data.length,
          columns: Object.keys(data[0] || {})
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error processing file' });
  }
});

// Data transformation operations
app.post('/api/transform', authenticateToken, (req, res) => {
  try {
    const { fileId, operations } = req.body;

    db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [fileId, req.user.id], (err, file) => {
      if (err || !file) {
        return res.status(404).json({ error: 'File not found' });
      }

      let data = [];
      const fileType = file.file_type;

      // Read file data
      if (fileType === '.csv') {
        const csvContent = fs.readFileSync(file.file_path, 'utf8');
        const parsed = Papa.parse(csvContent, { header: true });
        data = parsed.data;
      } else {
        const workbook = XLSX.readFile(file.file_path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      // Apply transformations
      operations.forEach(operation => {
        switch (operation.type) {
          case 'removeDuplicates':
            const seen = new Set();
            data = data.filter(row => {
              const key = JSON.stringify(row);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            break;

          case 'trimSpaces':
            data = data.map(row => {
              const newRow = {};
              Object.keys(row).forEach(key => {
                newRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
              });
              return newRow;
            });
            break;

          case 'changeCase':
            const { column, caseType } = operation;
            data = data.map(row => {
              if (row[column] && typeof row[column] === 'string') {
                row[column] = caseType === 'upper' ? row[column].toUpperCase() : row[column].toLowerCase();
              }
              return row;
            });
            break;

          case 'findReplace':
            const { column: findColumn, find, replace } = operation;
            data = data.map(row => {
              if (row[findColumn] && typeof row[findColumn] === 'string') {
                row[findColumn] = row[findColumn].replace(new RegExp(find, 'g'), replace);
              }
              return row;
            });
            break;

          case 'filter':
            const { column: filterColumn, operator, value } = operation;
            data = data.filter(row => {
              const cellValue = row[filterColumn];
              switch (operator) {
                case 'equals': return cellValue == value;
                case 'contains': return cellValue && cellValue.toString().includes(value);
                case 'greaterThan': return parseFloat(cellValue) > parseFloat(value);
                case 'lessThan': return parseFloat(cellValue) < parseFloat(value);
                default: return true;
              }
            });
            break;

          case 'sort':
            const { column: sortColumn, direction } = operation;
            data.sort((a, b) => {
              const aVal = a[sortColumn];
              const bVal = b[sortColumn];
              if (direction === 'desc') {
                return bVal > aVal ? 1 : -1;
              }
              return aVal > bVal ? 1 : -1;
            });
            break;
        }
      });

      res.json({ 
        data: data.slice(0, 100),
        totalRows: data.length,
        transformedData: data
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error transforming data' });
  }
});

// Export data
app.post('/api/export', authenticateToken, (req, res) => {
  try {
    const { data, format, filename } = req.body;

    const exportDir = 'exports/';
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, `${filename}.${format}`);

    switch (format) {
      case 'xlsx':
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, exportPath);
        break;

      case 'csv':
        const csv = Papa.unparse(data);
        fs.writeFileSync(exportPath, csv);
        break;

      default:
        return res.status(400).json({ error: 'Unsupported format' });
    }

    res.download(exportPath, `${filename}.${format}`);
  } catch (error) {
    res.status(500).json({ error: 'Error exporting data' });
  }
});

// Templates
app.post('/api/templates', authenticateToken, (req, res) => {
  const { name, operations } = req.body;

  db.run(
    'INSERT INTO templates (user_id, name, operations) VALUES (?, ?, ?)',
    [req.user.id, name, JSON.stringify(operations)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error saving template' });
      }
      res.json({ id: this.lastID, message: 'Template saved successfully' });
    }
  );
});

app.get('/api/templates', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, templates) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching templates' });
      }
      res.json(templates.map(t => ({
        ...t,
        operations: JSON.parse(t.operations)
      })));
    }
  );
});

// Pivot table generation
app.post('/api/pivot', authenticateToken, (req, res) => {
  try {
    const { data, rows, columns, values, aggregation } = req.body;

    const pivot = {};
    
    data.forEach(row => {
      const rowKey = rows.map(r => row[r]).join(' | ');
      const colKey = columns.map(c => row[c]).join(' | ');
      
      if (!pivot[rowKey]) pivot[rowKey] = {};
      if (!pivot[rowKey][colKey]) pivot[rowKey][colKey] = [];
      
      values.forEach(val => {
        pivot[rowKey][colKey].push(parseFloat(row[val]) || 0);
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
          case 'average':
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
        }
      });
    });

    res.json({ pivotData: pivot });
  } catch (error) {
    res.status(500).json({ error: 'Error generating pivot table' });
  }
});

// API integration
app.post('/api/fetch-external', authenticateToken, async (req, res) => {
  try {
    const { url, method = 'GET', headers = {} } = req.body;
    
    const response = await axios({
      method,
      url,
      headers
    });

    res.json({ data: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching external data' });
  }
});

// Scheduled jobs
app.post('/api/schedule', authenticateToken, (req, res) => {
  const { templateId, schedule } = req.body;

  db.run(
    'INSERT INTO scheduled_jobs (user_id, template_id, schedule) VALUES (?, ?, ?)',
    [req.user.id, templateId, schedule],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error scheduling job' });
      }

      // Setup cron job
      cron.schedule(schedule, () => {
        console.log(`Running scheduled job ${this.lastID}`);
        // Execute template operations here
      });

      res.json({ id: this.lastID, message: 'Job scheduled successfully' });
    }
  );
});

// Get user files
app.get('/api/files', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, filename, original_name, file_type, uploaded_at FROM files WHERE user_id = ? ORDER BY uploaded_at DESC',
    [req.user.id],
    (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching files' });
      }
      res.json(files);
    }
  );
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Excel Automation Server running on port ${PORT}`);
});
