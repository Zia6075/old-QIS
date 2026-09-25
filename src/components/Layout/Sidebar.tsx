// ============================================
// Sidebar - Clean Professional Text-Safe Shell
// ============================================

import React, { useState, useEffect } from 'react';
import { Page } from '../../types';
import { Logo } from '../UI/Logo';
import { APP_VERSION } from '../../firebase/config';
import { canWrite } from '../../utils/platform';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isAdmin: boolean;
  userName: string;
  onLogout: () => void;
}

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'add-employee', label: 'Add Employee', icon: '👤' },
  { id: 'search-employee', label: 'Employee Search', icon: '🔎' },
  { id: 'reports', label: 'Reports & Analytics', icon: '📊' },
  { id: 'accounting', label: 'Accounts & Expenses', icon: '💰' },
  { id: 'backup', label: 'Database Backup', icon: '🗄️', adminOnly: true },
  { id: 'users', label: 'User Management', icon: '👥', adminOnly: true },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isAdmin, userName, onLogout }) => {
  // ⭐ Browser (READ ONLY) mein write wale pages hi nahi dikhte
  const WRITE_PAGES: NavItem['id'][] = ['add-employee', 'backup', 'users'];
  const filteredItems = navItems.filter(item =>
    (!item.adminOnly || isAdmin) && (canWrite() || !WRITE_PAGES.includes(item.id))
  );
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const isLocalFile = window.location.protocol === 'file:';
        const isDev = window.location.port === '5173';
        const base = (isLocalFile || isDev) ? 'http://localhost:3000' : window.location.origin;
        const res = await fetch(`${base}/api/ip`);
        if (res.ok) {
          const data = await res.json();
          if (data.ip && data.ip !== '127.0.0.1' && data.ip !== 'localhost') {
            setMobileUrl(`http://${data.ip}:${data.port}`);
          } else {
            // fallback: still show localhost if no LAN IP found
            setMobileUrl(`http://localhost:${data.port || 3000}`);
          }
        }
      } catch (err) {
        console.warn('Could not load server IP address', err);
        // Fallback for dev
        setMobileUrl('http://localhost:3000');
      }
    };
    fetchIp();
  }, []);

  return (
    <aside className="w-[292px] shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col z-40 overflow-hidden">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-4 min-w-0">
          <Logo size={54} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 tracking-normal leading-tight break-words">Queen International</h1>
            <p className="text-[11px] text-amber-700 font-bold tracking-wider uppercase mt-1 leading-normal">
              HR System <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-normal normal-case">v{APP_VERSION}</span>
            </p>
            {!canWrite() && (
              <p className="mt-2 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-700 tracking-wide uppercase">
                🔒 Read only (browser)
              </p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1.5">
          {filteredItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[6px] transition-all duration-150 text-left min-h-[44px] ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-md shadow-amber-600/25'
                      : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                  }`}
                >
                  <span className="w-8 shrink-0 text-[22px] leading-none text-center">{item.icon}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-bold leading-normal break-words">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {mobileUrl && (
        <div className="mx-3 mb-3 rounded-[6px] border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 leading-normal">LAN Sync Live</p>
          <p className="mt-1 select-all break-all rounded-md border border-emerald-100 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 leading-normal">{mobileUrl}</p>
        </div>
      )}

      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3 rounded-[6px] border border-amber-100 bg-amber-50 p-3 min-w-0">
          <div className="w-10 h-10 rounded-[6px] bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-base shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 break-words leading-tight">{userName}</p>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider leading-normal">{isAdmin ? 'Super Admin' : 'Staff User'}</p>
          </div>
          <button onClick={onLogout} title="Logout" className="w-9 h-9 rounded-[6px] bg-white border border-amber-100 text-red-500 hover:bg-red-50 hover:border-red-100 flex items-center justify-center shrink-0">↪</button>
        </div>
      </div>
    </aside>
  );
};
