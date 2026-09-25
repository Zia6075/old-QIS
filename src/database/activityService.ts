// ============================================
// Activity Log Service Layer
// ============================================

import { ActivityLog } from '../types';
import { addRecord, getAllRecords } from './db';
import { isReadOnly } from '../utils/platform';

const STORE_NAME = 'activityLogs';

export const generateActivityId = (): string => {
  return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const logActivity = async (
  userId: string,
  action: string,
  details: string
): Promise<ActivityLog> => {
  const log: ActivityLog = {
    id: generateActivityId(),
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: 'localhost', // In web context
  };

  // ⭐ Browser (READ ONLY) mein activity log skip — warna har click par error aata
  if (isReadOnly()) return log;

  return addRecord<ActivityLog>(STORE_NAME, log);
};

export const getActivityLogs = async (limit?: number): Promise<ActivityLog[]> => {
  const logs = await getAllRecords<ActivityLog>(STORE_NAME);
  const sorted = logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  if (limit) {
    return sorted.slice(0, limit);
  }
  return sorted;
};

export const getUserActivityLogs = async (userId: string): Promise<ActivityLog[]> => {
  const logs = await getAllRecords<ActivityLog>(STORE_NAME);
  return logs
    .filter(log => log.userId === userId)
    .sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
};

export const getRecentActivity = async (hours: number = 24): Promise<ActivityLog[]> => {
  const logs = await getAllRecords<ActivityLog>(STORE_NAME);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return logs
    .filter(log => new Date(log.timestamp) >= cutoff)
    .sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
};

// Activity action constants
export const ACTIVITY_ACTIONS = {
  LOGIN: 'USER_LOGIN',
  LOGOUT: 'USER_LOGOUT',
  ADD_EMPLOYEE: 'ADD_EMPLOYEE',
  UPDATE_EMPLOYEE: 'UPDATE_EMPLOYEE',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',
  VIEW_EMPLOYEE: 'VIEW_EMPLOYEE',
  EXPORT_REPORT: 'EXPORT_REPORT',
  BACKUP_DATABASE: 'BACKUP_DATABASE',
  RESTORE_DATABASE: 'RESTORE_DATABASE',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
} as const;
