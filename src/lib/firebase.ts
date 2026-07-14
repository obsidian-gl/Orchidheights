/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  collection as rawCollection,
  doc as rawDoc,
  getDoc as rawGetDoc,
  getDocs as rawGetDocs,
  setDoc as rawSetDoc,
  addDoc as rawAddDoc,
  updateDoc as rawUpdateDoc,
  deleteDoc as rawDeleteDoc,
  query as rawQuery,
  limit as rawLimit,
  onSnapshot as rawOnSnapshot,
  where as rawWhere,
  orderBy as rawOrderBy
} from 'firebase/firestore';
import { FlatOwner, Visitor, Announcement, DeviceInfo, Complaint, FinancialReport, EssentialContact } from '../types';
import { getInitialOwners } from '../data/ownersData';
import firebaseConfig from '../../firebase-applet-config.json';
import * as fallback from './fallback';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeData(item)) as any;
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) cleaned[key] = sanitizeData(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// Browser detection
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Mock classes for local/HTTP fallback
class MockDoc {
  id: string;
  private _data: any;
  constructor(id: string, data: any) {
    this.id = id;
    this._data = data;
  }
  data() {
    return this._data;
  }
  exists() {
    return this._data !== undefined;
  }
}

class MockSnapshot {
  docs: MockDoc[];
  size: number;
  constructor(docs: MockDoc[]) {
    this.docs = docs;
    this.size = docs.length;
  }
  forEach(callback: (doc: MockDoc) => void) {
    this.docs.forEach(callback);
  }
}

// Simple fetcher helper for server REST generic db APIs
async function serverDbRequest(method: string, path: string, body?: any) {
  const options: any = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  if (!res.ok) {
    throw new Error(`Server DB Request failed: ${res.statusText}`);
  }
  return res.json();
}

// Wrapped Database Functions
export function collection(database: any, name: string) {
  if (isBrowser && isQuotaExceeded) {
    return { path: name, collectionName: name, type: 'collection' };
  }
  return rawCollection(database, name);
}

export function doc(database: any, collectionName: string, id?: string) {
  if (isBrowser && isQuotaExceeded) {
    const docId = id || 'doc_' + Math.random().toString(36).substring(2, 11);
    return { collectionName, id: docId, path: `${collectionName}/${docId}`, type: 'document' };
  }
  if (!id) return rawDoc(database, collectionName);
  return rawDoc(database, collectionName, id);
}

export async function getDoc(ref: any): Promise<any> {
  if (isBrowser && isQuotaExceeded) {
    const collectionName = ref.collectionName;
    const docId = ref.id;
    try {
      const item = await serverDbRequest('GET', `/api/db/${collectionName}/${docId}`);
      return new MockDoc(docId, item);
    } catch (err) {
      return new MockDoc(docId, undefined);
    }
  }
  return rawGetDoc(ref);
}

export async function getDocs(queryOrCollection: any): Promise<any> {
  if (isBrowser && isQuotaExceeded) {
    const collectionName = queryOrCollection.path || queryOrCollection.collectionName || queryOrCollection;
    const data = await serverDbRequest('GET', `/api/db/${collectionName}`);
    const docs = data.map((item: any) => new MockDoc(item.id, item));
    return new MockSnapshot(docs);
  }
  return rawGetDocs(queryOrCollection);
}

export async function setDoc(ref: any, data: any, options?: any): Promise<any> {
  if (isBrowser && isQuotaExceeded) {
    const collectionName = ref.collectionName;
    const docId = ref.id;
    const result = await serverDbRequest('PUT', `/api/db/${collectionName}/${docId}`, data);
    return new MockDoc(docId, result);
  }
  return rawSetDoc(ref, sanitizeData(data), options);
}

export async function addDoc(coll: any, data: any): Promise<any> {
  if (isBrowser && isQuotaExceeded) {
    const collectionName = coll.path || coll;
    const result = await serverDbRequest('POST', `/api/db/${collectionName}`, data);
    return new MockDoc(result.id, result);
  }
  return rawAddDoc(coll, sanitizeData(data));
}

export async function updateDoc(ref: any, data: any): Promise<any> {
  if (isBrowser && isQuotaExceeded) {
    const collectionName = ref.collectionName;
    const docId = ref.id;
    const result = await serverDbRequest('PUT', `/api/db/${collectionName}/${docId}`, data);
    return new MockDoc(docId, result);
  }
  return rawUpdateDoc(ref, sanitizeData(data));
}

export async function deleteDoc(ref: any): Promise<any> {
  if (isBrowser && isQuotaExceeded) {
    const collectionName = ref.collectionName;
    const docId = ref.id;
    await serverDbRequest('DELETE', `/api/db/${collectionName}/${docId}`);
    return true;
  }
  return rawDeleteDoc(ref);
}

export function query(ref: any, ...constraints: any[]) {
  if (isBrowser && isQuotaExceeded) {
    return ref;
  }
  return rawQuery(ref, ...constraints);
}

export function limit(num: number) {
  if (isBrowser && isQuotaExceeded) return { type: 'limit', num };
  return rawLimit(num);
}

export function orderBy(field: string, direction?: any) {
  if (isBrowser && isQuotaExceeded) return { type: 'orderBy', field, direction };
  return rawOrderBy(field, direction);
}

export function where(field: string, op: any, value: any) {
  if (isBrowser && isQuotaExceeded) return { type: 'where', field, op, value };
  return rawWhere(field, op, value);
}

export function onSnapshot(refOrQuery: any, callback: any, errorCallback?: any): any {
  if (isBrowser && isQuotaExceeded) {
    let active = true;
    const collectionName = refOrQuery.path || refOrQuery.collectionName || refOrQuery;
    
    const poll = async () => {
      try {
        const data = await serverDbRequest('GET', `/api/db/${collectionName}`);
        if (!active) return;
        const docs = data.map((item: any) => new MockDoc(item.id, item));
        callback(new MockSnapshot(docs));
      } catch (err) {
        if (errorCallback) errorCallback(err);
      }
    };

    poll(); // initial fetch
    const intervalId = setInterval(poll, 2500); // poll every 2.5 seconds

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }
  return rawOnSnapshot(refOrQuery, callback, errorCallback);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, op: OperationType, path: string | null): never {
  const errInfo = { error: error instanceof Error ? error.message : String(error), operationType: op, path };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export let isQuotaExceeded = isBrowser ? localStorage.getItem('orchid_quota_exceeded') === 'true' : false;

export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const msg = error.message || String(error);
  return (
    msg.includes('quota') ||
    msg.includes('Quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Resource exhausted') ||
    msg.includes('Quota exceeded')
  );
}

export function markQuotaExceeded() {
  if (!isQuotaExceeded) {
    isQuotaExceeded = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('orchid_quota_exceeded', 'true');
    }
    console.warn("--- Firestore Quota Exceeded! Seamlessly switched to client fallback mode ---");
  }
}

