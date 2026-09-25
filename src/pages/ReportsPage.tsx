// ============================================
// Reports Page Component - Modern Light Professional Theme
// ============================================

import React, { useState, useEffect } from 'react';
import { Card, StatCard } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Select } from '../components/UI/Input';
import { PieChart, BarChart } from '../components/UI/Charts';
import { Table, StatusBadge } from '../components/UI/Table';
import { Toast } from '../components/UI/Modal';
import { Employee } from '../types';
import { useEmployees } from '../hooks/useEmployees';
import { 
  calculateDaysLeft, 
  getAlertStatus, 
  formatDate, 
  exportToCSV, 
  exportToPDF 
} from '../utils/helpers';
import { logActivity, ACTIVITY_ACTIONS } from '../database/activityService';

interface ReportsPageProps {
  userId: string;
}

type ReportType = 'all' | 'expiring-passport' | 'expiring-visa' | 'expired' | 'nationality';

export const ReportsPage: React.FC<ReportsPageProps> = ({ userId }) => {
  const { employees, loading } = useEmployees();
  const [reportType, setReportType] = useState<ReportType>('all');
  const [filteredData, setFilteredData] = useState<Employee[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter data based on report type
  useEffect(() => {
    let filtered: Employee[] = [];

    switch (reportType) {
      case 'expiring-passport':
        filtered = employees.filter(emp => {
          const days = calculateDaysLeft(emp.passportExpiryDate);
          return days > 0 && days <= 30;
        });
        break;
      case 'expiring-visa':
        filtered = employees.filter(emp => {
          const days = calculateDaysLeft(emp.visaExpiryDate);
          return days > 0 && days <= 30;
        });
        break;
      case 'expired':
        filtered = employees.filter(emp => {
          return calculateDaysLeft(emp.passportExpiryDate) < 0 || 
                 calculateDaysLeft(emp.visaExpiryDate) < 0;
        });
        break;
      default:
        filtered = employees;
    }

    setFilteredData(filtered);
  }, [employees, reportType]);

  // Prepare statistics
  const stats = {
    total: employees.length,
    expiringPassport: employees.filter(e => {
      const d = calculateDaysLeft(e.passportExpiryDate);
      return d > 0 && d <= 30;
    }).length,
    expiringVisa: employees.filter(e => {
      const d = calculateDaysLeft(e.visaExpiryDate);
      return d > 0 && d <= 30;
    }).length,
    expired: employees.filter(e => 
      calculateDaysLeft(e.passportExpiryDate) < 0 || 
      calculateDaysLeft(e.visaExpiryDate) < 0
    ).length,
  };

  // Nationality distribution
  const nationalityData = employees.reduce((acc, emp) => {
    acc[emp.nationality] = (acc[emp.nationality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const nationalityChartData = Object.entries(nationalityData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value], index) => ({
      label,
      value,
      color: ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'][index % 8],
    }));

  // Document status distribution
  const statusData = [
    { label: 'Valid', value: stats.total - stats.expiringPassport - stats.expiringVisa - stats.expired, color: '#10B981' },
    { label: 'Exp. Passport', value: stats.expiringPassport, color: '#f59e0b' },
    { label: 'Exp. Visa', value: stats.expiringVisa, color: '#F97316' },
    { label: 'Expired', value: stats.expired, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const handleExportCSV = () => {
    const data = filteredData.map(emp => ({
      'Employee Code': emp.employeeCode,
      'Full Name': emp.fullName,
      'Arabic Name': emp.arabicName,
      'Title': emp.title,
      'Nationality': emp.nationality,
      'Contact': emp.contactNumber,
      'Passport Number': emp.passportNumber,
      'Passport Issue': formatDate(emp.passportIssueDate),
      'Passport Expiry': formatDate(emp.passportExpiryDate),
      'Passport Days Left': calculateDaysLeft(emp.passportExpiryDate),
      'Visa Expiry': formatDate(emp.visaExpiryDate),
      'Visa Days Left': calculateDaysLeft(emp.visaExpiryDate),
      'Joining Date': formatDate(emp.joiningDate),
    }));

    const reportNames: Record<ReportType, string> = {
      'all': 'all_employees',
      'expiring-passport': 'expiring_passports',
      'expiring-visa': 'expiring_visas',
      'expired': 'expired_documents',
      'nationality': 'nationality_report',
    };

    exportToCSV(data, reportNames[reportType]);
    logActivity(userId, ACTIVITY_ACTIONS.EXPORT_REPORT, `Exported ${reportType} report to CSV`);
    setToast({ message: 'Report exported to CSV successfully', type: 'success' });
  };

  const handleExportPDF = () => {
    const tableRows = filteredData.map(emp => {
      const passportDays = calculateDaysLeft(emp.passportExpiryDate);
      const visaDays = calculateDaysLeft(emp.visaExpiryDate);
      const passportStatus = getAlertStatus(passportDays);
      const visaStatus = getAlertStatus(visaDays);
      
      return `
        <tr>
          <td>${emp.employeeCode}</td>
          <td>${emp.fullName}</td>
          <td>${emp.nationality}</td>
          <td>${emp.passportNumber}</td>
          <td class="${passportStatus}">${formatDate(emp.passportExpiryDate)} (${passportDays}d)</td>
          <td class="${visaStatus}">${formatDate(emp.visaExpiryDate)} (${visaDays}d)</td>
        </tr>
      `;
    }).join('');

    const reportTitles: Record<ReportType, string> = {
      'all': 'All Employees Report',
      'expiring-passport': 'Expiring Passports Report',
      'expiring-visa': 'Expiring Visas Report',
      'expired': 'Expired Documents Report',
      'nationality': 'Nationality Report',
    };

    const content = `
      <div class="header">
        <h1>${reportTitles[reportType]}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Total Records: ${filteredData.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Nationality</th>
            <th>Passport</th>
            <th>Passport Expiry</th>
            <th>Visa Expiry</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    exportToPDF(content, reportTitles[reportType]);
    logActivity(userId, ACTIVITY_ACTIONS.EXPORT_REPORT, `Exported ${reportType} report to PDF`);
    setToast({ message: 'Report exported to PDF successfully', type: 'success' });
  };

  const columns = [
    {
      key: 'employeeCode',
      header: 'Code',
      render: (emp: Employee) => (
        <span className="text-indigo-600 font-bold font-mono">{emp.employeeCode}</span>
      ),
    },
    {
      key: 'fullName',
      header: 'Name',
      render: (emp: Employee) => (
        <span className="text-slate-800 font-bold">{emp.fullName}</span>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      render: (emp: Employee) => (
        <span className="text-slate-500 font-medium">{emp.nationality}</span>
      ),
    },
    {
      key: 'passportNumber',
      header: 'Passport',
      render: (emp: Employee) => (
        <span className="text-slate-600 font-mono text-xs font-bold">{emp.passportNumber}</span>
      ),
    },
    {
      key: 'passportExpiryDate',
      header: 'Passport Expiry',
      render: (emp: Employee) => {
        const days = calculateDaysLeft(emp.passportExpiryDate);
        const status = getAlertStatus(days);
        return (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm font-semibold">{formatDate(emp.passportExpiryDate)}</span>
            <StatusBadge status={status} text={days < 0 ? 'Expired' : `${days}d`} />
          </div>
        );
      },
    },
    {
      key: 'visaExpiryDate',
      header: 'Visa Expiry',
      render: (emp: Employee) => {
        const days = calculateDaysLeft(emp.visaExpiryDate);
        const status = getAlertStatus(days);
        return (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm font-semibold">{formatDate(emp.visaExpiryDate)}</span>
            <StatusBadge status={status} text={days < 0 ? 'Expired' : `${days}d`} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-8 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-normal">Reports & Analytics</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">Generate and export official employee registries</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExportCSV}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
          <Button onClick={handleExportPDF}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats.total}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Expiring Passports"
          value={stats.expiringPassport}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          }
        />
        <StatCard
          title="Expiring Visas"
          value={stats.expiringVisa}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Expired Documents"
          value={stats.expired}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Document Validity Status</h3>
          <div className="flex justify-center my-auto">
            <PieChart data={statusData} size={180} />
          </div>
        </Card>
        <Card className="p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Nationality Distribution</h3>
          <div className="my-auto">
            <BarChart data={nationalityChartData} height={180} />
          </div>
        </Card>
      </div>

      {/* Report Filter */}
      <Card className="p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Report Category</label>
            <div className="w-64">
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                options={[
                  { value: 'all', label: 'All Employees' },
                  { value: 'expiring-passport', label: 'Expiring Passports (30 days)' },
                  { value: 'expiring-visa', label: 'Expiring Visas (30 days)' },
                  { value: 'expired', label: 'Expired Documents' },
                ]}
              />
            </div>
          </div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-[6px] border border-slate-200/50">
            {filteredData.length} records found
          </span>
        </div>
      </Card>

      {/* Data Table */}
      <Table
        columns={columns}
        data={filteredData}
        keyField="id"
        isLoading={loading}
        emptyMessage="No records found for this report filter"
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
