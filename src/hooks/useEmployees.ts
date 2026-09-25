// ============================================
// Employees Hook - UAE Dubai
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { Employee, DashboardStats, AlertStatus } from '../types';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployee,
  searchEmployees,
  checkPassportExists,
} from '../database/employeeService';
import { calculateDaysLeft, getAlertStatus } from '../utils/helpers';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (err) {
      setError('Failed to load employees');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const addEmployee = useCallback(async (
    employeeData: Omit<Employee, 'id' | 'employeeCode' | 'createdAt' | 'updatedAt'>
  ): Promise<Employee> => {
    setLoading(true);
    setError(null);
    try {
      const newEmployee = await createEmployee(employeeData);
      setEmployees(prev => [...prev, newEmployee]);
      return newEmployee;
    } catch (err) {
      setError('Failed to add employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const editEmployee = useCallback(async (
    id: string,
    updates: Partial<Employee>
  ): Promise<Employee> => {
    setLoading(true);
    setError(null);
    try {
      const updatedEmployee = await updateEmployee(id, updates);
      setEmployees(prev => 
        prev.map(emp => emp.id === id ? updatedEmployee : emp)
      );
      return updatedEmployee;
    } catch (err) {
      setError('Failed to update employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeEmployee = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await deleteEmployee(id);
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    } catch (err) {
      setError('Failed to delete employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const findEmployee = useCallback(async (id: string): Promise<Employee | undefined> => {
    return getEmployee(id);
  }, []);

  const search = useCallback(async (
    query: string,
    field: 'all' | 'name' | 'passport' | 'contact' | 'nationality' | 'emirateId' = 'all'
  ): Promise<Employee[]> => {
    if (!query.trim()) {
      return employees;
    }
    return searchEmployees(query, field);
  }, [employees]);

  const validatePassport = useCallback(async (
    passportNumber: string,
    excludeId?: string
  ): Promise<boolean> => {
    return checkPassportExists(passportNumber, excludeId);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    employees,
    loading,
    error,
    loadEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
    findEmployee,
    search,
    validatePassport,
    clearError,
  };
};

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    expiringPassports: 0,
    expiringVisas: 0,
    expiredDocuments: 0,
    expiringLabour: 0,
    expiringRTA: 0,
    recentActivity: [],
  });
  const [nationalityData, setNationalityData] = useState<Record<string, number>>({});
  const [joiningData, setJoiningData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const allEmployees = await getAllEmployees();
      
      const expiringPass = allEmployees.filter(e => {
        const d = calculateDaysLeft(e.passportExpiryDate);
        return d > 0 && d <= 30;
      });
      
      const expiringVisa = allEmployees.filter(e => {
        const d = calculateDaysLeft(e.visaExpiryDate);
        return d > 0 && d <= 30;
      });
      
      const expiringLabour = allEmployees.filter(e => {
        if (!e.labourExpiry) return false;
        const d = calculateDaysLeft(e.labourExpiry);
        return d > 0 && d <= 30;
      });
      
      const expiringRTA = allEmployees.filter(e => {
        if (!e.rtaExpiry) return false;
        const d = calculateDaysLeft(e.rtaExpiry);
        return d > 0 && d <= 30;
      });
      
      const expired = allEmployees.filter(e => 
        calculateDaysLeft(e.passportExpiryDate) < 0 || 
        calculateDaysLeft(e.visaExpiryDate) < 0 ||
        (e.labourExpiry && calculateDaysLeft(e.labourExpiry) < 0)
      );

      // Nationality distribution
      const nationality: Record<string, number> = {};
      allEmployees.forEach(emp => {
        nationality[emp.nationality] = (nationality[emp.nationality] || 0) + 1;
      });

      // Monthly joining
      const joining: Record<string, number> = {};
      allEmployees.forEach(emp => {
        if (emp.joiningDate) {
          const month = emp.joiningDate.substring(0, 7);
          joining[month] = (joining[month] || 0) + 1;
        }
      });

      setStats({
        totalEmployees: allEmployees.length,
        expiringPassports: expiringPass.length,
        expiringVisas: expiringVisa.length,
        expiredDocuments: expired.length,
        expiringLabour: expiringLabour.length,
        expiringRTA: expiringRTA.length,
        recentActivity: [],
      });
      setNationalityData(nationality);
      setJoiningData(joining);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // removed auto-refresh interval - was hammering server every 60s
  }, [loadStats]);

  return {
    stats,
    nationalityData,
    joiningData,
    loading,
    refreshStats: loadStats,
  };
};

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<{
    passport: { employee: Employee; daysLeft: number; status: AlertStatus }[];
    visa: { employee: Employee; daysLeft: number; status: AlertStatus }[];
    labour: { employee: Employee; daysLeft: number; status: AlertStatus }[];
    rta: { employee: Employee; daysLeft: number; status: AlertStatus }[];
  }>({
    passport: [],
    visa: [],
    labour: [],
    rta: [],
  });

  const loadAlerts = useCallback(async () => {
    const employees = await getAllEmployees();
    
    const passportAlerts = employees
      .map(emp => {
        const daysLeft = calculateDaysLeft(emp.passportExpiryDate);
        return { employee: emp, daysLeft, status: getAlertStatus(daysLeft) };
      })
      .filter(a => a.status !== 'safe')
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const visaAlerts = employees
      .map(emp => {
        const daysLeft = calculateDaysLeft(emp.visaExpiryDate);
        return { employee: emp, daysLeft, status: getAlertStatus(daysLeft) };
      })
      .filter(a => a.status !== 'safe')
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const labourAlerts = employees
      .filter(emp => emp.labourExpiry)
      .map(emp => {
        const daysLeft = calculateDaysLeft(emp.labourExpiry);
        return { employee: emp, daysLeft, status: getAlertStatus(daysLeft) };
      })
      .filter(a => a.status !== 'safe')
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const rtaAlerts = employees
      .filter(emp => emp.rtaExpiry)
      .map(emp => {
        const daysLeft = calculateDaysLeft(emp.rtaExpiry);
        return { employee: emp, daysLeft, status: getAlertStatus(daysLeft) };
      })
      .filter(a => a.status !== 'safe')
      .sort((a, b) => a.daysLeft - b.daysLeft);

    setAlerts({ passport: passportAlerts, visa: visaAlerts, labour: labourAlerts, rta: rtaAlerts });
  }, []);

  useEffect(() => {
    loadAlerts();
    // removed auto-refresh interval
  }, [loadAlerts]);

  return { alerts, refreshAlerts: loadAlerts };
};
