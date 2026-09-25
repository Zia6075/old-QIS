// ============================================
// Platform detect — PC app (Electron) vs Browser (web)
// ============================================
// ⭐ Rule: BROWSER = READ ONLY (sirf dekhna), PC APPLICATION = full control.
// ============================================

/** kya yeh PC ki EXE application (Electron) hai? */
export const isDesktopApp = (): boolean => {
  try {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    if (/Electron/i.test(ua)) return true;
    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') return true;
    return false;
  } catch {
    return false;
  }
};

/** kya abhi sirf padhna allowed hai (browser mode)? */
export const isReadOnly = (): boolean => !isDesktopApp();

export const READ_ONLY_MESSAGE =
  '🔒 Browser (web) READ ONLY mode mein hai — sirf dekh sakte hain. ' +
  'Add / Edit / Delete sirf PC application se ho sakta hai.';

/** write ki koshish par saaf error */
export class ReadOnlyError extends Error {
  constructor(op: string) {
    super(`🔒 "${op}" browser mein allowed nahi — READ ONLY mode. PC application se karein.`);
    this.name = 'ReadOnlyError';
  }
}

/** write allowed hai? (UI buttons chhupane ke liye) */
export const canWrite = (): boolean => isDesktopApp();
