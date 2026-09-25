// ============================================
// User Management Page - Modern Light Professional Theme
// ============================================

import { canWrite } from '../utils/platform';
import React, { useState, useEffect } from 'react';
import { Card } from '../components/UI/Card';
import { Button, IconButton } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Table } from '../components/UI/Table';
import { Modal, ConfirmDialog, Toast } from '../components/UI/Modal';
import { User } from '../types';
import { 
  getAllUsers, 
  createUser, 
  unlockUser, 
  deactivateUser,
  resetUserPassword 
} from '../database/userService';
import { logActivity, ACTIVITY_ACTIONS } from '../database/activityService';
import { formatDateTime } from '../utils/helpers';

interface UsersPageProps {
  userId: string;
}

export const UsersPage: React.FC<UsersPageProps> = ({ userId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'staff' as 'admin' | 'staff',
  });
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUserData.password.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser(
        newUserData.username,
        newUserData.password,
        newUserData.role,
        newUserData.fullName,
        newUserData.email
      );
      await logActivity(userId, ACTIVITY_ACTIONS.CREATE_USER, `Created user: ${newUserData.username}`);
      setToast({ message: 'User created successfully', type: 'success' });
      setShowAddModal(false);
      setNewUserData({ username: '', password: '', fullName: '', email: '', role: 'staff' });
      loadUsers();
    } catch (err) {
      setToast({ message: (err as Error).message || 'Failed to create user', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockUser = async (user: User) => {
    try {
      await unlockUser(user.id);
      await logActivity(userId, ACTIVITY_ACTIONS.UPDATE_USER, `Unlocked user: ${user.username}`);
      setToast({ message: `User ${user.username} unlocked`, type: 'success' });
      loadUsers();
    } catch (err) {
      setToast({ message: 'Failed to unlock user', type: 'error' });
    }
  };

  const handleDeactivate = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await deactivateUser(selectedUser.id);
      await logActivity(userId, ACTIVITY_ACTIONS.DELETE_USER, `Deactivated user: ${selectedUser.username}`);
      setToast({ message: 'User deactivated successfully', type: 'success' });
      setShowDeactivateDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      setToast({ message: 'Failed to deactivate user', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetUserPassword(selectedUser.id, newPassword);
      await logActivity(userId, ACTIVITY_ACTIONS.UPDATE_USER, `Reset password for user: ${selectedUser.username}`);
      setToast({ message: 'Password reset successfully', type: 'success' });
      setShowResetModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err) {
      setToast({ message: 'Failed to reset password', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'username',
      header: 'Username',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-[6px] flex items-center justify-center text-white font-bold text-sm ${
            user.role === 'admin' 
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-slate-800 font-bold text-sm leading-none">{user.username}</p>
            <p className="text-slate-400 font-semibold text-[11px] mt-1">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'fullName',
      header: 'Full Name',
      render: (user: User) => (
        <span className="text-slate-600 font-bold text-sm">{user.fullName}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          user.role === 'admin'
            ? 'bg-purple-50 text-purple-700 border border-purple-100'
            : 'bg-blue-50 text-blue-700 border border-blue-100'
        }`}>
          {user.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          {user.isLocked && (
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
              Locked
            </span>
          )}
          {!user.isActive && (
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              Inactive
            </span>
          )}
          {user.isActive && !user.isLocked && (
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              Active
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (user: User) => (
        <span className="text-slate-500 text-xs font-semibold">
          {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="flex items-center gap-1.5">
          {user.isLocked && (
            <IconButton 
              size="sm" 
              onClick={() => handleUnlockUser(user)}
              title="Unlock Account"
            >
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </IconButton>
          )}
          {canWrite() && <IconButton 
            size="sm"
            onClick={() => {
              setSelectedUser(user);
              setShowResetModal(true);
            }}
            title="Reset Password"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </IconButton>}
          {user.isActive && canWrite() && (
            <IconButton 
              size="sm" 
              variant="danger"
              onClick={() => {
                setSelectedUser(user);
                setShowDeactivateDialog(true);
              }}
              title="Deactivate Account"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </IconButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-8 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-normal">User Management</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">Configure security credentials and portal roles</p>
        </div>
        {canWrite() && <Button onClick={() => setShowAddModal(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}>
          Add System User
        </Button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Users</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{users.length}</p>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-lg">👥</div>
        </Card>
        <Card className="p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Administrators</p>
            <p className="text-3xl font-bold text-purple-700 mt-2">
              {users.filter(u => u.role === 'admin').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 font-bold text-lg">👑</div>
        </Card>
        <Card className="p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Staff Members</p>
            <p className="text-3xl font-bold text-blue-700 mt-2">
              {users.filter(u => u.role === 'staff').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 font-bold text-lg">💼</div>
        </Card>
        <Card className="p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Locked Accounts</p>
            <p className="text-3xl font-bold text-rose-700 mt-2">
              {users.filter(u => u.isLocked).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[6px] bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 font-bold text-lg">🔒</div>
        </Card>
      </div>

      {/* Users Table */}
      <Table
        columns={columns}
        data={users}
        keyField="id"
        isLoading={loading}
        emptyMessage="No system users configured yet"
      />

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New System User"
        size="md"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input
            label="Username"
            value={newUserData.username}
            onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value.toLowerCase() })}
            placeholder="e.g. zia"
            required
          />
          <Input
            label="Full Name"
            value={newUserData.fullName}
            onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
            placeholder="e.g. Zia Rehman"
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={newUserData.email}
            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
            placeholder="e.g. zia@queenschool.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={newUserData.password}
            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
            placeholder="Enter secure password"
            helperText="Minimum 6 characters"
            required
          />
          <Select
            label="User Role"
            value={newUserData.role}
            onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as 'admin' | 'staff' })}
            options={[
              { value: 'staff', label: 'Staff Member' },
              { value: 'admin', label: 'System Administrator' },
            ]}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setNewPassword('');
        }}
        title="Reset User Password"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-slate-600 text-sm font-medium leading-relaxed">
            Please enter a new password for account <strong>{selectedUser?.username}</strong>:
          </p>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            helperText="Minimum 6 characters"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} isLoading={isSubmitting}>
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Dialog */}
      <ConfirmDialog
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Account"
        message={`Are you sure you want to deactivate ${selectedUser?.username}? This user will no longer be allowed to log into the school system.`}
        confirmText="Deactivate Account"
        variant="danger"
        isLoading={isSubmitting}
      />

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
