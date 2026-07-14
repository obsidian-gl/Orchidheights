/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlatOwner, Visitor, Announcement, DeviceInfo, Complaint, FinancialReport, EssentialContact } from '../types';
import { getInitialOwners } from '../data/ownersData';

// --- Event Subscription & Triggering for Subscriptions ---
class LocalEventManager {
  private listeners: Record<string, Set<Function>> = {};

  subscribe(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(callback);
    return () => { this.listeners[event].delete(callback); };
  }

  emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

export const localEvents = new LocalEventManager();

// --- Storage Accessors ---
export function getLocalOwners(): FlatOwner[] {
  const data = localStorage.getItem('orchid_local_owners');
  if (data) return JSON.parse(data);
  const initial = getInitialOwners();
  localStorage.setItem('orchid_local_owners', JSON.stringify(initial));
  return initial;
}

export function saveLocalOwners(owners: FlatOwner[]) {
  localStorage.setItem('orchid_local_owners', JSON.stringify(owners));
}

export function getLocalPasswords(): Record<string, string> {
  const data = localStorage.getItem('orchid_local_passwords');
  if (data) return JSON.parse(data);
  const initial: Record<string, string> = {};
  getInitialOwners().forEach(owner => {
    initial[`${owner.wing}-${owner.flatNo}`] = (owner.wing === 'B' && owner.flatNo === 1104) ? '9898180810' : 'admin@123';
  });
  localStorage.setItem('orchid_local_passwords', JSON.stringify(initial));
  return initial;
}

export function saveLocalPasswords(passwords: Record<string, string>) {
  localStorage.setItem('orchid_local_passwords', JSON.stringify(passwords));
}

export function getLocalVisitors(): Visitor[] {
  const data = localStorage.getItem('orchid_local_visitors');
  return data ? JSON.parse(data) : [];
}

export function saveLocalVisitors(visitors: Visitor[]) {
  localStorage.setItem('orchid_local_visitors', JSON.stringify(visitors));
  localEvents.emit('all_visitors', visitors);
  localEvents.emit('visitor_update_trigger', null);
}

export function getLocalAnnouncements(): Announcement[] {
  const data = localStorage.getItem('orchid_local_announcements');
  return data ? JSON.parse(data) : [];
}

export function saveLocalAnnouncements(anns: Announcement[]) {
  localStorage.setItem('orchid_local_announcements', JSON.stringify(anns));
  localEvents.emit('announcements_update_trigger', null);
}

export function getLocalEssentialContacts(): EssentialContact[] {
  const data = localStorage.getItem('orchid_local_essential_contacts');
  if (data) return JSON.parse(data);
  const defaultContacts: EssentialContact[] = [
    { id: 'ec_1', name: 'Ramesh Patel', category: 'Plumber', phone: '9825012345', active: true },
    { id: 'ec_2', name: 'Kishore Parmar', category: 'Electrician', phone: '9898022334', active: true },
    { id: 'ec_3', name: 'Gate 1 Guard Duty', category: 'Security', phone: '9426055667', active: true },
    { id: 'ec_4', name: 'Orchid Heights Manager', category: 'Manager', phone: '9712033445', active: true },
    { id: 'ec_5', name: 'Manish Mali', category: 'Gardener', phone: '9033099881', active: true }
  ];
  localStorage.setItem('orchid_local_essential_contacts', JSON.stringify(defaultContacts));
  return defaultContacts;
}

export function saveLocalEssentialContacts(contacts: EssentialContact[]) {
  localStorage.setItem('orchid_local_essential_contacts', JSON.stringify(contacts));
}

export function getLocalComplaints(): Complaint[] {
  const data = localStorage.getItem('orchid_local_complaints');
  return data ? JSON.parse(data) : [];
}

export function saveLocalComplaints(complaints: Complaint[]) {
  localStorage.setItem('orchid_local_complaints', JSON.stringify(complaints));
}

export function getLocalFinancialReports(): FinancialReport[] {
  const data = localStorage.getItem('orchid_local_financial_reports');
  return data ? JSON.parse(data) : [];
}

export function saveLocalFinancialReports(reports: FinancialReport[]) {
  localStorage.setItem('orchid_local_financial_reports', JSON.stringify(reports));
}

export function getLocalSocietyNotifications(): any[] {
  const data = localStorage.getItem('orchid_local_society_notifications');
  return data ? JSON.parse(data) : [];
}

export function saveLocalSocietyNotifications(notifs: any[]) {
  localStorage.setItem('orchid_local_society_notifications', JSON.stringify(notifs));
  localEvents.emit('society_notifications_update_trigger', null);
}

// --- Implementation Fallbacks ---

export function verifyCredentialsLocal(role: string, payload: any) {
  if (role === 'security') {
    if (payload.username === 'admin' && payload.password === 'admin@123') {
      return { success: true, session: { role: 'security', name: 'Security Guard' } };
    }
    return { success: false, message: 'Invalid Security Guard credentials.' };
  }

  if (role === 'owner' || role === 'admin') {
    const { wing, flatNo, password } = payload;
    if (!wing || !flatNo) return { success: false, message: 'Wing and Flat number are required.' };
    const flatNum = parseInt(flatNo, 10);
    const id = `${wing}-${flatNum}`;
    const savedPassword = getLocalPasswords()[id] || 'admin@123';

    if (password === savedPassword) {
      const owners = getLocalOwners();
      const ownerData = owners.find(o => o.wing === wing && o.flatNo === flatNum) || null;

      if (ownerData) {
        const currentDevices = ownerData.devices || [];
        const device = payload.device;
        if (device && device.deviceId) {
          const isRegistered = currentDevices.some((d) => d.deviceId === device.deviceId);
          if (!isRegistered && currentDevices.length >= 4) {
            return {
              success: false,
              code: 'DEVICE_LIMIT_EXCEEDED',
              devices: currentDevices,
              message: '4 devices are already signed in for this flat — log out from one first.'
            };
          }
        }
      }

      return {
        success: true,
        session: {
          role: 'owner',
          wing,
          flatNo: flatNum,
          ownerName: ownerData ? ownerData.nameEn : `Flat ${wing}-${flatNum}`
        }
      };
    }
    return { success: false, message: 'Invalid password. Default is admin@123.' };
  }
  return { success: false, message: 'Invalid role.' };
}

export function updateOwnerDetailsLocal(wing: string, flatNo: number, payload: any) {
  const owners = getLocalOwners();
  const idx = owners.findIndex(o => o.wing === wing && o.flatNo === flatNo);
  if (idx === -1) return { success: false, message: 'Flat owner not found.' };
  
  const currentOwner = owners[idx];
  const { nameEn, nameGu, phone, secondaryContact, members, vehicles, password } = payload;
  const updated = {
    ...currentOwner,
    ...(nameEn !== undefined && { nameEn }),
    ...(nameGu !== undefined && { nameGu }),
    ...(phone !== undefined && { phone }),
    ...(secondaryContact !== undefined && { secondaryContact }),
    ...(members !== undefined && { members: members.slice(0, 2) }),
    ...(vehicles !== undefined && { vehicles }),
    ...(payload.notificationsEnabled !== undefined && { notificationsEnabled: payload.notificationsEnabled })
  };
  owners[idx] = updated;
  saveLocalOwners(owners);

  if (password) {
    const id = `${wing}-${flatNo}`;
    const passwords = getLocalPasswords();
    passwords[id] = password;
    saveLocalPasswords(passwords);
  }
  return { success: true, owner: updated };
}

export function adminChangePasswordLocal(wing: string, flatNo: number, newPassword: string): boolean {
  const id = `${wing}-${flatNo}`;
  const passwords = getLocalPasswords();
  passwords[id] = newPassword;
  saveLocalPasswords(passwords);
  return true;
}

export function resetDatabaseToDefaultLocal(): boolean {
  localStorage.removeItem('orchid_local_owners');
  localStorage.removeItem('orchid_local_passwords');
  localStorage.removeItem('orchid_local_visitors');
  localStorage.removeItem('orchid_local_announcements');
  localStorage.removeItem('orchid_local_complaints');
  localStorage.removeItem('orchid_local_financial_reports');
  localStorage.removeItem('orchid_local_essential_contacts');
  localStorage.removeItem('orchid_local_society_notifications');
  
  getLocalOwners();
  getLocalPasswords();
  getLocalEssentialContacts();
  
  localEvents.emit('all_visitors', []);
  localEvents.emit('visitor_update_trigger', null);
  localEvents.emit('announcements_update_trigger', null);
  localEvents.emit('society_notifications_update_trigger', null);
  return true;
}

export function registerVisitorLocal(payload: any): Visitor {
  const { fullName, mobileNumber, email, wing, flatNo, reason, guestType, photoUrl, flatOwnerName, visitorCount } = payload;
  const visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
  const count = parseInt(visitorCount, 10) || 1;
  const newVisitor: Visitor = {
    id: visitorId,
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
    flatOwnerName: flatOwnerName || `Flat ${wing}-${flatNo}`,
    visitorCount: count
  };

  const visitors = getLocalVisitors();
  visitors.push(newVisitor);
  saveLocalVisitors(visitors);

  createSocietyNotificationLocal({
    type: 'visitor',
    title: `🚪 Gate Visitor: ${fullName}`,
    message: `A visitor (${fullName}, ${guestType}) is requesting entry to Flat ${wing}-${flatNo} for ${reason}.`,
    wing,
    flatNo: parseInt(flatNo, 10),
    metadata: {
      visitorId,
      fullName,
      mobileNumber,
      guestType,
      reason,
      photoUrl: photoUrl || '',
      visitorCount: count
    }
  });

  return newVisitor;
}

export function getVisitorsListLocal(filters?: { wing?: string; flatNo?: number; limitNo?: number; includeDeleted?: boolean }): Visitor[] {
  let visitors = getLocalVisitors();
  if (!filters?.includeDeleted) visitors = visitors.filter((v) => !v.deletedByResident);
  if (filters?.wing) visitors = visitors.filter((v) => v.wing.toUpperCase() === filters.wing!.toUpperCase());
  if (filters?.flatNo) visitors = visitors.filter((v) => Number(v.flatNo) === Number(filters.flatNo));
  
  visitors.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
  if (filters?.limitNo) visitors = visitors.slice(0, filters.limitNo);
  return visitors;
}

export function pollPendingVisitorAlertsLocal(wing: string, flatNo: number): Visitor[] {
  const visitors = getLocalVisitors();
  return visitors.filter((v) => v.wing.toUpperCase() === wing.toUpperCase() && Number(v.flatNo) === Number(flatNo) && v.status === 'pending');
}

export function respondToVisitorRequestLocal(
  visitorId: string,
  status: 'approved' | 'rejected' | 'expired',
  respondedBy?: string,
  rejectReason?: string
): { success: boolean; visitor?: Visitor } {
  const visitors = getLocalVisitors();
  const idx = visitors.findIndex(v => v.id === visitorId);
  if (idx === -1) return { success: false };
  
  const currentVisitor = visitors[idx];
  const updated: Visitor = {
    ...currentVisitor,
    status,
    respondedTime: new Date().toISOString(),
    respondedBy: respondedBy || 'Resident',
    rejectReason: rejectReason || ''
  };
  visitors[idx] = updated;
  saveLocalVisitors(visitors);

  const notifications = getLocalSocietyNotifications();
  const notifIdx = notifications.findIndex(n => n.metadata && n.metadata.visitorId === visitorId);
  if (notifIdx > -1) {
    const notifData = notifications[notifIdx];
    const newTitle = `🚪 Gate Visitor: ${currentVisitor.fullName} (${status.toUpperCase()})`;
    const newMsg = status === 'approved'
      ? `Visitor ${currentVisitor.fullName} (${currentVisitor.guestType}) was APPROVED for entry to Flat ${currentVisitor.wing}-${currentVisitor.flatNo} by ${respondedBy || 'Resident'} for ${currentVisitor.reason}.`
      : `Visitor ${currentVisitor.fullName} (${currentVisitor.guestType}) was REJECTED for entry to Flat ${currentVisitor.wing}-${currentVisitor.flatNo} by ${respondedBy || 'Resident'}.${rejectReason ? ' Reason: ' + rejectReason : ''}`;
    
    notifications[notifIdx] = {
      ...notifData,
      title: newTitle,
      message: newMsg,
      status: status,
      metadata: {
        ...notifData.metadata,
        status: status,
        respondedTime: updated.respondedTime,
        respondedBy: updated.respondedBy,
        rejectReason: updated.rejectReason
      }
    };
    saveLocalSocietyNotifications(notifications);
  }

  return { success: true, visitor: updated };
}

export function deleteVisitorRequestLocal(visitorId: string): boolean {
  const visitors = getLocalVisitors();
  const idx = visitors.findIndex(v => v.id === visitorId);
  if (idx > -1) {
    visitors[idx].deletedByResident = true;
    saveLocalVisitors(visitors);
    return true;
  }
  return false;
}

export function sendBroadcastAnnouncementLocal(
  target: 'all' | 'wing' | 'flat',
  wing: 'A' | 'B' | '',
  flatNo: number,
  text: string,
  sender: string,
  imageUrl?: string,
  videoUrl?: string
): boolean {
  const id = 'ann_' + Math.random().toString(36).substring(2, 11);
  const payload: Announcement = {
    id,
    target,
    text,
    timestamp: new Date().toISOString(),
    sender,
    imageUrl: imageUrl || '',
    videoUrl: videoUrl || '',
    wing: wing ? (wing as 'A' | 'B') : undefined,
    flatNo: flatNo || undefined
  };
  const anns = getLocalAnnouncements();
  anns.push(payload);
  saveLocalAnnouncements(anns);
  return true;
}

export function deleteAnnouncementLocal(id: string): boolean {
  const anns = getLocalAnnouncements();
  const filtered = anns.filter(a => a.id !== id);
  if (filtered.length !== anns.length) {
    saveLocalAnnouncements(filtered);
    return true;
  }
  return false;
}

export function getAllAnnouncementsLocal(): Announcement[] {
  const anns = getLocalAnnouncements();
  anns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return anns;
}

export function saveAnnouncementLocal(ann: Announcement): boolean {
  const anns = getLocalAnnouncements();
  const idx = anns.findIndex(a => a.id === ann.id);
  const cleaned: Announcement = {
    id: ann.id,
    target: ann.target || 'all',
    text: ann.text || '',
    timestamp: ann.timestamp || new Date().toISOString(),
    sender: ann.sender || 'Orchid Heights Administration',
    imageUrl: ann.imageUrl || '',
    videoUrl: ann.videoUrl || '',
    pdfUrl: ann.pdfUrl || '',
    fileName: ann.fileName || '',
    fileType: ann.fileType || '',
    attachments: ann.attachments || [],
    wing: ann.wing,
    flatNo: ann.flatNo
  };
  if (idx > -1) anns[idx] = cleaned;
  else anns.push(cleaned);
  saveLocalAnnouncements(anns);
  return true;
}

export function registerUserDeviceLocal(wing: string, flatNo: number, device: DeviceInfo) {
  const owners = getLocalOwners();
  const idx = owners.findIndex(o => o.wing === wing && o.flatNo === flatNo);
  if (idx > -1) {
    const ownerData = owners[idx];
    const currentDevices = ownerData.devices || [];
    const existingIdx = currentDevices.findIndex((d) => d.deviceId === device.deviceId);
    if (existingIdx > -1) {
      currentDevices[existingIdx] = {
        ...currentDevices[existingIdx],
        ...device,
        lastLogin: new Date().toISOString()
      };
    } else {
      currentDevices.push(device);
    }
    owners[idx].devices = currentDevices;
    saveLocalOwners(owners);
  }
}

export function deregisterUserDeviceLocal(wing: string, flatNo: number, deviceId: string): boolean {
  const owners = getLocalOwners();
  const idx = owners.findIndex(o => o.wing === wing && o.flatNo === flatNo);
  if (idx > -1) {
    const ownerData = owners[idx];
    const currentDevices = ownerData.devices || [];
    const updatedDevices = currentDevices.filter((d) => d.deviceId !== deviceId);
    owners[idx].devices = updatedDevices;
    saveLocalOwners(owners);
    return true;
  }
  return false;
}

export function getEssentialContactsLocal(): EssentialContact[] {
  return getLocalEssentialContacts();
}

export function saveEssentialContactLocal(contact: EssentialContact): boolean {
  const contacts = getLocalEssentialContacts();
  const idx = contacts.findIndex(c => c.id === contact.id);
  if (idx > -1) contacts[idx] = contact;
  else contacts.push(contact);
  saveLocalEssentialContacts(contacts);
  return true;
}

export function deleteEssentialContactLocal(contactId: string): boolean {
  const contacts = getLocalEssentialContacts();
  const filtered = contacts.filter(c => c.id !== contactId);
  if (filtered.length !== contacts.length) {
    saveLocalEssentialContacts(filtered);
    return true;
  }
  return false;
}

export function getComplaintsListLocal(): Complaint[] {
  const complaints = getLocalComplaints();
  complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return complaints;
}

export function createComplaintLocal(payload: any): Complaint {
  const { id, flatId, wing, flatNo, title, description, mediaUrl, mediaName, mediaType, status, createdAt, resolvedAt, resolvedBy, processNotes, attachments } = payload;
  const complaintId = id || 'comp_' + Math.random().toString(36).substring(2, 11);
  const derivedFlatId = flatId || (wing && flatNo ? `${wing}-${flatNo}` : 'B-1104');
  const newComplaint: Complaint = {
    id: complaintId,
    flatId: derivedFlatId,
    title: title || '',
    description: description || '',
    mediaUrl: mediaUrl || '',
    mediaName: mediaName || '',
    mediaType: mediaType || '',
    status: status || 'open',
    createdAt: createdAt || new Date().toISOString(),
    resolvedAt: resolvedAt || null,
    resolvedBy: resolvedBy || null,
    processNotes: processNotes || '',
    attachments: attachments || []
  };
  const complaints = getLocalComplaints();
  complaints.push(newComplaint);
  saveLocalComplaints(complaints);
  return newComplaint;
}

export function updateComplaintStatusLocal(
  complaintId: string,
  status: 'open' | 'in-progress' | 'resolved',
  resolvedBy?: string,
  processNotes?: string
): boolean {
  const complaints = getLocalComplaints();
  const idx = complaints.findIndex(c => c.id === complaintId);
  if (idx > -1) {
    const data = complaints[idx];
    complaints[idx] = {
      ...data,
      status,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
      resolvedBy: status === 'resolved' ? resolvedBy || 'Secretary' : null,
      processNotes: processNotes !== undefined ? processNotes : (data.processNotes || '')
    };
    saveLocalComplaints(complaints);
    return true;
  }
  return false;
}

export function deleteComplaintLocal(complaintId: string): boolean {
  const complaints = getLocalComplaints();
  const filtered = complaints.filter(c => c.id !== complaintId);
  if (filtered.length !== complaints.length) {
    saveLocalComplaints(filtered);
    return true;
  }
  return false;
}

export function getFinancialReportsListLocal(): FinancialReport[] {
  const reports = getLocalFinancialReports();
  reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return reports;
}

export function createFinancialReportLocal(payload: any): FinancialReport {
  const { id, month, year, title, description, pdfUrl, fileName, fileType, totalExpense, uploadedBy, reportType, createdAt, attachments } = payload;
  const reportId = id || 'fin_' + Math.random().toString(36).substring(2, 11);
  const newReport: FinancialReport = {
    id: reportId,
    month: month || new Date().toLocaleString('default', { month: 'long' }),
    year: parseInt(year, 10) || new Date().getFullYear(),
    title: title || '',
    description: description || '',
    pdfUrl: pdfUrl || '',
    fileName: fileName || '',
    fileType: fileType || '',
    totalExpense: parseFloat(totalExpense) || 0,
    createdAt: createdAt || new Date().toISOString(),
    uploadedBy: uploadedBy || 'Rahul Popat (B-1104 / Admin)',
    reportType: reportType || 'expense',
    attachments: attachments || []
  };
  const reports = getLocalFinancialReports();
  reports.push(newReport);
  saveLocalFinancialReports(reports);
  return newReport;
}

export function deleteFinancialReportLocal(reportId: string): boolean {
  const reports = getLocalFinancialReports();
  const filtered = reports.filter(r => r.id !== reportId);
  if (filtered.length !== reports.length) {
    saveLocalFinancialReports(filtered);
    return true;
  }
  return false;
}

export function getFlatPasswordsLocal(): Record<string, string> {
  return getLocalPasswords();
}

export function createSocietyNotificationLocal(payload: {
  type: 'notice' | 'financial' | 'complaint' | 'visitor' | 'amenity_request' | 'movie_schedule';
  title: string;
  message: string;
  wing?: string;
  flatNo?: number;
  metadata?: any;
}): boolean {
  const id = 'notif_' + Math.random().toString(36).substring(2, 11);
  const newNotif = {
    id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    wing: payload.wing || '',
    flatNo: payload.flatNo || 0,
    timestamp: new Date().toISOString(),
    metadata: payload.metadata || {}
  };
  const notifs = getLocalSocietyNotifications();
  notifs.push(newNotif);
  saveLocalSocietyNotifications(notifs);
  return true;
}