export async function seedDatabaseIfNeeded() {
  if (isQuotaExceeded) {
    fallback.getLocalOwners();
    fallback.getLocalPasswords();
    return;
  }
  try {
    const ownersCol = collection(db, 'owners');
    const q = query(ownersCol, limit(96));
    const snap = await getDocs(q);
    
    if (snap.size < 90) {
      console.log('--- Seeding Firestore with default residents and passwords ---');
      const initialOwners = getInitialOwners();
      for (const owner of initialOwners) {
        const id = `${owner.wing}-${owner.flatNo}`;
        await setDoc(doc(db, 'owners', id), owner);
        const password = (owner.wing === 'B' && owner.flatNo === 1104) ? '9898180810' : 'admin@123';
        await setDoc(doc(db, 'passwords', id), { wing: owner.wing, flatNo: owner.flatNo, password });
      }
      console.log('--- Firestore database seeded successfully! ---');
    }
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      fallback.getLocalOwners();
      fallback.getLocalPasswords();
    } else {
      console.error('Failed to seed Firestore database:', error);
      handleFirestoreError(error, OperationType.WRITE, 'owners');
    }
  }
}

export async function verifyCredentials(role: string, payload: any): Promise<{ success: boolean; session?: any; message?: string; code?: string; devices?: any[] }> {
  if (isQuotaExceeded) return fallback.verifyCredentialsLocal(role, payload);
  try {
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
      
      let savedPassword = 'admin@123';
      try {
        const pwdDoc = await getDoc(doc(db, 'passwords', id));
        if (pwdDoc.exists()) savedPassword = pwdDoc.data().password;
      } catch (error) {
        if (isQuotaError(error)) {
          markQuotaExceeded();
          return fallback.verifyCredentialsLocal(role, payload);
        }
        handleFirestoreError(error, OperationType.GET, `passwords/${id}`);
      }

      if (password === savedPassword) {
        let ownerData: FlatOwner | null = null;
        try {
          const ownerDoc = await getDoc(doc(db, 'owners', id));
          ownerData = ownerDoc.exists() ? (ownerDoc.data() as FlatOwner) : null;
        } catch (error) {
          if (isQuotaError(error)) {
            markQuotaExceeded();
            return fallback.verifyCredentialsLocal(role, payload);
          }
          handleFirestoreError(error, OperationType.GET, `owners/${id}`);
        }

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
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.verifyCredentialsLocal(role, payload);
    }
    throw error;
  }
}

export async function getAllOwners(): Promise<FlatOwner[]> {
  if (isQuotaExceeded) return fallback.getLocalOwners();
  try {
    await seedDatabaseIfNeeded();
    const snap = await getDocs(collection(db, 'owners'));
    const owners: FlatOwner[] = [];
    snap.forEach((docSnap) => { owners.push(docSnap.data() as FlatOwner); });
    owners.sort((a, b) => a.wing !== b.wing ? a.wing.localeCompare(b.wing) : a.flatNo - b.flatNo);
    return owners;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.getLocalOwners();
    }
    handleFirestoreError(error, OperationType.LIST, 'owners');
  }
}

