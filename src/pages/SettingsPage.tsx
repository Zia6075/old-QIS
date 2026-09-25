// ============================================
// Settings Page Component - Modern Light Professional Theme
// ============================================

import React, { useState } from 'react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Toast } from '../components/UI/Modal';
import { changePassword } from '../database/userService';
import { User } from '../types';

interface SettingsPageProps {
  user: User;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setToast({ message: 'New passwords do not match', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(user.id, currentPassword, newPassword);
      setToast({ message: 'Password changed successfully', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setToast({ message: (err as Error).message || 'Failed to change password', type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-8 ">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-normal">System Settings</h1>
        <p className="text-slate-400 font-bold text-sm mt-1">Manage your account profile and security credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <Card className="p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">Profile Information</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[6px] flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-100">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{user.fullName}</p>
                  <p className="text-slate-400 font-bold text-xs">@{user.username}</p>
                  <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-purple-50 text-purple-700 border border-purple-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {user.role === 'admin' ? 'Administrator' : 'Staff Member'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between py-1.5">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Email</span>
                  <span className="text-slate-700 text-sm font-semibold">{user.email || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Last Login</span>
                  <span className="text-slate-700 text-sm font-semibold">
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleString()
                      : 'First login'
                    }
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Account Created</span>
                  <span className="text-slate-700 text-sm font-semibold">{new Date(user.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card className="p-6 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              helperText="Minimum 6 characters"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
            <Button 
              type="submit" 
              isLoading={isChangingPassword}
              className="w-full mt-4"
            >
              Update Password
            </Button>
          </form>
        </Card>

        {/* System Information */}
        <Card className="p-6 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">System Information</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Application Name</span>
              <span className="text-slate-700 text-sm font-bold">Queen International School - HR System</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">System Version</span>
              <span className="text-slate-700 text-sm font-bold">1.1.0 (Wireless LAN Edition)</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Technology Stack</span>
              <span className="text-slate-700 text-sm font-semibold">React + TypeScript + Express</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Database</span>
              <span className="text-slate-700 text-sm font-semibold">JSON Central Database</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sync Environment</span>
              <span className="text-slate-700 text-sm font-semibold">Same Wi-Fi Network</span>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">Expiry Alert Thresholds</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-slate-700 font-bold text-sm">Passport Expiry Alert</p>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">Alert visibility duration</p>
              </div>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-[6px] border border-slate-200">30 Days</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-slate-700 font-bold text-sm">Visa Expiry Alert</p>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">Alert visibility duration</p>
              </div>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-[6px] border border-slate-200">30 Days</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-slate-700 font-bold text-sm">Critical Alert Threshold</p>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">Danger alarm activation days</p>
              </div>
              <span className="px-3 py-1.5 bg-rose-50 text-rose-700 font-bold text-xs rounded-[6px] border border-rose-100">7 Days</span>
            </div>
          </div>
          <div className="mt-6 p-4.5 bg-indigo-50/50 rounded-[6px] border border-indigo-100 text-left">
            <p className="text-indigo-800 text-xs leading-relaxed font-semibold">
              <strong>📢 ALERT COLOR CODE LEGEND:</strong><br />
              🟢 Green Badge = Safe duration (More than 30 days remaining)<br />
              🟠 Orange Badge = Warning duration (8 to 30 days remaining)<br />
              🔴 Red Badge = Critical / Expired (Less than 7 days remaining or expired)
            </p>
          </div>
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
