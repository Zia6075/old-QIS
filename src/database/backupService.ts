// ============================================
// Backup Service Layer
// ============================================

import { BackupLog } from '../types';
import { addRecord, getAllRecords } from './db';
import { exportDatabase, importDatabase } from './db';

const STORE_NAME = 'backupLogs';

export const generateBackupId = (): string => {
  return `bkp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createBackup = async (): Promise<{ success: boolean; filename: string; data: string }> => {
  try {
    const data = await exportDatabase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hr_backup_${timestamp}.json`;
    
    const log: BackupLog = {
      id: generateBackupId(),
      filename,
      size: `${(data.length / 1024).toFixed(2)} KB`,
      type: 'manual',
      status: 'success',
      createdAt: new Date().toISOString(),
    };

    await addRecord<BackupLog>(STORE_NAME, log);

    return { success: true, filename, data };
  } catch (error) {
    const log: BackupLog = {
      id: generateBackupId(),
      filename: 'failed_backup',
      size: '0 KB',
      type: 'manual',
      status: 'failed',
      createdAt: new Date().toISOString(),
    };

    await addRecord<BackupLog>(STORE_NAME, log);
    throw error;
  }
};

export const restoreBackup = async (jsonData: string): Promise<boolean> => {
  try {
    await importDatabase(jsonData);
    
    const log: BackupLog = {
      id: generateBackupId(),
      filename: 'restore_operation',
      size: `${(jsonData.length / 1024).toFixed(2)} KB`,
      type: 'manual',
      status: 'success',
      createdAt: new Date().toISOString(),
    };

    await addRecord<BackupLog>(STORE_NAME, log);
    return true;
  } catch (error) {
    throw error;
  }
};

export const getBackupLogs = async (): Promise<BackupLog[]> => {
  const logs = await getAllRecords<BackupLog>(STORE_NAME);
  return logs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const downloadBackup = (data: string, filename: string): void => {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readBackupFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