export async function updateOwnerDetails(wing: string, flatNo: number, payload: any): Promise<{ success: boolean; owner?: FlatOwner; message?: string }> {
  if (isQuotaExceeded) return fallback.updateOwnerDetailsLocal(wing, flatNo, payload);
  const id = `${wing}-${flatNo}`;
  const ownerRef = doc(db, 'owners', id);
  try {
    let ownerSnap;
    try {
      ownerSnap = await getDoc(ownerRef);
    } catch (error) {
      if (isQuotaError(error)) {
        markQuotaExceeded();
        return fallback.updateOwnerDetailsLocal(wing, flatNo, payload);
      }
      handleFirestoreError(error, OperationType.GET, `owners/${id}`);
    }
    
    if (!ownerSnap.exists()) return { success: false, message: 'Flat owner not found.' };

    const currentOwner = ownerSnap.data() as FlatOwner;
    const { nameEn, nameGu, phone, secondaryContact, members, vehicles, password } = payload;
    const updated: any = { ...currentOwner };
    if (nameEn !== undefined) updated.nameEn = nameEn;
    if (nameGu !== undefined) updated.nameGu = nameGu;
    if (phone !== undefined) updated.phone = phone;
    if (secondaryContact !== undefined) updated.secondaryContact = secondaryContact;
    if (members !== undefined) updated.members = members.slice(0, 2);
    if (vehicles !== undefined) updated.vehicles = vehicles;
    if (payload.notificationsEnabled !== undefined) updated.notificationsEnabled = payload.notificationsEnabled;

    await setDoc(ownerRef, updated);
    if (password) await setDoc(doc(db, 'passwords', id), { wing, flatNo, password });
    return { success: true, owner: updated as FlatOwner };
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.updateOwnerDetailsLocal(wing, flatNo, payload);
    }
    handleFirestoreError(error, OperationType.WRITE, `owners/${id}`);
  }
}

export async function adminChangePassword(wing: string, flatNo: number, newPassword: string): Promise<boolean> {
  if (isQuotaExceeded) return fallback.adminChangePasswordLocal(wing, flatNo, newPassword);
  const id = `${wing}-${flatNo}`;
  try {
    await setDoc(doc(db, 'passwords', id), { wing, flatNo, password: newPassword });
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.adminChangePasswordLocal(wing, flatNo, newPassword);
    }
    handleFirestoreError(error, OperationType.WRITE, `passwords/${id}`);
  }
}

export async function resetDatabaseToDefault(): Promise<boolean> {
  if (isQuotaExceeded) return fallback.resetDatabaseToDefaultLocal();
  try {
    const snap = await getDocs(collection(db, 'owners'));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, 'owners', d.id));
      await deleteDoc(doc(db, 'passwords', d.id));
    }
    const visitorsSnap = await getDocs(collection(db, 'visitors'));
    for (const d of visitorsSnap.docs) await deleteDoc(doc(db, 'visitors', d.id));
    const notificationsSnap = await getDocs(collection(db, 'notifications'));
    for (const d of notificationsSnap.docs) await deleteDoc(doc(db, 'notifications', d.id));
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.resetDatabaseToDefaultLocal();
    }
    handleFirestoreError(error, OperationType.DELETE, 'all_collections');
  }
  await seedDatabaseIfNeeded();
  return true;
}

export async function registerVisitor(payload: any): Promise<Visitor> {
  if (isQuotaExceeded) return fallback.registerVisitorLocal(payload);
  const { fullName, mobileNumber, email, wing, flatNo, reason, guestType, photoUrl, flatOwnerName, visitorCount } = payload;
  const visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
  const count = parseInt(visitorCount, 10) || 1;
  const newVisitor: Visitor = {
    id: visitorId, fullName, mobileNumber, email: email || '', wing, flatNo: parseInt(flatNo, 10),
    reason, guestType, photoUrl: photoUrl || '', status: 'pending', requestTime: new Date().toISOString(),
    flatOwnerName: flatOwnerName || `Flat ${wing}-${flatNo}`, visitorCount: count
  };

  try {
    await setDoc(doc(db, 'visitors', visitorId), newVisitor);
    await setDoc(doc(db, 'notifications', visitorId), {
      id: visitorId, visitorId, fullName, mobileNumber, email: email || '', wing, flatNo: parseInt(flatNo, 10),
      reason, guestType, photoUrl: photoUrl || '', status: 'pending', requestTime: newVisitor.requestTime,
      flatOwnerName: newVisitor.flatOwnerName, visitorCount: count
    });
    await createSocietyNotification({
      type: 'visitor', title: `🚪 Gate Visitor: ${fullName}`,
      message: `A visitor (${fullName}, ${guestType}) is requesting entry to Flat ${wing}-${flatNo} for ${reason}.`,
      wing, flatNo: parseInt(flatNo, 10), metadata: { visitorId, fullName, mobileNumber, guestType, reason, photoUrl: photoUrl || '', visitorCount: count }
    });
    return newVisitor;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.registerVisitorLocal(payload);
    }
    handleFirestoreError(error, OperationType.WRITE, `visitors/${visitorId}`);
  }
}

