# HR & Visa Management System - Complete Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Design](#database-design)
4. [Folder Structure](#folder-structure)
5. [Features](#features)
6. [Installation](#installation)
7. [LAN/Network Setup](#lan-network-setup)
8. [Migration to MySQL](#migration-to-mysql)
9. [EXE Deployment Guide](#exe-deployment-guide)
10. [API Reference](#api-reference)

---

## 🏢 System Overview

The HR & Visa Management System is a professional enterprise-level application for managing employee records, tracking passport and visa expiry dates, and generating alerts for document renewals.

### Key Capabilities
- ✅ Complete Employee CRUD Operations
- ✅ Passport & Visa Expiry Tracking
- ✅ Color-coded Alerts (Green/Orange/Red/Blinking)
- ✅ Dashboard Analytics with Charts
- ✅ Employee & Passport Image Management
- ✅ Role-based Access Control (Admin/Staff)
- ✅ PDF & Excel Report Export
- ✅ Backup & Restore System
- ✅ Activity Logging
- ✅ Modern Professional UI

---

## 🏗️ Architecture

### MVC Pattern Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages/    │  │ Components/ │  │   Layout/   │              │
│  │   Views     │  │   UI Kit    │  │  Sidebar    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Hooks/    │  │   Utils/    │  │   Types/    │              │
│  │  useAuth    │  │  Helpers    │  │  Interfaces │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA ACCESS LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Database   │  │  Employee   │  │   User      │              │
│  │  (IndexedDB)│  │  Service    │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State Management | React Hooks |
| Database | IndexedDB (Browser) |
| Build Tool | Vite |
| Charts | Custom SVG Components |

---

## 💾 Database Design

### SQLite Schema (For Python/Desktop Version)

```sql
-- ============================================
-- HR Management System Database Schema
-- ============================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'staff')) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT,
    failed_attempts INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0
);

-- Create indexes for users
CREATE INDEX idx_users_username ON users(username);

-- Employees Table
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    arabic_name TEXT,
    title TEXT,
    nationality TEXT NOT NULL,
    contact_number TEXT,
    passport_number TEXT UNIQUE NOT NULL,
    passport_issue_date TEXT,
    passport_expiry_date TEXT NOT NULL,
    visa_expiry_date TEXT NOT NULL,
    joining_date TEXT,
    person_image_path TEXT,
    passport_image_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for employees
CREATE INDEX idx_employees_passport ON employees(passport_number);
CREATE INDEX idx_employees_name ON employees(full_name);
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_nationality ON employees(nationality);

-- Activity Logs Table
CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create index for activity logs
CREATE INDEX idx_activity_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_user ON activity_logs(user_id);

-- Backup Logs Table
CREATE TABLE backup_logs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    size TEXT,
    type TEXT CHECK(type IN ('manual', 'automatic')),
    status TEXT CHECK(status IN ('success', 'failed')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default admin user (password: admin123)
INSERT INTO users (id, username, password_hash, role, full_name, email) 
VALUES ('usr_default_admin', 'admin', 'hashed_admin123', 'admin', 'System Administrator', 'admin@company.com');

-- Insert default staff user (password: staff123)
INSERT INTO users (id, username, password_hash, role, full_name, email) 
VALUES ('usr_default_staff', 'staff', 'hashed_staff123', 'staff', 'Staff Member', 'staff@company.com');
```

### MySQL Schema (For LAN/Multi-user Version)

```sql
-- ============================================
-- HR Management System - MySQL Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS hr_management_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE hr_management_system;

-- Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    failed_attempts INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    INDEX idx_username (username)
) ENGINE=InnoDB;

-- Employees Table
CREATE TABLE employees (
    id VARCHAR(50) PRIMARY KEY,
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    arabic_name NVARCHAR(100),
    title VARCHAR(100),
    nationality VARCHAR(50) NOT NULL,
    contact_number VARCHAR(30),
    passport_number VARCHAR(20) UNIQUE NOT NULL,
    passport_issue_date DATE,
    passport_expiry_date DATE NOT NULL,
    visa_expiry_date DATE NOT NULL,
    joining_date DATE,
    person_image_path TEXT,
    passport_image_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_passport (passport_number),
    INDEX idx_name (full_name),
    INDEX idx_employee_code (employee_code),
    INDEX idx_nationality (nationality)
) ENGINE=InnoDB;

-- Activity Logs Table
CREATE TABLE activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Backup Logs Table
CREATE TABLE backup_logs (
    id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    size VARCHAR(20),
    type ENUM('manual', 'automatic'),
    status ENUM('success', 'failed'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at)
) ENGINE=InnoDB;
```

---

## 📁 Folder Structure

```
hr-management-system/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   └── Sidebar.tsx          # Navigation sidebar
│   │   └── UI/
│   │       ├── Button.tsx           # Reusable button component
│   │       ├── Card.tsx             # Card components
│   │       ├── Charts.tsx           # Pie, Bar, Donut charts
│   │       ├── ImageUpload.tsx      # Image upload with preview
│   │       ├── Input.tsx            # Form input components
│   │       ├── Modal.tsx            # Modal & dialogs
│   │       └── Table.tsx            # Data table component
│   │
│   ├── database/
│   │   ├── db.ts                    # IndexedDB initialization
│   │   ├── employeeService.ts       # Employee CRUD operations
│   │   ├── userService.ts           # User authentication
│   │   ├── activityService.ts       # Activity logging
│   │   ├── backupService.ts         # Backup/restore
│   │   └── seedData.ts              # Sample data
│   │
│   ├── hooks/
│   │   ├── useAuth.ts               # Authentication hook
│   │   └── useEmployees.ts          # Employee data hook
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx            # Login screen
│   │   ├── DashboardPage.tsx        # Dashboard with stats
│   │   ├── AddEmployeePage.tsx      # Add new employee
│   │   ├── SearchEmployeePage.tsx   # Search & manage employees
│   │   ├── ReportsPage.tsx          # Reports & exports
│   │   ├── BackupPage.tsx           # Backup & restore
│   │   ├── SettingsPage.tsx         # User settings
│   │   └── UsersPage.tsx            # User management (admin)
│   │
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   │
│   ├── utils/
│   │   └── helpers.ts               # Utility functions
│   │
│   ├── App.tsx                      # Main application
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles
│
├── public/
│   └── vite.svg                     # App icon
│
├── index.html                       # HTML template
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite config
├── tailwind.config.js               # Tailwind config
└── DOCUMENTATION.md                 # This file
```

---

## ✨ Features

### 1. Employee Management
- Add new employees with all required details
- Upload employee photo and passport image
- Edit employee information
- Delete employees (admin only)
- Search by name, passport, contact, nationality

### 2. Document Expiry Alerts
| Days Left | Color | Status |
|-----------|-------|--------|
| > 30 | 🟢 Green | Safe |
| 8-30 | 🟠 Orange | Warning |
| 1-7 | 🔴 Red (Pulse) | Danger |
| ≤ 0 | 🔴 Red (Blink) | Expired |

### 3. Dashboard Analytics
- Total employees count
- Expiring passports count
- Expiring visas count
- Expired documents count
- Nationality distribution chart
- Document status pie chart
- Monthly joining trend chart
- Recent activity feed

### 4. Reports
- Export to CSV
- Export to PDF (print)
- Filter by report type
- All employees
- Expiring passports
- Expiring visas
- Expired documents

### 5. User Authentication
- Secure login with password hashing
- Remember me functionality
- Role-based permissions (Admin/Staff)
- Account lockout after failed attempts
- Session management

### 6. Backup System
- Manual backup to JSON
- Restore from backup file
- Backup history log
- Full database export

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Steps

```bash
# Clone or download the project
cd hr-management-system

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Staff | staff | staff123 |

---

## 🌐 LAN/Network Setup

### Single PC Setup (Current - IndexedDB)
- Data stored in browser's IndexedDB
- No server required
- Works offline
- Suitable for single user

### Multi-PC LAN Setup (MySQL)

#### Server PC Configuration

1. **Install MySQL Server**
```bash
# Windows: Download MySQL Installer
# Linux: sudo apt install mysql-server
```

2. **Create Database**
```sql
CREATE DATABASE hr_management_system;
CREATE USER 'hr_admin'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON hr_management_system.* TO 'hr_admin'@'%';
FLUSH PRIVILEGES;
```

3. **Configure MySQL for Remote Access**
```ini
# my.cnf or my.ini
[mysqld]
bind-address = 0.0.0.0
port = 3306
```

4. **Set Static IP**
- Server IP: 192.168.1.100 (example)
- Subnet: 255.255.255.0
- Gateway: 192.168.1.1

5. **Configure Firewall**
```bash
# Windows: Allow MySQL through firewall
netsh advfirewall firewall add rule name="MySQL" dir=in action=allow protocol=TCP localport=3306

# Linux:
sudo ufw allow 3306/tcp
```

#### Client PC Configuration

1. **Install MySQL Connector**
```bash
pip install mysql-connector-python
```

2. **Configure Connection**
```python
# config.py
DB_CONFIG = {
    'host': '192.168.1.100',  # Server IP
    'port': 3306,
    'database': 'hr_management_system',
    'user': 'hr_admin',
    'password': 'secure_password'
}
```

### Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OFFICE LAN                                │
│                                                                  │
│   ┌──────────────┐                                              │
│   │   Server PC  │ ◄─── MySQL Database                         │
│   │ 192.168.1.100│      (Primary Data Store)                   │
│   └──────────────┘                                              │
│          │                                                       │
│          │ TCP/3306                                             │
│          │                                                       │
│   ┌──────┴──────────────────────────────────────┐              │
│   │                  Network Switch              │              │
│   └──────┬─────────────┬─────────────┬─────────┘              │
│          │             │             │                          │
│   ┌──────┴──┐   ┌──────┴──┐   ┌──────┴──┐                      │
│   │Client PC│   │Client PC│   │Client PC│                      │
│   │   .101  │   │   .102  │   │   .103  │                      │
│   └─────────┘   └─────────┘   └─────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Migration to MySQL

### Step 1: Export Current Data
Use the Backup feature to export all data to JSON.

### Step 2: Set Up MySQL Server
Follow the LAN setup guide above.

### Step 3: Import Data
```python
import json
import mysql.connector

# Read backup file
with open('hr_backup.json', 'r') as f:
    data = json.load(f)

# Connect to MySQL
conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

# Import employees
for emp in data['employees']:
    cursor.execute('''
        INSERT INTO employees 
        (id, employee_code, full_name, arabic_name, ...)
        VALUES (%s, %s, %s, %s, ...)
    ''', (emp['id'], emp['employeeCode'], ...))

conn.commit()
```

---

## 📦 EXE Deployment Guide

### For Python/PySide6 Desktop Version

#### Required Files
```
project/
├── main.py
├── database/
├── ui/
├── assets/
│   └── icon.ico
├── requirements.txt
└── hr_management_system.spec
```

#### PyInstaller Command
```bash
pip install pyinstaller

pyinstaller --name "HR Management System" \
            --icon assets/icon.ico \
            --windowed \
            --onefile \
            --add-data "assets;assets" \
            --add-data "database;database" \
            main.py
```

#### Spec File (hr_management_system.spec)
```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('assets', 'assets'),
        ('database', 'database'),
    ],
    hiddenimports=[
        'PySide6.QtSvg',
        'mysql.connector',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='HR Management System',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon.ico',
)
```

#### Inno Setup Script (installer.iss)
```iss
[Setup]
AppName=HR Management System
AppVersion=1.0.0
DefaultDirName={pf}\HR Management System
DefaultGroupName=HR Management System
OutputBaseFilename=HR_Management_Setup
Compression=lzma
SolidCompression=yes
SetupIconFile=assets\icon.ico

[Files]
Source: "dist\HR Management System.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\HR Management System"; Filename: "{app}\HR Management System.exe"
Name: "{commondesktop}\HR Management System"; Filename: "{app}\HR Management System.exe"

[Run]
Filename: "{app}\HR Management System.exe"; Description: "Launch HR Management System"; Flags: nowait postinstall skipifsilent
```

---

## 📚 API Reference

### Employee Service

```typescript
// Create employee
createEmployee(data: Omit<Employee, 'id' | 'employeeCode' | 'createdAt' | 'updatedAt'>): Promise<Employee>

// Update employee
updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee>

// Delete employee
deleteEmployee(id: string): Promise<void>

// Get employee by ID
getEmployee(id: string): Promise<Employee | undefined>

// Get all employees
getAllEmployees(): Promise<Employee[]>

// Search employees
searchEmployees(query: string, field: 'all' | 'name' | 'passport' | 'contact' | 'nationality'): Promise<Employee[]>

// Get expiring passports
getExpiringPassports(days: number): Promise<Employee[]>

// Get expiring visas
getExpiringVisas(days: number): Promise<Employee[]>

// Get expired documents
getExpiredDocuments(): Promise<Employee[]>
```

### User Service

```typescript
// Authenticate user
authenticateUser(username: string, password: string): Promise<{success: boolean, user?: User, error?: string}>

// Create user
createUser(username: string, password: string, role: 'admin' | 'staff', fullName: string, email: string): Promise<User>

// Change password
changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>

// Reset password (admin)
resetUserPassword(userId: string, newPassword: string): Promise<void>

// Unlock user
unlockUser(userId: string): Promise<void>
```

### Backup Service

```typescript
// Create backup
createBackup(): Promise<{success: boolean, filename: string, data: string}>

// Restore backup
restoreBackup(jsonData: string): Promise<boolean>

// Get backup logs
getBackupLogs(): Promise<BackupLog[]>
```

---

## 📞 Support

For issues or feature requests, please contact your system administrator.

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**License:** Proprietary
