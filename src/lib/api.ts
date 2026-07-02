/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlatOwner, Visitor, UserSession, Vehicle } from '../types';
import { getInitialOwners } from '../data/ownersData';

// Let's implement a complete client-side simulation database structure
interface LocalDB {
  owners: FlatOwner[];
  visitors: Visitor[];
  passwords: Record<string, string>; // key: "wing-flatNo" -> password
}

const LOCAL_STORAGE_KEY = 'orchid_heights_local_db';

function getLocalDB(): LocalDB {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.owners) && Array.isArray(parsed.visitors) && parsed.passwords) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to parse local DB', error);
  }

  // Generate fallback/initial DB if not exists
  const initialOwners = getInitialOwners();
  const passwords: Record<string, string> = {};
  for (const owner of initialOwners) {
    const key = `${owner.wing}-${owner.flatNo}`;
    if (owner.wing === 'B' && owner.flatNo === 1104) {
      passwords[key] = '9898180810';
    } else {
      passwords[key] = 'admin@123';
    }
  }

  const newDb: LocalDB = {
    owners: initialOwners,
    visitors: [],
    passwords
  };
  saveLocalDB(newDb);
  return newDb;
}

function saveLocalDB(db: LocalDB) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Failed to save local DB', error);
  }
}

// Global flag to determine if we should fall back to client-side storage
let useClientFallback = false;

// Quick helper to determine if the server is accessible or if we should use fallback
export async function detectServerEnvironment(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      useClientFallback = false;
      return true;
    }
  } catch (err) {
    console.warn('Real API server not detected or unreachable. Activating secure local browser database fallback...', err);
  }
  useClientFallback = true;
  return false;
}

// Safe request wrapper that tries the real backend, and falls back to browser DB if a connection fails
async function safeRequest<T>(
  apiPath: string,
  options: RequestInit,
  localFallbackFn: () => T | Promise<T>
): Promise<T> {
  if (useClientFallback) {
    return localFallbackFn();
  }

  try {
    const response = await fetch(apiPath, options);
    if (!response.ok) {
      // If the error is a 404, the server is running but this route doesn't exist,
      // or if it's some other API error, throw so the catch block or caller handles it.
      const errText = await response.text();
      throw new Error(errText || `Request failed with status ${response.status}`);
    }
    return await response.json() as T;
  } catch (error: any) {
    // If it's a TypeError (failed to fetch/network error/CORS), set fallback and run local
    if (error instanceof TypeError || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.warn(`Connection failed to ${apiPath}. Falling back to browser-only database mode.`);
      useClientFallback = true;
      return localFallbackFn();
    }
    throw error;
  }
}