export async function getVisitorsList(filters?: { wing?: string; flatNo?: number; limitNo?: number; includeDeleted?: boolean }): Promise<Visitor[]> {
  if (isQuotaExceeded) return fallback.getVisitorsListLocal(filters);
  try {
    const snap = await getDocs(collection(db, 'visitors'));
    let visitors: Visitor[] = [];
    snap.forEach((docSnap) => { visitors.push(docSnap.data() as Visitor); });
    if (!filters?.includeDeleted) visitors = visitors.filter((v) => !v.deletedByResident);
    if (filters?.wing) visitors = visitors.filter((v) => v.wing.toUpperCase() === filters.wing!.toUpperCase());
    if (filters?.flatNo) visitors = visitors.filter((v) => Number(v.flatNo) === Number(filters.flatNo));
    visitors.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
    if (filters?.limitNo) visitors = visitors.slice(0, filters.limitNo);
    return visitors;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.getVisitorsListLocal(filters);
    }
    handleFirestoreError(error, OperationType.LIST, 'visitors');
  }
}

export async function pollPendingVisitorAlerts(wing: string, flatNo: number): Promise<Visitor[]> {
  if (isQuotaExceeded) return fallback.pollPendingVisitorAlertsLocal(wing, flatNo);
  try {
    const snap = await getDocs(collection(db, 'visitors'));
    const pending: Visitor[] = [];
    snap.forEach((docSnap) => {
      const v = docSnap.data() as Visitor;
      if (v.wing.toUpperCase() === wing.toUpperCase() && Number(v.flatNo) === Number(flatNo) && v.status === 'pending') {
        pending.push(v);
      }
    });
    return pending;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.pollPendingVisitorAlertsLocal(wing, flatNo);
    }
    handleFirestoreError(error, OperationType.LIST, 'visitors');
  }
}

export async function respondToVisitorRequest(
  visitorId: string, status: 'approved' | 'rejected' | 'expired', respondedBy?: string, rejectReason?: string
): Promise<{ success: boolean; visitor?: Visitor }> {
  if (isQuotaExceeded) return fallback.respondToVisitorRequestLocal(visitorId, status, respondedBy, rejectReason);
  const visitorRef = doc(db, 'visitors', visitorId);
  try {
    let snap;
    try {
      snap = await getDoc(visitorRef);
    } catch (error) {
      if (isQuotaError(error)) {
        markQuotaExceeded();
        return fallback.respondToVisitorRequestLocal(visitorId, status, respondedBy, rejectReason);
      }
      handleFirestoreError(error, OperationType.GET, `visitors/${visitorId}`);
    }
    if (!snap.exists()) return { success: false };

    const currentVisitor = snap.data() as Visitor;
    const updated: Visitor = {
      ...currentVisitor, status, respondedTime: new Date().toISOString(), respondedBy: respondedBy || 'Resident', rejectReason: rejectReason || ''
    };

    await setDoc(visitorRef, updated);
    await setDoc(doc(db, 'notifications', visitorId), { status, respondedTime: updated.respondedTime, respondedBy: updated.respondedBy, rejectReason: updated.rejectReason }, { merge: true });

    try {
      const q = query(collection(db, 'society_notifications'), where('metadata.visitorId', '==', visitorId));
      const societyNotifSnap = await getDocs(q);
      for (const docSnap of societyNotifSnap.docs) {
        const notifData = docSnap.data();
        const newTitle = `🚪 Gate Visitor: ${currentVisitor.fullName} (${status.toUpperCase()})`;
        const newMsg = status === 'approved'
          ? `Visitor ${currentVisitor.fullName} (${currentVisitor.guestType}) was APPROVED for entry to Flat ${currentVisitor.wing}-${currentVisitor.flatNo} by ${respondedBy || 'Resident'} for ${currentVisitor.reason}.`
          : `Visitor ${currentVisitor.fullName} (${currentVisitor.guestType}) was REJECTED for entry to Flat ${currentVisitor.wing}-${currentVisitor.flatNo} by ${respondedBy || 'Resident'}.${rejectReason ? ' Reason: ' + rejectReason : ''}`;
        await setDoc(doc(db, 'society_notifications', docSnap.id), { title: newTitle, message: newMsg, status, metadata: { ...notifData.metadata, status, respondedTime: updated.respondedTime, respondedBy: updated.respondedBy, rejectReason: updated.rejectReason } }, { merge: true });
      }
    } catch (e) {
      console.warn('Failed to update society notifications log:', e);
    }
    return { success: true, visitor: updated };
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.respondToVisitorRequestLocal(visitorId, status, respondedBy, rejectReason);
    }
    handleFirestoreError(error, OperationType.WRITE, `visitors/${visitorId}`);
  }
}

