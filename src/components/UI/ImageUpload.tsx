// ============================================
// Image Upload - Light Theme - with auto compression
// ============================================

import React, { useRef, useState } from 'react';
import { isReadOnly } from '../../utils/platform';

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (base64: string) => void;
  onClear: () => void;
  accept?: string;
  maxSize?: number;
  error?: string;
  className?: string;
  previewSize?: 'sm' | 'md' | 'lg';
}

const previewSizes = { sm: 'w-20 h-20', md: 'w-28 h-28', lg: 'w-36 h-36' };

// Compress image client-side to keep DB fast
const compressImage = (file: File, maxWidth = 600, quality = 0.78): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('canvas fail'); return; }
        ctx.drawImage(img, 0, 0, width, height);
        // jpeg is ~5-10x smaller than png for photos
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, value, onChange, onClear, accept = 'image/*', maxSize = 25, error, className = '', previewSize = 'md' }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // ⭐ FIX (CRITICAL): READ-ONLY mode (browser/web) mein upload field HI NAHI
  // dikhe ga — component ke andar guard hai is liye saare 15 usages ek saath
  // cover ho jate hain (kahin chhootne ka khatra nahi).
  // PC application (Electron) par isDesktopApp() true hota hai → field aata hai.
  if (isReadOnly()) return null;
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setLocalError(null);
    if (!file.type.startsWith('image/')) { setLocalError('Please upload an image'); return; }
    // ⭐ FIX: pehle limit 5MB thi — phone ki photos aksar 5-10MB hoti hain aur
    // "Max size: 5MB" par upload fail ho jata tha. Ab 25MB (compress ke baad chhoti ho jati hai).
    if (file.size > maxSize * 1024 * 1024) {
      setLocalError(`Image bohat bari hai (${(file.size / 1024 / 1024).toFixed(1)}MB) — ziyada se ziyada ${maxSize}MB`);
      return;
    }
    setProcessing(true);
    try {
      // person photo = smaller, documents = larger
      // ⭐ Firebase guide §7: RTDB thumbs 600px, JPEG q78 (Storage ke baghair)
      const isPerson = label.toLowerCase().includes('person') || label.toLowerCase().includes('photo') && !label.toLowerCase().includes('passport');
      const maxW = isPerson ? 320 : 600;
      const q = isPerson ? 0.72 : 0.78;
      const base64 = await compressImage(file, maxW, q);
      onChange(base64);
    } catch (e) {
      setLocalError(`Image process nahi ho saki — ${e instanceof Error ? e.message : 'dobara koshish karein ya doosri file lein'}`);
    }
    finally { setProcessing(false); }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  };

  const displayError = error || localError;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">{label}</label>
      
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Preview" loading="lazy" decoding="async" className={`${previewSizes[previewSize]} rounded-[6px] border-2 border-amber-200 bg-white shadow-sm object-cover`} />
          <button
            type="button"
            onClick={() => { onClear(); setLocalError(null); }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg text-xs"
          >✕</button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => !processing && inputRef.current?.click()}
          className={`${previewSizes[previewSize]} border-2 border-dashed rounded-[6px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${dragActive ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-amber-400 bg-slate-50'} ${displayError ? 'border-red-400' : ''} ${processing ? 'opacity-60 cursor-wait' : ''}`}
        >
          {processing ? (
            <svg className="animate-spin w-5 h-5 text-amber-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-xs text-gray-400">Upload</span>
            </>
          )}
        </div>
      )}
      
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      {displayError && <p className="text-xs text-red-500">{displayError}</p>}
    </div>
  );
};