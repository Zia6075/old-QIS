// ============================================
// Backup & Restore Page - Modern Light Professional Theme
// ============================================

import { canWrite } from '../utils/platform';
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Table } from '../components/UI/Table';
import { Toast, ConfirmDialog } from '../components/UI/Modal';
import { BackupLog } from '../types';
import { 
  createBackup, 
  restoreBackup, 
  getBackupLogs, 
  downloadBackup, 
  readBackupFile 
} from '../database/backupService';
import { importFromLanToFirebase } from '../database/db';
import { optimizeAllImages, type OptimizeProgress } from '../database/imageOptimizer';
import { logActivity, ACTIVITY_ACTIONS } from '../database/activityService';
import { formatDateTime } from '../utils/helpers';

interface BackupPageProps {
  userId: string;
}

export const BackupPage: React.FC<BackupPageProps> = ({ userId }) => {
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isImportingLan, setIsImportingLan] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optProg, setOptProg] = useState<OptimizeProgress | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
    return localStorage.getItem('autoBackupEnabled') === 'true';
  });
  const [lastBackupTime, setLastBackupTime] = useState(() => {
    return localStorage.getItem('lastBackupTime') || 'Never';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBackupLogs();
    checkAutoBackup();
  }, []);

  // Auto backup check - daily
  const checkAutoBackup = async () => {
    if (!autoBackupEnabled) return;
    
    const lastBackup = localStorage.getItem('lastBackupTime');
    if (!lastBackup) {
      await performAutoBackup();
      return;
    }
    
    const lastDate = new Date(lastBackup);
    const now = new Date();
    const hoursSinceLastBackup = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    
    // Auto backup every 24 hours
    if (hoursSinceLastBackup >= 24) {
      await performAutoBackup();
    }
  };

  const performAutoBackup = async () => {
    try {
      const { filename, data } = await createBackup();
      downloadBackup(data, filename);
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupTime', now);
      setLastBackupTime(now);
      loadBackupLogs();
      setToast({ message: `Auto backup created: ${filename}`, type: 'info' });
    } catch (err) {
      console.error('Auto backup failed:', err);
    }
  };

  const toggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem('autoBackupEnabled', String(enabled));
    if (enabled) {
      setToast({ message: 'Auto backup enabled! Backup will run daily.', type: 'success' });
    }
  };

  const loadBackupLogs = async () => {
    setLoading(true);
    try {
      const logs = await getBackupLogs();
      setBackupLogs(logs);
    } catch (err) {
      console.error('Failed to load backup logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const { filename, data } = await createBackup();
      downloadBackup(data, filename);
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupTime', now);
      setLastBackupTime(now);
      await logActivity(userId, ACTIVITY_ACTIONS.BACKUP_DATABASE, `Backup: ${filename}`);
      setToast({ message: `✅ Backup saved: ${filename}`, type: 'success' });
      loadBackupLogs();
    } catch (err) {
      setToast({ message: 'Backup failed!', type: 'error' });
    } finally {
      setIsBackingUp(false);
    }
  };

  // ⭐ Images compress — 99 MB jaisa data chhota karne ke liye
  const handleOptimize = async () => {
    setIsOptimizing(true);
    setOptProg(null);
    try {
      const res = await optimizeAllImages(setOptProg);
      setToast({
        message: `✅ ${res.changed} records ki images compress huin: ${res.beforeMB} MB → ${res.afterMB} MB`,
        type: 'success',
      });
    } catch (e) {
      setToast({ message: `❌ Compress fail: ${e instanceof Error ? e.message : e}`, type: 'error' });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleImportLan = async () => {
    setIsImportingLan(true);
    try {
      const res = await importFromLanToFirebase();
      const detail = Object.entries(res.collections).map(([k, v]) => `${k}: ${v}`).join(' · ');
      setToast({ message: `✅ ${res.total} records Firebase par chale gaye (${detail})`, type: 'success' });
      await logActivity(userId, ACTIVITY_ACTIONS.RESTORE_DATABASE, `LAN → Firebase import: ${res.total} records`);
    } catch (e) {
      setToast({
        message: `❌ Import fail: ${e instanceof Error ? e.message : e} — LAN server (app ka PC wala) chalu hona chahiye`,
        type: 'error',
      });
    } finally {
      setIsImportingLan(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setToast({ message: 'Please select a .json backup file', type: 'error' });
        return;
      }
      setRestoreFile(file);
      setShowRestoreDialog(true);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);
    try {
      const jsonData = await readBackupFile(restoreFile);
      await restoreBackup(jsonData);
      await logActivity(userId, ACTIVITY_ACTIONS.RESTORE_DATABASE, `Restored: ${restoreFile.name}`);
      setToast({ message: '✅ Database restored! Please refresh the page.', type: 'success' });
      setShowRestoreDialog(false);
      setRestoreFile(null);
      loadBackupLogs();
    } catch (err) {
      setToast({ message: 'Restore failed. Invalid backup file.', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const columns = [
    { key: 'filename', header: 'Filename', render: (log: BackupLog) => <span className="text-slate-800 font-bold text-sm">{log.filename}</span> },
    { key: 'size', header: 'Size', render: (log: BackupLog) => <span className="text-slate-500 font-bold text-xs">{log.size}</span> },
    { key: 'type', header: 'Type', render: (log: BackupLog) => (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.type === 'manual' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>{log.type}</span>
    )},
    { key: 'status', header: 'Status', render: (log: BackupLog) => (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>{log.status}</span>
    )},
    { key: 'createdAt', header: 'Date', render: (log: BackupLog) => <span className="text-slate-400 font-semibold text-xs">{formatDateTime(log.createdAt)}</span> },
  ];

  return (
    <div className="p-6 space-y-8 ">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-normal">Database Backup & Recovery</h1>
        <p className="text-slate-400 font-bold text-sm mt-1">Queen International School — System Security Panel</p>
      </div>

      {/* Backup Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Backup */}
        <Card className="p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[6px] flex items-center justify-center shadow-lg shadow-indigo-100">
                <span className="text-2xl">📤</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-normal">Export Database</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Save all data locally</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              The backup file will download to your PC's <strong>Downloads</strong> folder as a secure <strong>.json</strong> database file. 
              Keep this file safe—it contains your entire database including employee records, scanned files, and settings.
            </p>
          </div>
          <Button onClick={handleCreateBackup} isLoading={isBackingUp} className="w-full" size="lg">
            Create Manual Backup Now
          </Button>
        </Card>

        {/* Restore Backup */}
        <Card className="p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[6px] flex items-center justify-center shadow-lg shadow-emerald-100">
                <span className="text-2xl">📥</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-normal">Restore Database</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Upload backup database</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Select a valid <strong>.json</strong> backup file from your PC to override your current system database. 
              <span className="text-rose-500 font-bold"> Note:</span> This action will replace your active database with the restored files. It is recommended to create a backup first.
            </p>
          </div>
          {/* ⭐ Purana PC data ek click mein Firebase par */}
          <div className="mb-6 p-5 rounded-[6px] bg-indigo-50 border-2 border-indigo-200">
            <p className="font-bold text-indigo-900">📤 Purana PC data (LAN server) Firebase par bhejein</p>
            <p className="text-sm text-indigo-800 mt-1 leading-relaxed">
              Agar pehle data local server (<code>D:\HR Backup</code>) par tha, to yeh button
              employees, cheques, expenses, users <strong>aur saari images / receipts / cheque photos</strong>
              ko Firebase par le jaye ga — phir web browser aur doosre PC par bhi wahi sab dikhe ga.
            </p>
            <Button variant="primary" className="w-full mt-4" size="lg" isLoading={isImportingLan} onClick={handleImportLan} disabled={!canWrite()}>
              {isImportingLan ? 'Firebase par bheja ja raha hai…' : '⬆️ LAN se Firebase par import karein'}
            </Button>
          </div>
          {/* ⭐ Images compress */}
          <div className="mb-6 p-5 rounded-[6px] bg-rose-50 border-2 border-rose-200">
            <p className="font-bold text-rose-900">🗜️ Images compress karein (app tez karne ke liye)</p>
            <p className="text-sm text-rose-800 mt-1 leading-relaxed">
              Purani app ne <strong>full-size images</strong> save ki thin — aap ka data <strong>~99 MB</strong>
              ho gaya tha, isi se page blink karta tha aur load nahi hota tha. Yeh button har image ko
              900px/JPEG par dobara compress kar ke wapas save karta hai (aam tor par 95%+ kam).
            </p>
            {optProg && (
              <p className="text-sm font-bold text-rose-900 mt-2">
                {optProg.done}/{optProg.total} — {optProg.current}
                {optProg.beforeKB > 0 && ` · ${Math.round(optProg.beforeKB / 1024)} MB → ${Math.round(optProg.afterKB / 1024)} MB`}
              </p>
            )}
            <Button variant="danger" className="w-full mt-4" size="lg" isLoading={isOptimizing} onClick={handleOptimize} disabled={!canWrite()}>
              {isOptimizing ? 'Compress ho raha hai…' : '🗜️ Abhi compress karein'}
            </Button>
          </div>

          {/* ⭐ read-only mein restore ka pura section hi nahi dikhe ga */}
          {canWrite() && <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />}
          <Button variant="success" onClick={() => fileInputRef.current?.click()} className="w-full" size="lg" disabled={!canWrite()}>
            Select Backup JSON File
          </Button>
        </Card>
      </div>

      {/* Auto Backup Settings */}
      <Card className="p-8 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">⚙️ Auto Backup Settings</h3>
        <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[6px] border border-slate-100">
          <div>
            <p className="font-bold text-slate-700">Daily Auto Backup Trigger</p>
            <p className="text-slate-400 text-xs font-semibold mt-1">Automatically download backup file every 24 hours</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoBackupEnabled} 
              onChange={(e) => toggleAutoBackup(e.target.checked)}
              className="sr-only peer" 
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="p-4 bg-white rounded-[6px] border border-slate-100 text-center shadow-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Trigger Status</p>
            <p className={`text-lg font-bold mt-1.5 ${autoBackupEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {autoBackupEnabled ? 'ACTIVE (24h)' : 'DISABLED'}
            </p>
          </div>
          <div className="p-4 bg-white rounded-[6px] border border-slate-100 text-center shadow-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Last Sync Run</p>
            <p className="text-sm font-bold text-slate-700 mt-2">
              {lastBackupTime === 'Never' ? 'Never' : formatDateTime(lastBackupTime)}
            </p>
          </div>
          <div className="p-4 bg-white rounded-[6px] border border-slate-100 text-center shadow-sm">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Historical Logs</p>
            <p className="text-lg font-bold text-indigo-600 mt-1.5">{backupLogs.length} Backups</p>
          </div>
        </div>
      </Card>

      {/* Warning */}
      <Card className="p-5 bg-rose-50 border-rose-100 rounded-[6px]">
        <div className="flex items-start gap-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-rose-800 font-bold text-sm uppercase tracking-wider">Important Security Tips</p>
            <ul className="text-rose-700 text-xs font-semibold mt-2.5 space-y-2 list-disc list-inside leading-relaxed">
              <li>Always perform a manual backup **before** loading or restoring another backup.</li>
              <li>Store your exported backup files on an external drive or cloud storage (e.g., USB drive, Google Drive) for disaster recovery.</li>
              <li>You can easily clone your system to another PC: simply install the app on the other PC, then upload this backup file!</li>
              <li>The backup file contains **all employee registries, salaries, and scan image copies**. Keep it confidential.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* How to Share with Other PC */}
      <Card className="p-6 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">🖥️ How to Sync Data with another PC</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-5 bg-slate-50 border border-slate-100 rounded-[6px]">
            <div className="text-2xl font-bold text-indigo-500 mb-2">1</div>
            <p className="text-sm font-bold text-slate-700">Export File</p>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">Click "Export Database" button to download JSON file</p>
          </div>
          <div className="text-center p-5 bg-slate-50 border border-slate-100 rounded-[6px]">
            <div className="text-2xl font-bold text-indigo-500 mb-2">2</div>
            <p className="text-sm font-bold text-slate-700">Transfer File</p>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">Copy the file to a USB flash drive or email it</p>
          </div>
          <div className="text-center p-5 bg-slate-50 border border-slate-100 rounded-[6px]">
            <div className="text-2xl font-bold text-indigo-500 mb-2">3</div>
            <p className="text-sm font-bold text-slate-700">Install App</p>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">Install the school HR system on the target PC</p>
          </div>
          <div className="text-center p-5 bg-slate-50 border border-slate-100 rounded-[6px]">
            <div className="text-2xl font-bold text-indigo-500 mb-2">4</div>
            <p className="text-sm font-bold text-slate-700">Restore</p>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">Open "Backup & Restore" and upload the file</p>
          </div>
        </div>
      </Card>

      {/* Backup History */}
      <Card className="p-8 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">📋 Historical Backup Logs</h3>
        <Table columns={columns} data={backupLogs} keyField="id" isLoading={loading} emptyMessage="No backup history found" />
      </Card>

      {/* Restore Dialog */}
      <ConfirmDialog
        isOpen={showRestoreDialog}
        onClose={() => { setShowRestoreDialog(false); setRestoreFile(null); }}
        onConfirm={handleRestore}
        title="⚠️ Restore Database Confirmation"
        message={`Are you sure you want to restore from "${restoreFile?.name}"? All of your current system registry will be completely OVERRIDDEN. We recommend making a backup of your current database first!`}
        confirmText="Yes, Restore Database"
        variant="danger"
        isLoading={isRestoring}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
