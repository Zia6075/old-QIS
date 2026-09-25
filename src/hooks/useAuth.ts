// ============================================
// Authentication Hook
// ============================================

import { useState, useCallback, useEffect } from 'react';
import type { AuthState } from '../types';
import { authenticateUser } from '../database/userService';
export type LoginMode = 'local' | 'cloud';
import { firebaseSignOut } from '../firebase/auth';
import { refreshAllStores, switchToLocal, connectFirebase } from '../database/db';
import { logActivity, ACTIVITY_ACTIONS } from '../database/activityService';

const AUTH_STORAGE_KEY = 'hr_auth_state';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    rememberMe: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ⭐ REMEMBER ME: app band karne par bhi session yaad rehti hai —
  // jab tak khud Logout na karein, local aur cloud dono logged-in rehte hain.
  // (Remember me NA tick kiya ho to har baar login karna pare ga)
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as AuthState & { mode?: LoginMode };
          if (parsed?.isAuthenticated && parsed?.user && parsed?.rememberMe) {
            // Cloud session thi to Firebase dobara jor dein (SDK khud persist karta hai)
            if (parsed.mode === 'cloud') {
              try { await connectFirebase(); }
              catch (e) { console.warn('cloud restore (offline chale ga):', e instanceof Error ? e.message : e); }
            }
            setAuthState({ ...parsed });
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
      } finally {
        setLoading(false);
      }
    };
    void restore();
  }, []);

  const login = useCallback(async (
    mode: LoginMode,
    username: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const result = await authenticateUser(username, password, mode);
      
      if (result.success && result.user) {
        const newAuthState: AuthState = {
          isAuthenticated: true,
          user: result.user,
          rememberMe,
          mode,
        };
        
        setAuthState(newAuthState);

        // ⭐ Cloud mode mein Firebase connect userService ke andar hi ho chuka hai.
        // Yahan sirf data taaza kar lete hain (images samet).
        if (mode === 'cloud') {
          try { await refreshAllStores(); } catch (e) { console.warn('refresh (non-fatal):', e); }
        }

        if (rememberMe) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }

        try {
          await logActivity(
            result.user.id,
            ACTIVITY_ACTIONS.LOGIN,
            `User ${username} logged in successfully`
          );
        } catch (logErr) {
          console.error('Activity log error:', logErr);
        }

        return true;
      } else {
        setError(result.error || 'Login failed');
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authState.user) {
        await logActivity(
          authState.user.id,
          ACTIVITY_ACTIONS.LOGOUT,
          `User ${authState.user.username} logged out`
        );
      }
    } catch (err) {
      console.error('Logout activity log error:', err);
    }

    setAuthState({
      isAuthenticated: false,
      user: null,
      rememberMe: false,
    });

    localStorage.removeItem(AUTH_STORAGE_KEY);
    try { await firebaseSignOut(); } catch { /* noop */ }
    try { await switchToLocal(); } catch { /* noop */ }
  }, [authState.user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAdmin = authState.user?.role === 'admin';

  return {
    ...authState,
    loading,
    error,
    isAdmin,
    login,
    logout,
    clearError,
  };
};