export async function deleteVisitorRequest(visitorId: string): Promise<boolean> {
  if (isQuotaExceeded) return fallback.deleteVisitorRequestLocal(visitorId);
  const visitorRef = doc(db, 'visitors', visitorId);
  try {
    await setDoc(visitorRef, { deletedByResident: true }, { merge: true });
    await deleteDoc(doc(db, 'notifications', visitorId));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.deleteVisitorRequestLocal(visitorId);
    }
    handleFirestoreError(error, OperationType.WRITE, `visitors/${visitorId}`);
  }
}

export async function sendBroadcastAnnouncement(
  target: 'all' | 'wing' | 'flat', wing: 'A' | 'B' | '', flatNo: number, text: string, sender: string, imageUrl?: string, videoUrl?: string
): Promise<boolean> {
  if (isQuotaExceeded) return fallback.sendBroadcastAnnouncementLocal(target, wing, flatNo, text, sender, imageUrl, videoUrl);
  const id = 'ann_' + Math.random().toString(36).substring(2, 11);
  const payload: Announcement = { id, target, text, timestamp: new Date().toISOString(), sender, imageUrl: imageUrl || '', videoUrl: videoUrl || '' };
  if (wing) payload.wing = wing as 'A' | 'B';
  if (flatNo) payload.flatNo = flatNo;

  try {
    await setDoc(doc(db, 'announcements', id), payload);
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.sendBroadcastAnnouncementLocal(target, wing, flatNo, text, sender, imageUrl, videoUrl);
    }
    console.error('Failed to send broadcast announcement:', error);
    return false;
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  if (isQuotaExceeded) return fallback.deleteAnnouncementLocal(id);
  try {
    await deleteDoc(doc(db, 'announcements', id));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.deleteAnnouncementLocal(id);
    }
    console.error('Failed to delete announcement:', error);
    return false;
  }
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  if (isQuotaExceeded) return fallback.getAllAnnouncementsLocal();
  try {
    const snap = await getDocs(collection(db, 'announcements'));
    const list: Announcement[] = [];
    snap.forEach((docSnap) => { list.push(docSnap.data() as Announcement); });
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.getAllAnnouncementsLocal();
    }
    handleFirestoreError(error, OperationType.LIST, 'announcements');
  }
}

export async function saveAnnouncement(ann: Announcement): Promise<boolean> {
  if (isQuotaExceeded) return fallback.saveAnnouncementLocal(ann);
  try {
    const cleaned: any = {
      id: ann.id, target: ann.target || 'all', text: ann.text || '', timestamp: ann.timestamp || new Date().toISOString(),
      sender: ann.sender || 'Orchid Heights Administration', imageUrl: ann.imageUrl || '', videoUrl: ann.videoUrl || '',
      pdfUrl: ann.pdfUrl || '', fileName: ann.fileName || '', fileType: ann.fileType || '', attachments: ann.attachments || []
    };
    if (ann.wing) cleaned.wing = ann.wing;
    if (ann.flatNo) cleaned.flatNo = ann.flatNo;
    await setDoc(doc(db, 'announcements', ann.id), cleaned);
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.saveAnnouncementLocal(ann);
    }
    console.error('Failed to save announcement:', error);
    return false;
  }
}

export async function registerUserDevice(wing: string, flatNo: number, device: DeviceInfo): Promise<void> {
  if (isQuotaExceeded) {
    fallback.registerUserDeviceLocal(wing, flatNo, device);
    return;
  }
  const id = `${wing}-${flatNo}`;
  const ownerRef = doc(db, 'owners', id);
  try {
    const ownerSnap = await getDoc(ownerRef);
    if (ownerSnap.exists()) {
      const ownerData = ownerSnap.data() as FlatOwner;
      const currentDevices = ownerData.devices || [];
      const existingIdx = currentDevices.findIndex((d) => d.deviceId === device.deviceId);
      if (existingIdx > -1) {
        currentDevices[existingIdx] = { ...currentDevices[existingIdx], ...device, lastLogin: new Date().toISOString() };
      } else {
        currentDevices.push(device);
      }
      await setDoc(ownerRef, { devices: currentDevices }, { merge: true });
    }
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      fallback.registerUserDeviceLocal(wing, flatNo, device);
    } else {
      console.error('Failed to register user device:', error);
    }
  }
}

export async function deregisterUserDevice(wing: string, flatNo: number, deviceId: string): Promise<boolean> {
  if (isQuotaExceeded) return fallback.deregisterUserDeviceLocal(wing, flatNo, deviceId);
  const id = `${wing}-${flatNo}`;
  const ownerRef = doc(db, 'owners', id);
  try {
    const ownerSnap = await getDoc(ownerRef);
    if (ownerSnap.exists()) {
      const ownerData = ownerSnap.data() as FlatOwner;
      const currentDevices = ownerData.devices || [];
      const updatedDevices = currentDevices.filter((d) => d.deviceId !== deviceId);
      await setDoc(ownerRef, { devices: updatedDevices }, { merge: true });
      return true;
    }
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.deregisterUserDeviceLocal(wing, flatNo, deviceId);
    }
    console.error('Failed to deregister user device:', error);
  }
  return false;
}

