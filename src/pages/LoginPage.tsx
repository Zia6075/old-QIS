// ============================================
// Login Page - Clean Professional Rebuild
// ============================================

import React, { useState, useEffect } from 'react';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Modal, Toast } from '../components/UI/Modal';
import { Logo } from '../components/UI/Logo';
import { APP_VERSION } from '../firebase/config';
import { getAllUsers, resetUserPassword } from '../database/userService';
import { User } from '../types';

import type { LoginMode } from '../hooks/useAuth';

interface LoginPageProps {
  onLogin: (mode: LoginMode, username: string, password: string, rememberMe: boolean) => Promise<boolean>;
  error: string | null;
  loading: boolean;
  clearError: () => void;
}

const FieldIcon: React.FC<{ type: 'user' | 'lock' }> = ({ type }) => (
  type === 'user' ? (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
  )
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, error, loading, clearError }) => {
  // ⭐ Login ka tareeqa: ☁️ Cloud (Firebase email) ya 🖥️ Local (admin/admin123)
  const [mode, setMode] = useState<LoginMode>('cloud');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);   // ⭐ default ON: logout tak session yaad
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { clearError(); }, [username, password, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(mode, username.trim(), password, rememberMe);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUser.trim()) { setToast({message:'Enter username',type:'error'}); return; }
    if (!newPass || newPass.length < 6) { setToast({message:'Password must be at least 6 characters',type:'error'}); return; }
    if (newPass !== confirmPass) { setToast({message:'Passwords do not match',type:'error'}); return; }
    if (securityAnswer.toLowerCase() !== 'queen') { setToast({message:'Wrong security answer!',type:'error'}); return; }

    setResetting(true);
    try {
      const users = await getAllUsers();
      const user = users.find((u: User) => u.username.toLowerCase() === forgotUser.toLowerCase());
      if (!user) { setToast({message:'User not found',type:'error'}); return; }
      await resetUserPassword(user.id, newPass);
      setToast({message:'Password reset! You can login now.',type:'success'});
      setShowForgot(false);
      setForgotUser(''); setNewPass(''); setConfirmPass(''); setSecurityAnswer('');
      setUsername(forgotUser);
    } catch {
      setToast({message:'Reset failed. Try again.',type:'error'});
    } finally { setResetting(false); }
  };

  return (
    <div className=" bg-[#F6F7FB] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(251,191,36,0.16),transparent_30%),radial-gradient(circle_at_88%_88%,rgba(217,119,6,0.12),transparent_30%)]" />

      <div className="relative w-full max-w-[1120px] min-h-[690px] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[8px] shadow-[0_28px_90px_rgba(15,23,42,0.15)] overflow-hidden border border-white/70 animate-scale-in">
        <section className="hidden lg:flex relative overflow-hidden bg-[#111827] px-16 py-14 flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#121826] to-[#2b2117]" />
          <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-amber-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 -left-24 w-[420px] h-[420px] rounded-full bg-amber-900/35 blur-[110px]" />

          <div className="relative z-10 pl-4">
            <div className="mb-14 pl-2">
              <Logo size={106} className="drop-shadow-[0_18px_45px_rgba(0,0,0,0.35)]" />
            </div>
            <h1 className="text-[46px] font-bold text-white tracking-normal leading-[1.1] pl-2">
              Queen International<br />
              <span className="text-amber-500">HR & Visa System</span>
              <span className="ml-3 align-middle text-[15px] font-bold text-white/70 bg-white/10 border border-white/20 rounded-full px-3 py-1">v{APP_VERSION}</span>
            </h1>
            <p className="mt-8 max-w-[440px] text-[17px] leading-8 font-semibold text-slate-300 pl-2">
              A secure and modern management system for staff records, documents, visas, salaries and school administration.
            </p>
          </div>

          <div className="relative z-10 pl-4">
            <div className="flex -space-x-3 mb-6 pl-2">
              {['Q','I','S','HR'].map((letter) => (
                <div key={letter} className="w-12 h-12 rounded-full bg-slate-800 border-2 border-[#111827] text-white flex items-center justify-center font-bold shadow-xl text-sm">{letter}</div>
              ))}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 border-2 border-[#111827] text-white flex items-center justify-center font-bold shadow-xl">✓</div>
            </div>
            <p className="text-white/90 text-sm italic font-semibold pl-2">“Authorized access only — live central database enabled.”</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-7 py-10 sm:px-12 lg:px-16 bg-white">
          <div className="w-full max-w-[430px]">
            <div className="lg:hidden flex justify-center mb-8">
              <Logo size={96} />
            </div>

            <div className="mb-6 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-3">Secure Portal</p>
              <h2 className="text-[34px] font-bold text-slate-900 tracking-normal leading-tight">Welcome Back</h2>
              <p className="text-base font-semibold text-slate-500 mt-2">
                {mode === 'cloud'
                  ? 'Firebase wali email aur password se login karein — data cloud par live sync hoga.'
                  : 'Local users (admin / staff) — bina internet, sirf is PC ka data.'}
              </p>
              {/* ⭐ Kaun sa account kya kar sakta hai — saaf bata dein */}
              <div className="mt-4 p-3 rounded-[6px] bg-slate-50 border border-slate-200 text-[12px] font-semibold text-slate-600 leading-relaxed">
                <p>🖥️ <b>admin@qis.local</b> / <b>staff@qis.local</b> → <b>full access</b> (add/edit/delete) — PC application ke liye</p>
                <p className="mt-1">👁️ <b>ishaq@gmail.com</b> / <b>queenschool@gmail.com</b> → <b>sirf dekhna</b> (read only) — browser/mobile ke liye</p>
              </div>
            </div>

            {/* ⭐ Mode tabs — anonymous bilkul band, sirf yeh 2 tareeqe */}
            <div className="mb-6 grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-[6px] border border-slate-200">
              <button
                type="button"
                onClick={() => { setMode('cloud'); setUsername(''); setPassword(''); clearError(); }}
                className={`px-3 py-3 rounded-[6px] text-[13px] font-bold transition-all ${mode === 'cloud' ? 'bg-white text-amber-700 shadow-sm border border-amber-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                ☁️ Cloud (Firebase)
              </button>
              <button
                type="button"
                onClick={() => { setMode('local'); setUsername(''); setPassword(''); clearError(); }}
                className={`px-3 py-3 rounded-[6px] text-[13px] font-bold transition-all ${mode === 'local' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                🖥️ Local (offline)
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-[6px] flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">🚫</span>
                <div>
                  <span className="text-red-600 text-sm font-bold leading-relaxed">{error}</span>
                  {/READ-ONLY|read only|permission/i.test(error) && (
                    <p className="text-red-500 text-xs font-semibold leading-relaxed mt-1">
                      💡 PC application par <b>full access</b> chahiye to <b>admin@qis.local / admin123</b> se login karein.
                      Gmail accounts (ishaq/queenschool) sirf <b>dekhne</b> ke liye hain (rules mein write allow nahi).
                    </p>
                  )}
                  <p className="text-red-500 text-xs font-semibold leading-relaxed mt-2">
                    {/ghalat|invalid|credential/i.test(error)
                      ? '➡️ Hal: RESET-PASSWORD.bat chalayein (ya Console → Authentication → Users → email → Reset password), phir wahi email/password daalein.'
                      : /rules|permission|connect/i.test(error)
                        ? '➡️ Hal: Console → Realtime Database → Rules → database.rules.json paste → Publish (detail: RULES.md).'
                        : /suspended/i.test(error)
                          ? '➡️ Hal: RECOVERY-API-SUSPENDED.md dekhein.'
                          : mode === 'cloud'
                            ? '➡️ Cloud tab mein wahi email daalein jo Firebase Console → Authentication mein add ki hai.'
                            : '➡️ Local users: admin / admin123 ya staff / staff123.'}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400">{mode === 'cloud' ? 'Email' : 'Username'}</label>
                <div className="flex min-h-14 items-center py-1 gap-3 rounded-[6px] border border-slate-200 bg-slate-50 px-4 transition-all focus-within:border-amber-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-600/20">
                  <span className="shrink-0 text-slate-400"><FieldIcon type="user" /></span>
                  <input
                    type={mode === 'cloud' ? 'email' : 'text'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={mode === 'cloud' ? 'aap-ki-email@example.com' : 'admin'}
                    required
                    autoComplete="username"
                    className="min-w-0 flex-1 bg-transparent text-base font-bold text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                <div className="flex min-h-14 items-center py-1 gap-3 rounded-[6px] border border-slate-200 bg-slate-50 px-4 transition-all focus-within:border-amber-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-600/20">
                  <span className="shrink-0 text-slate-400"><FieldIcon type="lock" /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    className="min-w-0 flex-1 bg-transparent text-base font-bold text-slate-800 placeholder-slate-400 outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="shrink-0 rounded-[6px] p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-700 transition-colors" title={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029M3 3l18 18" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30" />
                  <span className="text-xs text-slate-500 group-hover:text-slate-700 font-bold transition-colors">Remember me (logout tak logged-in rahein)</span>
                </label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-amber-700 font-bold hover:text-amber-800 transition-colors">Forgot Password?</button>
              </div>

              <Button type="submit" disabled={loading} className="w-full min-h-14 rounded-[6px] text-base shadow-[0_16px_34px_rgba(217,119,6,0.28)]">
                {loading ? 'Authenticating...' : mode === 'cloud' ? '☁️ Cloud Sign In' : '🖥️ Local Sign In'}
              </Button>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed pt-1">
                🔒 Anonymous access band hai — sirf email/password se login. "Remember me" par app band karne ke baad bhi logged-in rahein ge (Logout tak).
                {mode === 'cloud'
                  ? ' Email wahi chale gi jo Firebase Console → Authentication mein add ki hai.'
                  : ' Local mode mein cloud sync nahi hota (data sirf is PC par).'}
              </p>
            </form>

            <div className="mt-10 text-center">
              <p className="text-sm text-slate-400 font-bold">Authorized Personnel Only</p>
              <div className="flex items-center justify-center gap-5 mt-4 opacity-80">
                <span className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase"><i className="w-2 h-2 rounded-full bg-emerald-500" />System Secure</span>
                <span className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase"><i className="w-2 h-2 rounded-full bg-blue-500" />Encrypted DB</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Modal isOpen={showForgot} onClose={() => setShowForgot(false)} title="🔑 Reset Password" size="sm">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-[6px] border border-amber-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Security Question</p>
            <p className="text-amber-900 font-bold text-sm mt-0.5">What is the school name?</p>
          </div>
          <Input label="Username" value={forgotUser} onChange={(e) => setForgotUser(e.target.value)} placeholder="Enter your username" required />
          <Input label="Security Answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Answer the question above" required />
          <Input label="New Password" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Min 6 characters" required />
          <Input label="Confirm Password" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Retype new password" required />
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowForgot(false)}>Cancel</Button>
            <Button type="submit" isLoading={resetting}>Reset Password</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
