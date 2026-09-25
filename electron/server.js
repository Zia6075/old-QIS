// ============================================
// Queen International School - HR System
// Central LAN Database & Web Server
// ============================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
// Increased to 500mb - large base64 images in backups
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

const PORT = 3000;

// Path to active database file
const BACKUP_FOLDER = 'D:\\HR Backup';
const BACKUP_FILENAME = 'HR_Auto_Backup.json';
const DB_FILENAME = 'hr_database.json';

// Find a stable location for the database
let DB_PATH;
try {
  if (fs.existsSync('D:')) {
    if (!fs.existsSync(BACKUP_FOLDER)) {
      fs.mkdirSync(BACKUP_FOLDER, { recursive: true });
    }
    DB_PATH = path.join(BACKUP_FOLDER, DB_FILENAME);
  } else {
    // Fallback to home directory
    const fallbackDir = path.join(os.homedir(), '.qis_hr_system');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    DB_PATH = path.join(fallbackDir, DB_FILENAME);
  }
} catch (e) {
  DB_PATH = path.join(__dirname, DB_FILENAME);
}

console.log('Central Database path:', DB_PATH);

// Helper to get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const initialDB = {
  employees: [],
  users: [],
  activityLogs: [],
  backupLogs: [],
  cheques: [],
  expenses: []
};

// Read database from file
function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading database:', e);
  }
  return initialDB;
}

// Write database to file
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    
    // Auto Backup to D:\\HR Backup\\HR_Auto_Backup.json if D drive is available
    if (fs.existsSync('D:')) {
      const backupPath = path.join(BACKUP_FOLDER, BACKUP_FILENAME);
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');
      console.log('✅ Real-time Auto Backup saved to:', backupPath);
    }
  } catch (e) {
    console.error('Error writing database:', e);
  }
}

// API Endpoints
app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.get('/api/ip', (req, res) => {
  res.json({ ip: getLocalIP(), port: PORT });
});

// GET all records in a store
app.get('/api/records/:store', (req, res) => {
  const { store } = req.params;
  const db = readDB();
  const records = db[store] || [];
  res.json(records);
});

// GET record by ID
app.get('/api/records/:store/:id', (req, res) => {
  const { store, id } = req.params;
  const db = readDB();
  const records = db[store] || [];
  const record = records.find(r => r.id === id);
  if (!record) {
    return res.status(404).json({ error: `Record with ID ${id} not found in store ${store}` });
  }
  res.json(record);
});

// GET record by Index (e.g. passportNumber, username, etc.)
app.get('/api/records/:store/index/:indexName/:value', (req, res) => {
  const { store, indexName, value } = req.params;
  const db = readDB();
  const records = db[store] || [];
  const decodedValue = decodeURIComponent(value);
  const record = records.find(r => r[indexName] === decodedValue);
  if (!record) {
    return res.status(404).json({ error: `Record with ${indexName} = ${decodedValue} not found in ${store}` });
  }
  res.json(record);
});

// POST add new record
app.post('/api/records/:store', (req, res) => {
  const { store } = req.params;
  const record = req.body;
  const db = readDB();
  
  if (!db[store]) db[store] = [];
  
  // Check unique constraints
  if (store === 'users' && record.username) {
    const exists = db.users.some(u => u.username === record.username);
    if (exists) return res.status(400).json({ error: 'Username already exists' });
  }
  if (store === 'employees') {
    if (record.passportNumber) {
      const exists = db.employees.some(e => e.passportNumber === record.passportNumber);
      if (exists) return res.status(400).json({ error: 'Passport number already exists' });
    }
    if (record.employeeCode) {
      const exists = db.employees.some(e => e.employeeCode === record.employeeCode);
      if (exists) return res.status(400).json({ error: 'Employee code already exists' });
    }
  }

  db[store].push(record);
  writeDB(db);
  res.status(201).json(record);
});

// PUT update existing record
app.put('/api/records/:store/:id', (req, res) => {
  const { store, id } = req.params;
  const updatedRecord = req.body;
  const db = readDB();
  
  const records = db[store] || [];
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) {
    records.push(updatedRecord);
  } else {
    records[index] = updatedRecord;
  }
  
  db[store] = records;
  writeDB(db);
  res.json(updatedRecord);
});

// DELETE record by ID
app.delete('/api/records/:store/:id', (req, res) => {
  const { store, id } = req.params;
  const db = readDB();
  
  const records = db[store] || [];
  const filtered = records.filter(r => r.id !== id);
  
  db[store] = filtered;
  writeDB(db);
  res.json({ success: true });
});

// DELETE clear store
app.delete('/api/records/:store', (req, res) => {
  const { store } = req.params;
  const db = readDB();
  db[store] = [];
  writeDB(db);
  res.json({ success: true });
});

// GET export database (for backup)
app.get('/api/export', (req, res) => {
  const db = readDB();
  res.json({
    exportDate: new Date().toISOString(),
    version: 2,
    appName: 'Queen International School HR System',
    ...db
  });
});

// POST import database (for restore) - tolerant parser
app.post('/api/import', (req, res) => {
  try {
    let data = req.body;
    // Handle case where body is a JSON string
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    const db = readDB();
    
    db.employees = Array.isArray(data.employees) ? data.employees : [];
    db.users = Array.isArray(data.users) ? data.users : [];
    db.activityLogs = Array.isArray(data.activityLogs) ? data.activityLogs : [];
    db.backupLogs = Array.isArray(data.backupLogs) ? data.backupLogs : [];
    db.cheques = Array.isArray(data.cheques) ? data.cheques : [];
    db.expenses = Array.isArray(data.expenses) ? data.expenses : [];
    
    writeDB(db);
    res.json({ success: true, imported: {
      employees: db.employees.length,
      users: db.users.length,
      cheques: db.cheques.length,
      expenses: db.expenses.length
    }});
  } catch (e) {
    console.error('Import error:', e);
    res.status(400).json({ error: 'Invalid database import payload: ' + e.message });
  }
});

// Serve frontend assets
const possibleDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, 'dist'),
  path.join(process.resourcesPath || '', 'dist'),
];

let distPath = possibleDistPaths[0];
for (const p of possibleDistPaths) {
  if (fs.existsSync(p)) {
    distPath = p;
    break;
  }
}

console.log('Serving frontend from:', distPath);
app.use(express.static(distPath));

// Fallback all non-API paths to index.html for React router
app.get('/*splat', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('HTML Dist index.html not found on server.');
  }
});

// JSON parse error handler - gives friendly message for large files
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Backup file too large (max 500MB). Try exporting without images, or contact support.' });
  }
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON backup file.' });
  }
  next(err);
});

function startServer(port = PORT) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🚀 QIS Central LAN Server Started!`);
    console.log(`🖥️ PC Access: http://localhost:${port}`);
    console.log(`📱 Mobile Access (Same Wifi): http://${getLocalIP()}:${port}`);
    console.log(`💾 Live DB File: ${DB_PATH}`);
    console.log(`===================================================`);
  });
}

// Allow starting or importing
if (require.main === module) {
  startServer();
} else {
  module.exports = { startServer, getLocalIP };
}