export async function getEssentialContacts(): Promise<EssentialContact[]> {
  if (isQuotaExceeded) return fallback.getEssentialContactsLocal();
  try {
    const snap = await getDocs(collection(db, 'essential_contacts'));
    const contacts: EssentialContact[] = [];
    snap.forEach((docSnap) => { contacts.push(docSnap.data() as EssentialContact); });

    if (contacts.length === 0) {
      const defaultContacts = fallback.getEssentialContactsLocal();
      for (const c of defaultContacts) {
        await setDoc(doc(db, 'essential_contacts', c.id), c);
        contacts.push(c);
      }
    }
    return contacts;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.getEssentialContactsLocal();
    }
    handleFirestoreError(error, OperationType.LIST, 'essential_contacts');
  }
}

export async function saveEssentialContact(contact: EssentialContact): Promise<boolean> {
  if (isQuotaExceeded) return fallback.saveEssentialContactLocal(contact);
  try {
    await setDoc(doc(db, 'essential_contacts', contact.id), contact);
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.saveEssentialContactLocal(contact);
    }
    handleFirestoreError(error, OperationType.WRITE, `essential_contacts/${contact.id}`);
  }
}

export async function deleteEssentialContact(contactId: string): Promise<boolean> {
  if (isQuotaExceeded) return fallback.deleteEssentialContactLocal(contactId);
  try {
    await deleteDoc(doc(db, 'essential_contacts', contactId));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.deleteEssentialContactLocal(contactId);
    }
    handleFirestoreError(error, OperationType.DELETE, `essential_contacts/${contactId}`);
  }
}

export async function getComplaintsList(): Promise<Complaint[]> {
  if (isQuotaExceeded) return fallback.getComplaintsListLocal();
  try {
    const snap = await getDocs(collection(db, 'complaints'));
    const list: Complaint[] = [];
    snap.forEach((docSnap) => { list.push(docSnap.data() as Complaint); });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.getComplaintsListLocal();
    }
    handleFirestoreError(error, OperationType.LIST, 'complaints');
  }
}

export async function createComplaint(payload: any): Promise<Complaint> {
  if (isQuotaExceeded) return fallback.createComplaintLocal(payload);
  const { id, flatId, wing, flatNo, title, description, mediaUrl, mediaName, mediaType, status, createdAt, resolvedAt, resolvedBy, processNotes, attachments } = payload;
  const complaintId = id || 'comp_' + Math.random().toString(36).substring(2, 11);
  const derivedFlatId = flatId || (wing && flatNo ? `${wing}-${flatNo}` : 'B-1104');
  const newComplaint: Complaint = {
    id: complaintId, flatId: derivedFlatId, title: title || '', description: description || '', mediaUrl: mediaUrl || '',
    mediaName: mediaName || '', mediaType: mediaType || '', status: status || 'open', createdAt: createdAt || new Date().toISOString(),
    resolvedAt: resolvedAt || null, resolvedBy: resolvedBy || null, processNotes: processNotes || '', attachments: attachments || []
  };

  try {
    await setDoc(doc(db, 'complaints', complaintId), newComplaint);
    return newComplaint;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.createComplaintLocal(payload);
    }
    handleFirestoreError(error, OperationType.WRITE, `complaints/${complaintId}`);
  }
}

export async function updateComplaintStatus(
  complaintId: string, status: 'open' | 'in-progress' | 'resolved', resolvedBy?: string, processNotes?: string
): Promise<boolean> {
  if (isQuotaExceeded) return fallback.updateComplaintStatusLocal(complaintId, status, resolvedBy, processNotes);
  const docRef = doc(db, 'complaints', complaintId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Complaint;
      const updated = { ...data, status, resolvedAt: status === 'resolved' ? new Date().toISOString() : null, resolvedBy: status === 'resolved' ? resolvedBy || 'Secretary' : null, processNotes: processNotes !== undefined ? processNotes : (data.processNotes || '') };
      await setDoc(docRef, updated);
      return true;
    }
    return false;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.updateComplaintStatusLocal(complaintId, status, resolvedBy, processNotes);
    }
    handleFirestoreError(error, OperationType.WRITE, `complaints/${complaintId}`);
  }
}

export async function deleteComplaint(complaintId: string): Promise<boolean> {
  if (isQuotaExceeded) return fallback.deleteComplaintLocal(complaintId);
  try {
    await deleteDoc(doc(db, 'complaints', complaintId));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.deleteComplaintLocal(complaintId);
    }
    handleFirestoreError(error, OperationType.DELETE, `complaints/${complaintId}`);
  }
}

