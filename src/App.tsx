// ============================================
// Queen International School - HR System
// Clean Shell (text-safe rebuild)
// ============================================

import React, { useState, useEffect } from 'react';
import { Page, User } from './types';

import { initializeDefaultUsers } from './database/userService';
import { seedDatabase } from './database/seedData';
import { useAuth } from './hooks/useAuth';

import { Sidebar } from './components/Layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AddEmployeePage } from './pages/AddEmployeePage';
import { SearchEmployeePage } from './pages/SearchEmployeePage';
import { ReportsPage } from './pages/ReportsPage';
import { BackupPage } from './pages/BackupPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { AccountingFullPage } from './pages/AccountingFullPage';
import { unlockAllCheques } from './database/accountingService';
import { getSyncStatus, subscribeSync, getConnectionStatus, startLocalMode } from './database/db';
import { canWrite } from './utils/platform';
import { APP_VERSION } from './firebase/config';
import { Logo } from './components/UI/Logo';

const customStyles = `
  @keyframes blink { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0.35; } }
  .animate-blink { animation: blink 1s ease-in-out infinite; }
  @keyframes modal-in { from { opacity: 0; transform: scale(0.98) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .animate-modal-in { animation: modal-in 0.22s ease-out; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }
`;

const pageTitles: Record<Page, { title: string; subtitle: string }> = {
  login: { title: 'Login', subtitle: 'Secure access' },
  dashboard: { title: 'Dashboard', subtitle: 'HR & Visa Intelligence' },
  'add-employee': { title: 'Add Employee', subtitle: 'Create employee profile' },
  'search-employee': { title: 'Employee Search', subtitle: 'Find and manage records' },
  'employee-details': { title: 'Employee Details', subtitle: 'Profile overview' },
  reports: { title: 'Reports & Analytics', subtitle: 'Documents, visa and payroll insights' },
  accounting: { title: 'Accounts & Expenses', subtitle: 'Financial management' },
  settings: { title: 'Settings', subtitle: 'Account and system preferences' },
  backup: { title: 'Database Backup', subtitle: 'Export, restore and safeguard data' },
  users: { title: 'User Management', subtitle: 'Roles and access control' },
};

