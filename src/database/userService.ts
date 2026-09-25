// ============================================
// User Service Layer - Authentication
// ============================================

import { User } from '../types';
import { addRecord, updateRecord, getRecord, getAllRecords, getRecordByIndex, whenDatabaseReady } from './db';
import { firebaseCreateAccount, firebaseSignIn } from '../firebase/auth';
import { connectFirebase } from './db';
import { isReadOnly } from '../utils/platform';
import { usernameToEmail, DEFAULT_OWNER, isAllowedEmail } from '../firebase/config';

const STORE_NAME = 'users';
const MAX_LOGIN_ATTEMPTS = 5;
// Lock duration in minutes (for future server-side implementation)
const _LOCK_DURATION_MINUTES = 30; void _LOCK_DURATION_MINUTES;

// Simple hash function for demo purposes
// In production, use bcrypt or similar
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hashed_${Math.abs(hash).toString(16)}_${password.length}`;
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

export const generateUserId = (): string => {
  return `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createUser = async (
  username: string,
  password: string,
  role: 'admin' | 'staff',
  fullName: string,
  email: string
): Promise<User> => {
  const existingUser = await getRecordByIndex<User>(STORE_NAME, 'username', username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  const user: User = {
    id: generateUserId(),
    username,
    passwordHash: hashPassword(password),
    role,
    fullName,
    email,
    isActive: true,
    // ⭐ sab users ek hi data dekhte hain (admin ka node) — rules owner-email scoped hain
    dataOwner: DEFAULT_OWNER,
    createdAt: new Date().toISOString(),
    lastLogin: '',
    failedAttempts: 0,
    isLocked: false,
  };

  // ⭐ LOGIN BASED AUTH: Firebase Auth account bhi banao, warna yeh user
  // web/PC par login nahi kar sake ga (anonymous access band kar diya hai).
  let firebaseNote = '';
  try {
    const res = await firebaseCreateAccount(usernameToEmail(username), password);
    firebaseNote = res.note || 'Firebase account ban gaya';
  } catch (e) {
    firebaseNote = `Firebase account nahi ban saka: ${e instanceof Error ? e.message : e}`;
    console.warn('[users] ' + firebaseNote);
  }

  const saved = await addRecord<User>(STORE_NAME, user);
  return { ...saved, firebaseNote } as User;
};

/**
 * ⭐ LOCAL LOGIN — sirf local users collection se (Firebase ka koi role nahi).
 * Internet/Firebase suspend ho tab bhi yeh chalta hai.
 */
export const authenticateLocal = async (
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  await whenDatabaseReady();
  const user = await getRecordByIndex<User>(STORE_NAME, 'username', username);

  if (!user) {
    return { success: false, error: `User "${username}" nahi mila. (Local users: admin / staff)` };
  }
  if (!user.isActive) return { success: false, error: 'Account is deactivated' };
  if (user.isLocked) return { success: false, error: 'Account is locked. Please contact administrator.' };

  if (!verifyPassword(password, user.passwordHash)) {
    const failedAttempts = user.failedAttempts + 1;
    const isLocked = failedAttempts >= MAX_LOGIN_ATTEMPTS;
    await updateRecord<User>(STORE_NAME, { ...user, failedAttempts, isLocked });
    if (isLocked) return { success: false, error: `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts` };
    return { success: false, error: `Invalid password. ${MAX_LOGIN_ATTEMPTS - failedAttempts} attempts remaining` };
  }

  const updatedUser = { ...user, failedAttempts: 0, lastLogin: new Date().toISOString() };
  // ⭐ READ ONLY (browser) mein lastLogin save nahi hota — login phir bhi chale ga
  if (!isReadOnly()) {
    try { await updateRecord<User>(STORE_NAME, updatedUser); }
    catch (e) { console.warn('lastLogin save skip:', e instanceof Error ? e.message : e); }
  }
  return { success: true, user: { ...updatedUser, passwordHash: '' } };
};

/**
 * ⭐ CLOUD LOGIN — Firebase Auth (aap ki banayi hui email + password).
 * Anonymous bilkul band: sirf woh email chale gi jo Firebase mein maujood hai.
 * Kamyab hone par app ka user record bhi (local) ensure kar dete hain,
 * taake offline mode mein bhi wahi user kaam kare.
 */
export const authenticateCloud = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string; email?: string }> => {
  let signedEmail = '';
  try {
    const r = await firebaseSignIn(email, password);
    signedEmail = r.email;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  // ⭐ Sirf ijazat wali emails — warna RTDB rules bhi rok deti hain
  if (!isAllowedEmail(signedEmail)) {
    return {
      success: false,
      error: `"${signedEmail}" ko access nahi hai. Pehle src/firebase/config.ts (ALLOWED_EMAILS) ` +
             `aur database.rules.json mein yeh email add kar ke rules Publish karein.`,
    };
  }

  // Cloud connect karein (owner = yeh email)
  let cloudMsg = '';
  try { cloudMsg = await connectFirebase(); }
  catch (e) { return { success: false, error: `Login theek hai magar cloud connect fail: ${e instanceof Error ? e.message : e}` }; }
  console.log('☁️ ' + cloudMsg);

  await whenDatabaseReady();

  // app ka user record dhoondo (email ya username se)
  const localPart = signedEmail.split('@')[0];
  let user = await getRecordByIndex<User>(STORE_NAME, 'email', signedEmail)
          || await getRecordByIndex<User>(STORE_NAME, 'username', localPart);

  if (!user) {
    // pehli baar is email se login hua → record bana do
    try {
      user = await createUser(localPart, password, 'admin', localPart, signedEmail);
    } catch {
      user = {
        id: generateUserId(), username: localPart, passwordHash: '', role: 'admin',
        fullName: localPart, email: signedEmail, isActive: true,
        createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(),
        failedAttempts: 0, isLocked: false, dataOwner: signedEmail,
      };
    }
  } else if (!isReadOnly()) {
    const updated = { ...user, failedAttempts: 0, lastLogin: new Date().toISOString() };
    try { await updateRecord<User>(STORE_NAME, updated); user = updated; } catch { user = { ...user, lastLogin: updated.lastLogin }; }
  }

  return { success: true, user: { ...user, passwordHash: '' }, email: signedEmail };
};

/**
 * Purana wrapper ( compatibility ) — mode ke hisaab se route karta hai.
 */
export const authenticateUser = async (
  username: string,
  password: string,
  mode: 'local' | 'cloud' = 'local'
): Promise<{ success: boolean; user?: User; error?: string; email?: string }> => {
  if (mode === 'cloud') return authenticateCloud(username, password);
  return authenticateLocal(username, password);
};


export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> => {
  const user = await getRecord<User>(STORE_NAME, userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('Current password is incorrect');
  }

  await updateRecord<User>(STORE_NAME, {
    ...user,
    passwordHash: hashPassword(newPassword),
  });

  return true;
};

export const resetUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  const user = await getRecord<User>(STORE_NAME, userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  await updateRecord<User>(STORE_NAME, {
    ...user,
    passwordHash: hashPassword(newPassword),
    failedAttempts: 0,
    isLocked: false,
  });
};

export const unlockUser = async (userId: string): Promise<void> => {
  const user = await getRecord<User>(STORE_NAME, userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  await updateRecord<User>(STORE_NAME, {
    ...user,
    failedAttempts: 0,
    isLocked: false,
  });
};

export const deactivateUser = async (userId: string): Promise<void> => {
  const user = await getRecord<User>(STORE_NAME, userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  await updateRecord<User>(STORE_NAME, {
    ...user,
    isActive: false,
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  const users = await getAllRecords<User>(STORE_NAME);
  return users.map(u => ({ ...u, passwordHash: '' }));
};

export const getUser = async (userId: string): Promise<User | undefined> => {
  const user = await getRecord<User>(STORE_NAME, userId);
  if (user) {
    return { ...user, passwordHash: '' };
  }
  return undefined;
};

export const initializeDefaultUsers = async (): Promise<void> => {
  const users = await getAllRecords<User>(STORE_NAME);
  
  if (users.length === 0) {
    // Create default admin user
    await createUser('admin', 'admin123', 'admin', 'System Administrator', 'admin@company.com');
    // Create default staff user
    await createUser('staff', 'staff123', 'staff', 'Staff Member', 'staff@company.com');
  }
};