export async function getFinancialReportsList(): Promise<FinancialReport[]> {
  if (isQuotaExceeded) return fallback.getFinancialReportsListLocal();
  try {
    const snap = await getDocs(collection(db, 'financial_reports'));
    const reports: FinancialReport[] = [];
    snap.forEach((docSnap) => { reports.push(docSnap.data() as FinancialReport); });
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return reports;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.getFinancialReportsListLocal();
    }
    handleFirestoreError(error, OperationType.LIST, 'financial_reports');
  }
}

export async function createFinancialReport(payload: any): Promise<FinancialReport> {
  if (isQuotaExceeded) return fallback.createFinancialReportLocal(payload);
  const { id, month, year, title, description, pdfUrl, fileName, fileType, totalExpense, uploadedBy, reportType, createdAt, attachments } = payload;
  const reportId = id || 'fin_' + Math.random().toString(36).substring(2, 11);
  const newReport: FinancialReport = {
    id: reportId, month: month || new Date().toLocaleString('default', { month: 'long' }), year: parseInt(year, 10) || new Date().getFullYear(),
    title: title || '', description: description || '', pdfUrl: pdfUrl || '', fileName: fileName || '', fileType: fileType || '',
    totalExpense: parseFloat(totalExpense) || 0, createdAt: createdAt || new Date().toISOString(), uploadedBy: uploadedBy || 'Rahul Popat (B-1104 / Admin)',
    reportType: reportType || 'expense', attachments: attachments || []
  };

  try {
    await setDoc(doc(db, 'financial_reports', reportId), newReport);
    return newReport;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.createFinancialReportLocal(payload);
    }
    handleFirestoreError(error, OperationType.WRITE, `financial_reports/${reportId}`);
  }
}

export async function deleteFinancialReport(reportId: string): Promise<boolean> {
  if (isQuotaExceeded) return fallback.deleteFinancialReportLocal(reportId);
  try {
    await deleteDoc(doc(db, 'financial_reports', reportId));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.deleteFinancialReportLocal(reportId);
    }
    handleFirestoreError(error, OperationType.DELETE, `financial_reports/${reportId}`);
  }
}

export async function getFlatPasswords(): Promise<Record<string, string>> {
  if (isQuotaExceeded) return fallback.getFlatPasswordsLocal();
  try {
    const snap = await getDocs(collection(db, 'passwords'));
    const passwords: Record<string, string> = {};
    snap.forEach((docSnap) => { passwords[docSnap.id] = docSnap.data().password; });
    return passwords;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.getFlatPasswordsLocal();
    }
    handleFirestoreError(error, OperationType.LIST, 'passwords');
  }
}

export async function createSocietyNotification(payload: {
  type: 'notice' | 'financial' | 'complaint' | 'visitor' | 'amenity_request' | 'movie_schedule';
  title: string; message: string; wing?: string; flatNo?: number; metadata?: any;
}): Promise<boolean> {
  if (isQuotaExceeded) return fallback.createSocietyNotificationLocal(payload);
  const id = 'notif_' + Math.random().toString(36).substring(2, 11);
  const newNotif = { id, type: payload.type, title: payload.title, message: payload.message, wing: payload.wing || '', flatNo: payload.flatNo || 0, timestamp: new Date().toISOString(), metadata: payload.metadata || {} };
  try {
    await setDoc(doc(db, 'society_notifications', id), newNotif);
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      return fallback.createSocietyNotificationLocal(payload);
    }
    console.error('Failed to create society notification:', error);
    return false;
  }
}

export function subscribeToVisitorNotifications(wing: string, flatNo: number, onUpdate: (visitors: Visitor[]) => void, onError?: (error: Error) => void) {
  const getFiltered = () => {
    const visitors = fallback.getLocalVisitors();
    const filtered = visitors.filter(v => v.wing.toUpperCase() === wing.toUpperCase() && Number(v.flatNo) === Number(flatNo) && v.status === 'pending' && !v.deletedByResident);
    filtered.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
    return filtered;
  };
  if (isQuotaExceeded) {
    onUpdate(getFiltered());
    return fallback.localEvents.subscribe('visitor_update_trigger', () => onUpdate(getFiltered()));
  }
  let active = true;
  let unsubFirestore: any = null;
  try {
    unsubFirestore = onSnapshot(query(collection(db, 'notifications'), where('wing', '==', wing.toUpperCase()), where('flatNo', '==', Number(flatNo)), where('status', '==', 'pending')), (snapshot) => {
      if (!active) return;
      const pending: Visitor[] = [];
      snapshot.forEach((docSnap) => { pending.push(docSnap.data() as Visitor); });
      pending.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
      onUpdate(pending);
    }, (error) => {
      if (!active) return;
      if (isQuotaError(error)) {
        markQuotaExceeded();
        if (unsubFirestore) unsubFirestore();
        onUpdate(getFiltered());
        unsubFirestore = fallback.localEvents.subscribe('visitor_update_trigger', () => onUpdate(getFiltered()));
      } else if (onError) onError(error);
    });
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      onUpdate(getFiltered());
      unsubFirestore = fallback.localEvents.subscribe('visitor_update_trigger', () => onUpdate(getFiltered()));
    } else throw error;
  }
  return () => { active = false; if (unsubFirestore) unsubFirestore(); };
}

