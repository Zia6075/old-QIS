// ============================================
// Image Optimizer — purani full-size images ko chhota karein
// ============================================
// MASLA: aap ka employees node ~99 MB tha (77 employees, har ek ~1.3 MB)
// kyunke purani app ne FULL-SIZE images base64 mein save ki thin.
// Nateeja: har read 10s+ timeout, UI blink, mobile par bilkul na chale.
//
// HAL: yeh tool har image ko dobara 900px / JPEG q72 par compress kar ke
// wapas save karta hai. Aam tor par 95%+ size kam ho jati hai.
// ============================================

import { getAllEmployees, updateEmployee } from './employeeService';
import { getAllCheques, updateChequeInfo, getAllExpenses, updateExpense } from './accountingService';

export interface OptimizeProgress {
  done: number;
  total: number;
  current: string;
  beforeKB: number;
  afterKB: number;
}

const EMPLOYEE_FIELDS = ['personImagePath', 'passportImagePath', 'visaImagePath', 'labourCardImagePath'] as const;

/** data URL → chhoti JPEG data URL */
export const shrinkImage = (dataUrl: string, maxWidth: number, quality: number): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= maxWidth) { resolve(dataUrl); return; }   // pehle hi chhoti hai
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => reject(new Error('image load fail'));
    img.src = dataUrl;
  });

const kb = (s: string) => Math.round((s?.length || 0) / 1024);

/**
 * Saari images (employees + cheques + expenses) compress karein.
 * onProgress se UI mein live status dikha sakte hain.
 */
export const optimizeAllImages = async (
  onProgress?: (p: OptimizeProgress) => void,
  opts: { maxWidth?: number; quality?: number } = {}
): Promise<{ beforeMB: number; afterMB: number; changed: number }> => {
  const maxWidth = opts.maxWidth ?? 900;
  const quality = opts.quality ?? 0.72;

  const emps = await getAllEmployees();
  const cheques = await getAllCheques();
  const expenses = await getAllExpenses();
  const total = emps.length + cheques.length + expenses.length;

  let done = 0;
  let beforeKB = 0;
  let afterKB = 0;
  let changed = 0;

  const report = (current: string) =>
    onProgress?.({ done, total, current, beforeKB, afterKB });

  for (const e of emps) {
    report(e.fullName || e.id);
    const patch: Record<string, string> = {};
    let touched = false;
    for (const f of EMPLOYEE_FIELDS) {
      const v = (e as unknown as Record<string, string>)[f];
      if (typeof v !== 'string' || !v.startsWith('data:image')) continue;
      beforeKB += kb(v);
      const small = await shrinkImage(v, maxWidth, quality);
      afterKB += kb(small);
      if (small.length < v.length) { patch[f] = small; touched = true; }
    }
    if (touched) {
      await updateEmployee(e.id, patch as never);
      changed++;
    }
    done++;
    report(e.fullName || e.id);
  }

  for (const c of cheques) {
    report('Cheque ' + c.chequeNumber);
    if (typeof c.chequeImage === 'string' && c.chequeImage.startsWith('data:image')) {
      beforeKB += kb(c.chequeImage);
      const small = await shrinkImage(c.chequeImage, 1000, quality);
      afterKB += kb(small);
      if (small.length < c.chequeImage.length) {
        await updateChequeInfo(c.id, { chequeImage: small });
        changed++;
      }
    }
    done++;
    report('Cheque ' + c.chequeNumber);
  }

  for (const x of expenses) {
    report('Expense ' + (x.description || x.id));
    if (typeof x.receiptImage === 'string' && x.receiptImage.startsWith('data:image')) {
      beforeKB += kb(x.receiptImage);
      const small = await shrinkImage(x.receiptImage, 1000, quality);
      afterKB += kb(small);
      if (small.length < x.receiptImage.length) {
        await updateExpense(x.id, { receiptImage: small });
        changed++;
      }
    }
    done++;
    report('Expense ' + (x.description || x.id));
  }

  return {
    beforeMB: Math.round((beforeKB / 1024) * 10) / 10,
    afterMB: Math.round((afterKB / 1024) * 10) / 10,
    changed,
  };
};


/**
 * ⭐ Chhota sa thumbnail (list mein avatar ke liye) — record ke andar rehta hai
 * taake list load karne par bari images download na hon.
 */
export const makeThumb = (dataUrl: string, size = 96): Promise<string> =>
  new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image') || typeof document === 'undefined') { resolve(''); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        // center-crop square
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
