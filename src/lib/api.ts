/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlatOwner, Visitor, UserSession } from '../types';
import { 
  verifyCredentials,
  getAllOwners,
  updateOwnerDetails,
  adminChangePassword,
  resetDatabaseToDefault,
  registerVisitor,
  getVisitorsList,
  pollPendingVisitorAlerts,
  respondToVisitorRequest,
  deleteVisitorRequest,
  seedDatabaseIfNeeded,
  subscribeToVisitorNotifications
} from './firebase';

export async function detectServerEnvironment(): Promise<boolean> {
  // Always true for Firestore as it connects directly to online cloud servers
  try {
    await seedDatabaseIfNeeded();
    return true;
  } catch (e) {
    console.error('Failed to contact Firestore server:', e);
    return false;
  }
}

// Unified API Interface matching backend endpoints exactly but powered 100% by live Firestore
export const api = {
  // Login Authentication
  login: async (payload: any): Promise<{ success: boolean; session?: UserSession; message?: string }> => {
    return verifyCredentials(payload.role, payload);
  },

  // Get directory of all owners
  getOwners: async (): Promise<FlatOwner[]> => {
    return getAllOwners();
  },

  // Update flat owner details
  updateOwner: async (wing: string, flatNo: number, payload: any): Promise<{ success: boolean; owner?: FlatOwner; message?: string }> => {
    return updateOwnerDetails(wing, flatNo, payload);
  },

  // Admin Change Password Override
  changePassword: async (payload: any): Promise<{ success: boolean; message: string }> => {
    const { wing, flatNo, newPassword } = payload;
    const flatNum = parseInt(flatNo, 10);
    const success = await adminChangePassword(wing, flatNum, newPassword);
    if (success) {
      return { success: true, message: `Password for Flat ${wing}-${flatNo} updated successfully.` };
    }
    return { success: false, message: 'Failed to update password.' };
  },

  // Admin Reset DB
  resetDb: async (): Promise<{ success: boolean; message: string }> => {
    const success = await resetDatabaseToDefault();
    if (success) {
      return { success: true, message: 'Database reset to initial Excel data in Firestore.' };
    }
    return { success: false, message: 'Failed to reset database.' };
  },

  // Create Visitor request
  createVisitor: async (payload: any): Promise<Visitor> => {
    return registerVisitor(payload);
  },

  // Get Visitor list (with parameters)
  getVisitors: async (params?: { wing?: string; flatNo?: number; limit?: number }): Promise<Visitor[]> => {
    return getVisitorsList({
      wing: params?.wing,
      flatNo: params?.flatNo,
      limitNo: params?.limit
    });
  },

  // Poll for active/pending visitor alerts for a flat
  pollVisitorAlerts: async (wing: string, flatNo: number): Promise<Visitor[]> => {
    return pollPendingVisitorAlerts(wing, flatNo);
  },

  // Real-time notification subscription
  subscribeNotifications: (
    wing: string,
    flatNo: number,
    onUpdate: (visitors: Visitor[]) => void,
    onError?: (error: Error) => void
  ) => {
    return subscribeToVisitorNotifications(wing, flatNo, onUpdate, onError);
  },

  // Respond to a visitor request
  respondToVisitor: async (visitorId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; visitor?: Visitor }> => {
    return respondToVisitorRequest(visitorId, status);
  },

  // Delete a visitor request/log
  deleteVisitor: async (visitorId: string): Promise<{ success: boolean; message: string }> => {
    const success = await deleteVisitorRequest(visitorId);
    if (success) {
      return { success: true, message: 'Visitor request deleted successfully.' };
    }
    return { success: false, message: 'Failed to delete visitor request.' };
  }
};