// Unified API Interface matching backend endpoints exactly
export const api = {
  // Login Authentication
  login: async (payload: any): Promise<{ success: boolean; session?: UserSession; message?: string }> => {
    return safeRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, () => {
      const db = getLocalDB();
      const { role, username, password, wing, flatNo } = payload;

      if (role === 'security') {
        if (username === 'admin' && password === 'admin@123') {
          return {
            success: true,
            session: { role: 'security', name: 'Security Guard' } as any
          };
        }
        return { success: false, message: 'Invalid Security Guard credentials.' };
      }

      if (role === 'owner' || role === 'admin') {
        if (!wing || !flatNo) {
          return { success: false, message: 'Wing and Flat number are required.' };
        }

        const flatNum = parseInt(flatNo, 10);
        const key = `${wing}-${flatNum}`;
        const savedPassword = db.passwords[key] || 'admin@123';

        if (password === savedPassword) {
          const owner = db.owners.find((o) => o.wing === wing && o.flatNo === flatNum);
          const isB1104Admin = wing === 'B' && flatNum === 1104;

          return {
            success: true,
            session: {
              role: isB1104Admin ? 'admin' : 'owner',
              wing,
              flatNo: flatNum,
              ownerName: owner ? owner.nameEn : `Flat ${wing}-${flatNum}`
            }
          };
        }
        return { success: false, message: 'Invalid password. Default is admin@123.' };
      }

      return { success: false, message: 'Invalid role specified.' };
    });
  },

  // Get directory of all owners
  getOwners: async (): Promise<FlatOwner[]> => {
    return safeRequest('/api/owners', { method: 'GET' }, () => {
      const db = getLocalDB();
      return db.owners;
    });
  },

  // Update flat owner details
  updateOwner: async (wing: string, flatNo: number, payload: any): Promise<{ success: boolean; owner?: FlatOwner; message?: string }> => {
    return safeRequest(`/api/owners/${wing}/${flatNo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, () => {
      const db = getLocalDB();
      const ownerIdx = db.owners.findIndex((o) => o.wing === wing && o.flatNo === flatNo);
      if (ownerIdx === -1) {
        return { success: false, message: 'Flat not found.' };
      }

      const currentOwner = db.owners[ownerIdx];
      const { nameEn, nameGu, phone, secondaryContact, members, vehicles, password } = payload;

      if (nameEn !== undefined) currentOwner.nameEn = nameEn;
      if (nameGu !== undefined) currentOwner.nameGu = nameGu;
      if (phone !== undefined) currentOwner.phone = phone;
      if (secondaryContact !== undefined) currentOwner.secondaryContact = secondaryContact;
      if (members !== undefined) currentOwner.members = members.slice(0, 2);
      if (vehicles !== undefined) currentOwner.vehicles = vehicles;

      if (password) {
        db.passwords[`${wing}-${flatNo}`] = password;
      }

      saveLocalDB(db);
      return { success: true, owner: currentOwner };
    });
  },

  // Admin Change Password Override
  changePassword: async (payload: any): Promise<{ success: boolean; message: string }> => {
    return safeRequest('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, () => {
      const db = getLocalDB();
      const { wing, flatNo, newPassword } = payload;
      const key = `${wing}-${flatNo}`;
      db.passwords[key] = newPassword;
      saveLocalDB(db);
      return { success: true, message: `Password for Flat ${wing}-${flatNo} updated successfully.` };
    });
  },

  // Admin Reset DB
  resetDb: async (): Promise<{ success: boolean; message: string }> => {
    return safeRequest('/api/admin/reset-db', { method: 'POST' }, () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      const db = getLocalDB(); // re-initialize default
      return { success: true, message: 'Database reset to initial Excel data.' };
    });
  },

  // Create Visitor request
  createVisitor: async (payload: any): Promise<Visitor> => {
    return safeRequest('/api/visitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, () => {
      const db = getLocalDB();
      const { fullName, mobileNumber, email, wing, flatNo, reason, guestType, photoUrl, flatOwnerName } = payload;

      const newVisitor: Visitor = {
        id: 'v_' + Math.random().toString(36).substr(2, 9),
        fullName,
        mobileNumber,
        email: email || '',
        wing,
        flatNo: parseInt(flatNo, 10),
        reason,
        guestType,
        photoUrl: photoUrl || '',
        status: 'pending',
        requestTime: new Date().toISOString(),
        flatOwnerName: flatOwnerName || `Flat ${wing}-${flatNo}`
      };

      db.visitors.push(newVisitor);
      saveLocalDB(db);
      return newVisitor;
    });
  },

  // Get Visitor list (with parameters)
  getVisitors: async (params?: { wing?: string; flatNo?: number; limit?: number }): Promise<Visitor[]> => {
    const queryStr = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    return safeRequest(`/api/visitors${queryStr}`, { method: 'GET' }, () => {
      const db = getLocalDB();
      let filtered = [...db.visitors];

      if (params?.wing) {
        filtered = filtered.filter((v) => v.wing === params.wing);
      }
      if (params?.flatNo) {
        filtered = filtered.filter((v) => v.flatNo === params.flatNo);
      }

      filtered.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());

      if (params?.limit) {
        filtered = filtered.slice(0, params.limit);
      }

      return filtered;
    });
  },

  // Poll for active/pending visitor alerts for a flat
  pollVisitorAlerts: async (wing: string, flatNo: number): Promise<Visitor[]> => {
    return safeRequest(`/api/visitors/poll/${wing}/${flatNo}`, { method: 'GET' }, () => {
      const db = getLocalDB();
      return db.visitors.filter(
        (v) => v.wing === wing && v.flatNo === flatNo && v.status === 'pending'
      );
    });
  },

  // Respond to a visitor request
  respondToVisitor: async (visitorId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; visitor?: Visitor }> => {
    return safeRequest(`/api/visitors/${visitorId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }, () => {
      const db = getLocalDB();
      const visitor = db.visitors.find((v) => v.id === visitorId);
      if (!visitor) {
        return { success: false };
      }

      visitor.status = status;
      visitor.respondedTime = new Date().toISOString();
      saveLocalDB(db);
      return { success: true, visitor };
    });
  }
};