export function subscribeToAllVisitors(onUpdate: (visitors: Visitor[]) => void, onError?: (error: Error) => void) {
  const getSorted = () => {
    const list = fallback.getLocalVisitors();
    list.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
    return list;
  };
  if (isQuotaExceeded) {
    onUpdate(getSorted());
    return fallback.localEvents.subscribe('all_visitors', () => onUpdate(getSorted()));
  }
  let active = true;
  let unsubFirestore: any = null;
  try {
    unsubFirestore = onSnapshot(collection(db, 'visitors'), (snapshot) => {
      if (!active) return;
      const list: Visitor[] = [];
      snapshot.forEach((docSnap) => { list.push(docSnap.data() as Visitor); });
      list.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
      onUpdate(list);
    }, (error) => {
      if (!active) return;
      if (isQuotaError(error)) {
        markQuotaExceeded();
        if (unsubFirestore) unsubFirestore();
        onUpdate(getSorted());
        unsubFirestore = fallback.localEvents.subscribe('all_visitors', () => onUpdate(getSorted()));
      } else if (onError) onError(error);
    });
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      onUpdate(getSorted());
      unsubFirestore = fallback.localEvents.subscribe('all_visitors', () => onUpdate(getSorted()));
    } else throw error;
  }
  return () => { active = false; if (unsubFirestore) unsubFirestore(); };
}

export function subscribeToAnnouncements(wing: 'A' | 'B', flatNo: number, onUpdate: (announcements: Announcement[]) => void, onError?: (error: Error) => void) {
  const getFiltered = () => {
    const list = fallback.getLocalAnnouncements();
    const filtered = list.filter(item => item.target === 'all' || (item.target === 'wing' && item.wing === wing) || (item.target === 'flat' && item.wing === wing && item.flatNo === flatNo));
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered;
  };
  if (isQuotaExceeded) {
    onUpdate(getFiltered());
    return fallback.localEvents.subscribe('announcements_update_trigger', () => onUpdate(getFiltered()));
  }
  let active = true;
  let unsubFirestore: any = null;
  try {
    unsubFirestore = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      if (!active) return;
      const list: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Announcement;
        if (item.target === 'all' || (item.target === 'wing' && item.wing === wing) || (item.target === 'flat' && item.wing === wing && item.flatNo === flatNo)) {
          list.push(item);
        }
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(list);
    }, (error) => {
      if (!active) return;
      if (isQuotaError(error)) {
        markQuotaExceeded();
        if (unsubFirestore) unsubFirestore();
        onUpdate(getFiltered());
        unsubFirestore = fallback.localEvents.subscribe('announcements_update_trigger', () => onUpdate(getFiltered()));
      } else if (onError) onError(error);
    });
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      onUpdate(getFiltered());
      unsubFirestore = fallback.localEvents.subscribe('announcements_update_trigger', () => onUpdate(getFiltered()));
    } else throw error;
  }
  return () => { active = false; if (unsubFirestore) unsubFirestore(); };
}

export function subscribeToSocietyNotifications(wing: string, flatNo: number, onUpdate: (notifications: any[]) => void) {
  const getFiltered = () => {
    const list = fallback.getLocalSocietyNotifications();
    const filtered = list.filter(data => data.type !== 'visitor' || (data.wing.toUpperCase() === wing.toUpperCase() && Number(data.flatNo) === Number(flatNo)));
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered;
  };
  if (isQuotaExceeded) {
    onUpdate(getFiltered());
    return fallback.localEvents.subscribe('society_notifications_update_trigger', () => onUpdate(getFiltered()));
  }
  let active = true;
  let unsubFirestore: any = null;
  try {
    unsubFirestore = onSnapshot(collection(db, 'society_notifications'), (snapshot) => {
      if (!active) return;
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.type !== 'visitor' || (data.wing.toUpperCase() === wing.toUpperCase() && Number(data.flatNo) === Number(flatNo))) {
          list.push(data);
        }
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(list);
    }, (error) => {
      if (!active) return;
      if (isQuotaError(error)) {
        markQuotaExceeded();
        if (unsubFirestore) unsubFirestore();
        onUpdate(getFiltered());
        unsubFirestore = fallback.localEvents.subscribe('society_notifications_update_trigger', () => onUpdate(getFiltered()));
      }
    });
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExceeded();
      onUpdate(getFiltered());
      unsubFirestore = fallback.localEvents.subscribe('society_notifications_update_trigger', () => onUpdate(getFiltered()));
    } else throw error;
  }
  return () => { active = false; if (unsubFirestore) unsubFirestore(); };
}
