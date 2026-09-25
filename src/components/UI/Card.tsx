// ============================================
// Card Components - Clean Professional System
// Text-safe and less bulky rounded boxes
// ============================================

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#E8EDF5] rounded-[8px] shadow-[0_4px_16px_rgba(15,23,42,0.045)] transition-all duration-200 overflow-hidden ${
        onClick ? 'cursor-pointer hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:border-amber-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  onClick?: () => void;
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-700 shadow-blue-600/20',
  green: 'from-emerald-500 to-emerald-700 shadow-emerald-600/20',
  orange: 'from-amber-500 to-amber-700 shadow-amber-600/25',
  red: 'from-rose-500 to-rose-700 shadow-rose-600/20',
  purple: 'from-purple-500 to-purple-700 shadow-purple-600/20',
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick }) => {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <Card onClick={onClick} className="group relative p-5">
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 leading-normal break-words">{title}</p>
          <p className="text-[28px] font-bold text-slate-900 tracking-normal leading-tight break-words">{displayValue}</p>
        </div>
        <div className={`w-12 h-12 shrink-0 bg-gradient-to-br ${colorClasses[color]} rounded-[8px] flex items-center justify-center shadow-md text-white transition-transform group-hover:scale-105`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

interface AlertCardProps {
  title: string;
  subtitle: string;
  status: 'safe' | 'warning' | 'danger' | 'expired';
  daysLeft: number;
  onClick?: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ title, subtitle, status, daysLeft, onClick }) => {
  const statusConfig = {
    safe: { bg: 'bg-emerald-50/70 border-emerald-100 hover:border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
    warning: { bg: 'bg-amber-50/80 border-amber-100 hover:border-amber-200', badge: 'bg-amber-100 text-amber-700' },
    danger: { bg: 'bg-red-50/75 border-red-100 hover:border-red-200 animate-pulse', badge: 'bg-red-100 text-red-700' },
    expired: { bg: 'bg-red-50 border-red-200 hover:border-red-300', badge: 'bg-red-600 text-white animate-blink' },
  };
  const config = statusConfig[status];

  return (
    <div onClick={onClick} className={`p-4 rounded-[6px] border ${config.bg} ${onClick ? 'cursor-pointer hover:scale-[1.005] transition-all duration-200' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 break-words leading-relaxed">{title}</p>
          <p className="text-xs text-slate-600 font-bold mt-0.5 break-words leading-relaxed">{subtitle}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs font-bold whitespace-nowrap leading-relaxed ${config.badge}`}>
          {daysLeft < 0 ? 'EXPIRED' : `${daysLeft} days`}
        </span>
      </div>
    </div>
  );
};
