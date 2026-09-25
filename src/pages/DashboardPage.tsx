// ============================================
// Dashboard Page - Modern Indigo Theme
// ============================================

import React, { useEffect, useState } from 'react';
import { Card, StatCard, AlertCard } from '../components/UI/Card';
import { PieChart, BarChart, DonutChart } from '../components/UI/Charts';
import { useDashboardStats, useAlerts } from '../hooks/useEmployees';
import { getActivityLogs } from '../database/activityService';
import { ActivityLog } from '../types';
import { formatDateTime } from '../utils/helpers';
import { Button } from '../components/UI/Button';
import { importFromLanToFirebase } from '../database/db';
import { getAllEmployees } from '../database/employeeService';
import { getAllCheques, getAllExpenses } from '../database/accountingService';

interface DashboardPageProps {
  onNavigate: (page: 'search-employee' | 'add-employee') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { stats, nationalityData, joiningData, loading, refreshStats } = useDashboardStats();
  const { alerts } = useAlerts();
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  // ⭐ Purana PC data (images samet) abhi cloud par nahi? → banner + ek click import
  const [needImport, setNeedImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);

  useEffect(() => {
    const loadActivity = async () => { const logs = await getActivityLogs(10); setRecentActivity(logs); };
    loadActivity();
  }, []);

  useEffect(() => {
    // ⭐ FIX (blinking): pehle yahan pushImageDiagnostics() call hota tha jo
    // Firebase par WRITE karta tha → listener → refresh → dobara effect → loop.
    // Ab sirf EK dafa, bina likhe, local count se check karte hain.
    if (checkedOnce) return;
    const check = async () => {
      try {
        const [emps, chq, exp] = await Promise.all([getAllEmployees(), getAllCheques(), getAllExpenses()]);
        const imgs = emps.filter(e =>
          [e.personImagePath, e.passportImagePath, e.visaImagePath, e.labourCardImagePath]
            .some(v => typeof v === 'string' && v.startsWith('data:image'))
        ).length;
        setNeedImport(emps.length > 0 && imgs === 0 && chq.length === 0 && exp.length === 0);
        setCheckedOnce(true);
      } catch { /* ignore */ }
    };
    void check();
  }, [checkedOnce]);

