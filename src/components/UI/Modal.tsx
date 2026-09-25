// ============================================
// Modal / Toast Components - Aurora Premium Amber Theme
// ============================================

import React, { useEffect } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = 'auto'; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop intentionally has NO onClick to prevent accidental data loss */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
      <div className={`relative bg-white border border-slate-200 rounded-[8px] shadow-[0_20px_50px_rgba(0,0,0,0.20)] w-full ${sizeClasses[size]} max-h-[95vh] overflow-hidden animate-scale-in`}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <span className="h-7 w-1 rounded-[3px] bg-gradient-to-b from-amber-400 to-amber-700" />
            <h2 className="text-xl font-bold text-slate-800 tracking-normal text-left">{title}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 inline-flex items-center justify-center text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-[6px] transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(95vh-72px)] text-left">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary', isLoading = false }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <p className="text-slate-600 text-sm font-medium leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{cancelText}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
};

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);

  const typeConfig = {
    success: { bg: 'bg-emerald-600', icon: '✅' },
    error: { bg: 'bg-red-600', icon: '🚫' },
    warning: { bg: 'bg-amber-600', icon: '⚠️' },
    info: { bg: 'bg-blue-600', icon: 'ℹ️' },
  };
  const config = typeConfig[type];

  return (
    <div className={`fixed top-4 right-4 z-[110] flex items-center gap-3 px-4 py-3 rounded-[6px] text-sm font-medium text-white shadow-2xl animate-slide-in-right ${config.bg}`}>
      <span>{config.icon}</span>
      <span className="font-bold">{message}</span>
      <button onClick={onClose} className="ml-1 p-1 hover:bg-white/15 rounded-[6px] transition-colors" aria-label="Close toast"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>
  );
};
