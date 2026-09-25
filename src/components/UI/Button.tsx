// ============================================
// Button Components - Clean Professional Amber Theme
// Text fully visible, proper size
// ============================================

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-600',
  secondary: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-500',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-transparent',
  outline: 'border-2 border-slate-300 text-slate-800 bg-white hover:bg-slate-50',
};

const sizeClasses = {
  sm: 'px-5 py-2.5 text-[15px] min-h-[44px]',
  md: 'px-7 py-3.5 text-[16px] min-h-[50px]',
  lg: 'px-8 py-4 text-[17px] min-h-[54px]',
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', isLoading = false, icon, children, className = '', disabled, ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2.5 font-semibold leading-normal rounded-[6px] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal break-words text-center min-w-[110px] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
      ) : icon ? <span className="shrink-0 flex items-center">{icon}</span> : null}
      <span className="leading-normal break-words text-center">{children}</span>
    </button>
  );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const iconSizeClasses = { sm: 'w-10 h-10', md: 'w-11 h-11', lg: 'w-12 h-12' };

export const IconButton: React.FC<IconButtonProps> = ({ variant = 'ghost', size = 'md', children, className = '', ...props }) => {
  return (
    <button className={`inline-flex items-center justify-center rounded-[6px] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${variantClasses[variant]} ${iconSizeClasses[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};