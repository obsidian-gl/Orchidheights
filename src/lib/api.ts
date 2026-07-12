/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlatOwner, Visitor, UserSession, Announcement, DeviceInfo, Complaint, FinancialReport, EssentialContact } from '../types';
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
  subscribeToVisitorNotifications,
  subscribeToAllVisitors,
  sendBroadcastAnnouncement,
  deleteAnnouncement,
  subscribeToAnnouncements,
  getAllAnnouncements,
  saveAnnouncement,
  registerUserDevice,
  deregisterUserDevice,
  getEssentialContacts,
  saveEssentialContact,
  deleteEssentialContact,
  getComplaintsList,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
  getFinancialReportsList,
  createFinancialReport,
  deleteFinancialReport,
  getFlatPasswords,
  createSocietyNotification,
  subscribeToSocietyNotifications
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
  getVisitors: async (params?: { wing?: string; flatNo?: number; limit?: number; includeDeleted?: boolean }): Promise<Visitor[]> => {
    return getVisitorsList({
      wing: params?.wing,
      flatNo: params?.flatNo,
      limitNo: params?.limit,
      includeDeleted: params?.includeDeleted
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

  // Real-time all-visitors subscription
  subscribeAllVisitors: (
    onUpdate: (visitors: Visitor[]) => void,
    onError?: (error: Error) => void
  ) => {
    return subscribeToAllVisitors(onUpdate, onError);
  },

  // Respond to a visitor request
  respondToVisitor: async (
    visitorId: string,
    status: 'approved' | 'rejected' | 'expired',
    respondedBy?: string,
    rejectReason?: string
  ): Promise<{ success: boolean; visitor?: Visitor }> => {
    return respondToVisitorRequest(visitorId, status, respondedBy, rejectReason);
  },

  // Register device details for security auditing
  registerDevice: async (
    wing: string,
    flatNo: number,
    device: DeviceInfo
  ): Promise<void> => {
    return registerUserDevice(wing, flatNo, device);
  },

  // Remote logout/de-register a device from a flat
  deregisterDevice: async (wing: string, flatNo: number, deviceId: string): Promise<{ success: boolean; message: string }> => {
    const success = await deregisterUserDevice(wing, flatNo, deviceId);
    if (success) {
      return { success: true, message: 'Device logged out and de-registered successfully.' };
    }
    return { success: false, message: 'Failed to de-register device.' };
  },

  // Delete a visitor request/log
  deleteVisitor: async (visitorId: string): Promise<{ success: boolean; message: string }> => {
    const success = await deleteVisitorRequest(visitorId);
    if (success) {
      return { success: true, message: 'Visitor request deleted successfully.' };
    }
    return { success: false, message: 'Failed to delete visitor request.' };
  },

  // Broadcast an announcement
  sendAnnouncement: async (
    target: 'all' | 'wing' | 'flat',
    wing: 'A' | 'B' | '',
    flatNo: number,
    text: string,
    sender: string,
    imageUrl?: string,
    videoUrl?: string
  ): Promise<boolean> => {
    return sendBroadcastAnnouncement(target, wing, flatNo, text, sender, imageUrl, videoUrl);
  },

  // Delete an announcement
  deleteAnnouncement: async (id: string): Promise<boolean> => {
    return deleteAnnouncement(id);
  },

  getAllAnnouncements: async (): Promise<Announcement[]> => {
    return getAllAnnouncements();
  },

  saveAnnouncement: async (ann: Announcement): Promise<boolean> => {
    return saveAnnouncement(ann);
  },

  // Subscribe to real-time announcements
  subscribeAnnouncements: (
    wing: 'A' | 'B',
    flatNo: number,
    onUpdate: (announcements: Announcement[]) => void,
    onError?: (error: Error) => void
  ) => {
    return subscribeToAnnouncements(wing, flatNo, onUpdate, onError);
  },

  // Essential Contacts
  getEssentialContacts: async (): Promise<EssentialContact[]> => {
    return getEssentialContacts();
  },
  saveEssentialContact: async (contact: EssentialContact): Promise<boolean> => {
    return saveEssentialContact(contact);
  },
  deleteEssentialContact: async (id: string): Promise<boolean> => {
    return deleteEssentialContact(id);
  },

  // Complaints
  getComplaints: async (): Promise<Complaint[]> => {
    return getComplaintsList();
  },
  createComplaint: async (payload: any): Promise<Complaint> => {
    return createComplaint(payload);
  },
  updateComplaintStatus: async (id: string, status: 'open' | 'in-progress' | 'resolved', resolvedBy?: string): Promise<boolean> => {
    return updateComplaintStatus(id, status, resolvedBy);
  },
  deleteComplaint: async (id: string): Promise<boolean> => {
    return deleteComplaint(id);
  },

  // Financial Reports
  getFinancialReports: async (): Promise<FinancialReport[]> => {
    return getFinancialReportsList();
  },
  createFinancialReport: async (payload: any): Promise<FinancialReport> => {
    return createFinancialReport(payload);
  },
  deleteFinancialReport: async (id: string): Promise<boolean> => {
    return deleteFinancialReport(id);
  },

  // Get Flat Passwords
  getFlatPasswords: async (): Promise<Record<string, string>> => {
    return getFlatPasswords();
  },

  // Society Notifications
  createSocietyNotification: async (payload: {
    type: 'notice' | 'financial' | 'complaint' | 'visitor' | 'amenity_request' | 'movie_schedule';
    title: string;
    message: string;
    wing?: string;
    flatNo?: number;
    metadata?: any;
  }): Promise<boolean> => {
    return createSocietyNotification(payload);
  },

  subscribeSocietyNotifications: (
    wing: string,
    flatNo: number,
    onUpdate: (notifications: any[]) => void
  ) => {
    return subscribeToSocietyNotifications(wing, flatNo, onUpdate);
  }
};
