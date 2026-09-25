// ============================================
// Input Components - Clean Professional Field System
// Text-safe: no fixed-height clipping, no icon overlap
// ============================================

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className = '', ...props }, ref) => {
    const inputBase = `w-full min-h-[48px] rounded-[6px] border px-3.5 py-2.5 text-[14px] leading-normal bg-white text-slate-800 placeholder-slate-400 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 ${error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'}`;

    return (
      <div className="space-y-1.5 min-w-0">
        {label && (
          <label className="block text-[11px] leading-normal font-bold uppercase tracking-wider text-slate-600 break-words text-left">
            {label}
            {props.required && <span className="text-red-500 font-bold ml-1">*</span>}
          </label>
        )}

        {icon ? (
          <div className={`group flex min-h-[48px] items-center gap-2.5 rounded-[6px] border bg-white px-3 py-2 transition-all focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/25 ${error ? 'border-red-400 focus-within:ring-red-500/20 focus-within:border-red-500' : 'border-slate-200'} ${className.includes('text-right') ? 'flex-row-reverse' : ''}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-400 group-focus-within:text-amber-700">
              {icon}
            </span>
            <input
              ref={ref}
              className={`min-w-0 flex-1 bg-transparent py-1 text-[14px] leading-normal font-semibold text-slate-800 placeholder-slate-400 outline-none text-left ${className}`}
              {...props}
            />
          </div>
        ) : (
          <input
            ref={ref}
            className={`${inputBase} text-left ${className}`}
            {...props}
          />
        )}

        {error && <p className="text-xs leading-relaxed text-red-600 font-bold break-words text-left">{error}</p>}
        {helperText && !error && <p className="text-xs leading-relaxed text-slate-500 font-medium break-words text-left">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 min-w-0">
        {label && (
          <label className="block text-[11px] leading-normal font-bold uppercase tracking-wider text-slate-600 break-words text-left">
            {label}
            {props.required && <span className="text-red-500 font-bold ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full min-h-[48px] rounded-[6px] border px-3.5 py-2.5 text-[14px] leading-normal bg-white text-slate-800 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 text-left ${error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200'} ${className}`}
          {...props}
        >
          <option value="">Select {label || 'Option'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {error && <p className="text-xs leading-relaxed text-red-600 font-bold break-words text-left">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