  const doImport = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await importFromLanToFirebase();
      setImportMsg(`✅ ${res.total} records Firebase par chale gaye — page refresh karein`);
      setNeedImport(false);
    } catch (e) {
      setImportMsg(`❌ ${e instanceof Error ? e.message : e}`);
    } finally {
      setImporting(false);
    }
  };

  const nationalityChartData = Object.entries(nationalityData).slice(0, 6).map(([label, value], i) => ({
    label, value, color: ['#6366f1', '#14b8a6', '#3b82f6', '#f43f5e', '#8b5cf6', '#ec4899'][i % 6],
  }));

  const documentStatusData = [
    { label: 'Safe', value: Math.max(0, stats.totalEmployees - stats.expiringPassports - stats.expiringVisas - stats.expiredDocuments), color: '#10B981' },
    { label: 'Warning', value: stats.expiringPassports + stats.expiringVisas, color: '#f59e0b' },
    { label: 'Expired', value: stats.expiredDocuments, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const monthlyData = Object.entries(joiningData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([label, value]) => {
      const date = new Date(label + '-01');
      const isInvalid = isNaN(date.getTime());
      return {
        label: isInvalid ? label : date.toLocaleDateString('en-US', { month: 'short' }),
        value,
        color: '#6366f1',
      };
    });

  const expiringDocumentAlerts = [
    ...alerts.passport.slice(0, 3).map(alert => ({ ...alert, type: 'PASSPORT' })),
    ...alerts.visa.slice(0, 3).map(alert => ({ ...alert, type: 'VISA' })),
    ...alerts.labour.slice(0, 3).map(alert => ({ ...alert, type: 'LABOUR' })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full  bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-indigo-600 border-b-indigo-600 border-r-slate-200 border-l-slate-200"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 ">
      {needImport && (
        <div className="p-4 rounded-[6px] bg-amber-50 border-2 border-amber-300 flex flex-wrap items-center gap-3">
          <span className="text-2xl">📸</span>
          <div className="flex-1 min-w-[280px]">
            <p className="font-bold text-amber-900">Purana PC data (images / cheques / receipts) abhi Firebase par nahi hai</p>
            <p className="text-sm text-amber-800 mt-1">
              Is liye web browser aur doosre PC par images nahi dikh rahin. Ek click mein sab kuch
              (employees, cheques, expenses <strong>+ saari images</strong>) cloud par bhej dein.
            </p>
            {importMsg && <p className="text-sm font-bold text-amber-900 mt-2">{importMsg}</p>}
          </div>
          <Button variant="warning" onClick={doImport} isLoading={importing}>⬆️ LAN se Firebase par import karein</Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-normal">Dashboard Overview</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">Queen International School — HR & Visa Intelligence Panel</p>
        </div>
        <button onClick={refreshStats} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/50 bg-white shadow-sm rounded-[6px] transition-all" title="Refresh">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Employees" value={stats.totalEmployees} color="blue" onClick={() => onNavigate('search-employee')} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard title="Expiring Passports" value={stats.expiringPassports} color="purple" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>} />
        <StatCard title="Expiring Visas" value={stats.expiringVisas} color="orange" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <StatCard title="Expired Documents" value={stats.expiredDocuments} color="red" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col justify-between"><h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-4">📋 Document Status</h3><div className="flex justify-center my-auto"><PieChart data={documentStatusData} size={170} /></div></Card>
        <Card className="p-6 flex flex-col justify-between"><h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-4">🌍 Nationalities</h3><div className="flex justify-center my-auto"><PieChart data={nationalityChartData} size={170} /></div></Card>
        <Card className="p-6 flex flex-col justify-between"><h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-4">📈 Monthly Joining Trends</h3><div className="my-auto">{monthlyData.length > 0 ? <BarChart data={monthlyData} height={170} /> : <div className="flex items-center justify-center h-[170px] text-slate-400">No data available</div>}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">⚠️ Expiring Documents</h3>
            <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full font-bold">
              {alerts.passport.length + alerts.visa.length + alerts.labour.length} pending alerts
            </span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {expiringDocumentAlerts.length === 0 
              ? <div className="text-center py-12 text-slate-400"><p className="text-sm font-medium">✅ All documents are up-to-date!</p></div>
              : expiringDocumentAlerts.map((a, i) => (
                <AlertCard key={i} title={a.employee.fullName} subtitle={`${a.type}: ${a.employee.passportNumber}`} status={a.status} daysLeft={a.daysLeft} onClick={() => onNavigate('search-employee')} />
              ))
            }
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-5">📋 System Activity Feed</h3>
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm font-medium">No system activity logged yet</p>
              </div>
            ) : recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3.5 p-3.5 bg-slate-50 hover:bg-indigo-50/20 rounded-[6px] border border-slate-100 transition-all">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-[6px] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-bold leading-snug">{activity.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed truncate">{activity.details}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-semibold tracking-wider uppercase">{formatDateTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="p-6 flex flex-col items-center justify-center"><DonutChart value={Math.max(0, stats.totalEmployees - stats.expiredDocuments)} max={stats.totalEmployees || 1} label="Valid Docs" color="#10B981" size={90} /></Card>
        <Card className="p-6 flex flex-col items-center justify-center"><DonutChart value={stats.expiringPassports} max={stats.totalEmployees || 1} label="Pass Warning" color="#6366f1" size={90} /></Card>
        <Card className="p-6 flex flex-col items-center justify-center"><DonutChart value={stats.expiringVisas} max={stats.totalEmployees || 1} label="Visa Warning" color="#f59e0b" size={90} /></Card>
        <Card className="p-6 flex flex-col items-center justify-center"><DonutChart value={stats.expiringLabour} max={stats.totalEmployees || 1} label="Labour Warning" color="#ef4444" size={90} /></Card>
      </div>
    </div>
  );
};