interface TopBarProps {
  currentPage: Page;
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ currentPage, onLogout }) => {
  const meta = pageTitles[currentPage] || pageTitles.dashboard;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // ☁️ Firebase live-sync indicator
  const [sync, setSync] = useState(() => getSyncStatus());
  useEffect(() => {
    // ⭐ FIX (blinking): pehle har 2s par NAYA object set hota tha → poori app
    // dobara render hoti thi (pages blink karti thin). Ab sirf tab update karte
    // hain jab koi asal cheez badli ho.
    const apply = () => {
      const next = getSyncStatus();
      setSync(prev => (
        prev.mode === next.mode &&
        prev.connected === next.connected &&
        prev.owner === next.owner &&
        prev.email === next.email &&
        prev.lastSync === next.lastSync
          ? prev
          : next
      ));
    };
    const off = subscribeSync(apply);
    const t = setInterval(apply, 5000);
    return () => { off(); clearInterval(t); };
  }, []);
  const agoText = sync.secondsAgo === null ? 'connecting…' : sync.secondsAgo < 5 ? 'abhi' : sync.secondsAgo < 60 ? `${sync.secondsAgo}s pehle` : sync.secondsAgo < 3600 ? `${Math.round(sync.secondsAgo / 60)}m pehle` : `${Math.round(sync.secondsAgo / 3600)}h pehle`;
  // ⭐ FIX: pehle web par bhi "LAN MODE" likha aata tha (wahan LAN server hota hi nahi).
  // Ab 3 saaf states: CLOUD / LOCAL PC / OFFLINE.
  const conn = getConnectionStatus();
  const connLabel = conn === 'cloud' ? `☁️ CLOUD LIVE • ${agoText}` : conn === 'local' ? '🖥️ LOCAL PC' : '⚠️ OFFLINE — login karein';
  const connCls = conn === 'cloud'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : conn === 'local' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700';

  return (
    <header className="shrink-0 z-20 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[220px] flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-normal">{meta.title}</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">{today}</p>
        </div>

        <div className="min-w-[280px] max-w-[560px] flex-[2]">
          <div className="flex h-11 items-center gap-3 rounded-[6px] border border-slate-200 bg-slate-50 px-3.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search employees, passports, visa records..."
              className="flex-1 bg-transparent text-[14px] font-medium text-slate-700 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!canWrite() && (
            <span
              title="Browser (web) mode READ ONLY hai — Add/Edit/Delete sirf PC application se. Data sirf dekha ja sakta hai."
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700"
            >
              🔒 READ ONLY
            </span>
          )}
          <span
            title={conn === 'cloud' ? `Firebase project: ${sync.project}\nNode: ${sync.owner}\nLast sync: ${sync.lastSync || '—'}` : conn === 'local' ? 'Local PC server (D:\\HR Backup) — cloud sync nahi' : 'Na cloud na local — ☁️ Cloud tab se login karein'}
            className={`inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-2 text-[13px] font-semibold ${connCls}`}
          >
            <span className={`h-2 w-2 rounded-full ${conn === 'cloud' ? 'bg-emerald-500' : conn === 'local' ? 'bg-amber-500' : 'bg-rose-500'}`} />
            {connLabel}
          </span>
          {/* ⭐ version tag — har update par yeh number badal jata hai */}
          <span
            title={`QIS HR & Visa System\nVersion ${APP_VERSION}\nProject: ${sync.project}\nLast sync: ${sync.lastSync || '—'}`}
            className="inline-flex items-center rounded-[6px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold tracking-wider text-slate-500"
          >
            v{APP_VERSION}
          </span>
          <button className="h-11 w-11 rounded-[6px] border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center" title="Notifications">🔔</button>
          <button onClick={onLogout} className="h-11 rounded-[6px] bg-red-600 px-5 text-[14px] font-semibold text-white hover:bg-red-700">
            Logout ↪
          </button>
        </div>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initStatus, setInitStatus] = useState('Starting...');
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    // ⭐ FIX #1 (CRITICAL): pehle app TAB tak kuch render nahi karti thi jab tak
    // Firebase connect + users + seeding + unlock sab na ho jaye
    // ("Loading database schema..." wahi wajah thi).
    // Ab: app foran khulti hai, yeh sab BACKGROUND mein chalta hai.
    const startedAt = performance.now();
    setInitStatus('Starting...');
    setIsInitialized(true);          // ← login page FORAN (kisi cheez ka intezar nahi)

    // ⭐ App LOCAL se shuru hoti hai — Firebase login ke BAAD connect hota hai.
    // (Anonymous band hai; cloud sirf aap ki email/password se)
    startLocalMode()
      .then(async (msg) => {
        console.log(`🖥️ ${msg}  (${Math.round(performance.now() - startedAt)}ms)`);
        setInitStatus('Ready — please sign in');
        // Browser-only (koi LAN server nahi) ho to bata dein — Cloud login se chale ga
        if (/nahi mila/i.test(msg)) setOfflineMsg('Local server nahi mila — ☁️ Cloud (Firebase) se login karein.');
        void initializeDefaultUsers().catch(e => console.warn('users init:', e));
        void seedDatabase().catch(e => console.warn('seed:', e));
        void unlockAllCheques()
          .then(n => { if (n > 0) console.log(`✅ ${n} purane cheque(s) unlock`); })
          .catch(e => console.warn('unlock:', e));
      })
      .catch((err) => {
        console.warn('⚠️ local init fail:', err);
        setOfflineMsg(err instanceof Error ? err.message : 'Unknown error');
      });
  }, []);

  const handleNavigate = (page: Page) => setCurrentPage(page);

  // ⭐ FIX #1: init fail ho to bhi app band nahi hoti — sirf banner dikhta hai
  // (pehle poori app atak jati thi aur "Retry Connection" dabana padta tha)
  const offlineBanner = offlineMsg ? (
    <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[12px] font-semibold text-amber-800 flex flex-wrap items-center gap-2">
      ⚠️ <strong>OFFLINE MODE</strong> — Firebase se connect nahi ho saka, app local data par chal rahi hai
      (cloud sync pause). Wajah: {offlineMsg.slice(0, 110)}
      <button onClick={() => window.location.reload()} className="underline font-bold">Retry</button>
    </div>
  ) : null;


  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <style>{customStyles}</style>
        <div className="text-center bg-white rounded-[6px] border border-slate-200 shadow-xl p-12">
          <div className="mx-auto mb-6 animate-pulse"><Logo size={84} /></div>
          <h2 className="text-2xl font-bold text-slate-800">Queen International School</h2>
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mt-2">{initStatus}</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <><style>{customStyles}</style><LoginPage onLogin={auth.login} error={auth.error} loading={auth.loading} clearError={auth.clearError} /></>;
  }

  // ⭐ Browser (READ ONLY) mein write wale pages khulte hi nahi
  const effectivePage: Page = (!canWrite() && ['add-employee', 'users', 'backup'].includes(currentPage))
    ? 'dashboard'
    : currentPage;

  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard': return <DashboardPage onNavigate={handleNavigate} />;
      case 'add-employee': return <AddEmployeePage userId={auth.user?.id || ''} />;
      case 'search-employee': return <SearchEmployeePage userId={auth.user?.id || ''} isAdmin={auth.isAdmin} />;
      case 'reports': return <ReportsPage userId={auth.user?.id || ''} />;
      case 'accounting': return <AccountingFullPage userId={auth.user?.id || ''} />;
      case 'backup': return auth.isAdmin ? <BackupPage userId={auth.user?.id || ''} /> : <DashboardPage onNavigate={handleNavigate} />;
      case 'users': return auth.isAdmin ? <UsersPage userId={auth.user?.id || ''} /> : <DashboardPage onNavigate={handleNavigate} />;
      case 'settings': return <SettingsPage user={auth.user as User} />;
      default: return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="h-screen flex bg-[#F6F7FB] antialiased overflow-hidden text-slate-800">
      <style>{customStyles}</style>
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} isAdmin={auth.isAdmin} userName={auth.user?.fullName || 'User'} onLogout={auth.logout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {offlineBanner}
        <TopBar currentPage={currentPage} onLogout={auth.logout} />
        <main className="flex-1 overflow-y-auto bg-[#F6F7FB]">
          <div className="max-w-[1600px] mx-auto w-full">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
