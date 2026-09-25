// ============================================
// Image Viewer Modal
// To prevent blank windows in Electron
// ============================================

import React, { useEffect } from 'react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageSrc, title = 'Image Viewer' }) => {
  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Print - ${title}</title>
      <style>
        @page { margin: 0; }
        body { margin: 0; display:flex; align-items:center; justify-content:center; height:100vh; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      </style>
      </head><body>
      <img src="${imageSrc}" onload="window.print(); window.onafterprint=function(){window.close()}"/>
      </body></html>
    `);
    w.document.close();
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose, imageSrc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Content */}
      <div className="relative w-full h-full flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 z-10 gap-3">
          <h2 className="text-xl font-bold text-white drop-shadow-md flex-1 min-w-0">{title}</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-[6px] font-semibold text-sm flex items-center gap-2 transition-colors"
              title="Print (Ctrl+P)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-auto">
          <img 
            src={imageSrc} 
            alt={title}
            className="max-w-full max-h-full object-contain shadow-2xl rounded-[6px]"
            style={{ 
              filter: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.3))',
              cursor: 'default' 
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Footer info */}
        <div className="text-center py-4 text-white/70 text-sm font-semibold">
          Ctrl+P to Print • ESC to Close • Click outside to close
        </div>
      </div>
    </div>
  );
};
