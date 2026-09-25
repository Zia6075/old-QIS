// ============================================
// Queen International School - Type Definitions
// UAE Dubai HR System
// ============================================

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  arabicName: string;
  title: string;
  nationality: string;
  contactNumber: string;
  emirateId: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  visaExpiryDate: string;
  labourExpiry: string;
  rtaExpiry: string;
  joiningDate: string;
  sponsor: string;
  licenceNo: string;
  personImagePath: string;
  /** ⭐ chhota avatar (list ke liye) — bari images `media/{id}` node mein */
  personThumb?: string;
  passportImagePath: string;
  visaImagePath: string;
  labourCardImagePath: string;
  basicSalary: number;
  otherAllowance: number;
  totalSalary: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'staff';
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
  failedAttempts: number;
  isLocked: boolean;
  /** ⭐ kis ka data node dekhe ga (RTDB rules owner-email scoped hain) */
  dataOwner?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface BackupLog {
  id: string;
  filename: string;
  size: string;
  type: 'manual' | 'automatic';
  status: 'success' | 'failed';
  createdAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  expiringPassports: number;
  expiringVisas: number;
  expiredDocuments: number;
  expiringLabour: number;
  expiringRTA: number;
  recentActivity: ActivityLog[];
}

export type AlertStatus = 'safe' | 'warning' | 'danger' | 'expired';

export interface ChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

export interface SearchFilters {
  query: string;
  field: 'all' | 'name' | 'passport' | 'contact' | 'nationality' | 'emirateId';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  rememberMe: boolean;
  /** kis tareeqe se login hua tha (remember-me restore ke liye) */
  mode?: 'local' | 'cloud';
}

export type Page = 
  | 'login'
  | 'dashboard'
  | 'add-employee'
  | 'search-employee'
  | 'employee-details'
  | 'reports'
  | 'accounting'
  | 'settings'
  | 'backup'
  | 'users';
