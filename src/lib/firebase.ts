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

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific database ID from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Shared flag and event-dispatching helpers for quota status
export function checkQuotaExceeded(): boolean {
  return localStorage.getItem('firestore_quota_exceeded') === 'true';
}

export function setQuotaExceeded(val: boolean) {
  if (val) {
    if (localStorage.getItem('firestore_quota_exceeded') !== 'true') {
      localStorage.setItem('firestore_quota_exceeded', 'true');
      console.warn('⚠️ FIRESTORE QUOTA EXCEEDED: ACTIVATING RESILIENT OFFLINE FALLBACK ENGINE');
      window.dispatchEvent(new Event('firestore_quota_status_changed'));
      window.dispatchEvent(new Event('orchid_local_data_changed'));
    }
  } else {
    if (localStorage.getItem('firestore_quota_exceeded') === 'true') {
      localStorage.removeItem('firestore_quota_exceeded');
      console.log('✅ FIRESTORE QUOTA CLEAR: RESTORING LIVE SYNC');
      window.dispatchEvent(new Event('firestore_quota_status_changed'));
    }
  }
}

// Check if an error message suggests Firestore quota limits are exceeded
function isQuotaError(err: any): boolean {
  const errMsg = String(err?.message || err || '').toLowerCase();
  return (
    errMsg.includes('quota') ||
    errMsg.includes('exceeded') ||
    errMsg.includes('limit') ||
    errMsg.includes('resource_exhausted') ||
    errMsg.includes('exhausted')
  );
}

// Deeply sanitize data to remove undefined values before sending to Firestore
export function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = sanitizeData(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

// Path tracking weak maps for references and queries
const pathMap = new WeakMap<any, string>();
const constraintsMap = new WeakMap<any, { path: string; constraints: any[]; orderBy: any }>();

export const collection = (firestoreDb: any, path: string) => {
  const collRef = rawCollection(firestoreDb, path);
  pathMap.set(collRef, path);
  return collRef;
};

export const doc = (firestoreDb: any, path: string, ...segments: string[]) => {
  const fullPath = segments.length > 0 ? `${path}/${segments.join('/')}` : path;
  const docRef = rawDoc(firestoreDb, path, ...segments);
  pathMap.set(docRef, fullPath);
  return docRef;
};

export const where = (field: string, op: string, value: any) => {
  const c = rawWhere(field, op as any, value);
  (c as any)._localConstraint = { field, op, value };
  return c;
};

export const orderBy = (field: string, direction?: string) => {
  const o = rawOrderBy(field, direction as any);
  (o as any)._localOrderBy = { field, direction: direction || 'asc' };
  return o;
};

export const limit = (num: number) => {
  return rawLimit(num);
};

export const query = (queryRef: any, ...queryConstraints: any[]) => {
  const q = rawQuery(queryRef, ...queryConstraints);
  const path = pathMap.get(queryRef) || (queryRef ? queryRef.path : '');
  if (path) {
    pathMap.set(q, path);
    
    const localConstraints: any[] = [];
    let localOrderBy: any = null;
    queryConstraints.forEach(c => {
      if (c && c._localConstraint) {
        localConstraints.push(c._localConstraint);
      }
      if (c && c._localOrderBy) {
        localOrderBy = c._localOrderBy;
      }
    });
    
    constraintsMap.set(q, { path, constraints: localConstraints, orderBy: localOrderBy });
  }
  return q;
};

// Helper to parse a standard database reference path
function parsePath(path: string): { collection: string; docId?: string } {
  const cleanPath = path ? path.replace(/^\/+|\/+$/g, '') : '';
  const parts = cleanPath.split('/');
  return {
    collection: parts[0] || '',
    docId: parts[1] || undefined
  };
}

// Local storage fallback state manager
export function getLocalCollection(colName: string): any[] {
  const key = `orchid_fallback_${colName}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  
  // Default fallback seed data
  let defaults: any[] = [];
  if (colName === 'owners') {
    defaults = getInitialOwners();
  } else if (colName === 'passwords') {
    defaults = getInitialOwners().map(owner => {
      const id = `${owner.wing}-${owner.flatNo}`;
      const password = (owner.wing === 'B' && owner.flatNo === 1104) ? '9898180810' : 'admin@123';
      return { id, wing: owner.wing, flatNo: owner.flatNo, password };
    });
  } else if (colName === 'essential_contacts') {
    defaults = [
      { id: 'ec_1', name: 'Ramesh Patel', category: 'Plumber', phone: '9825012345', active: true },
      { id: 'ec_2', name: 'Kishore Parmar', category: 'Electrician', phone: '9898022334', active: true },
      { id: 'ec_3', name: 'Gate 1 Guard Duty', category: 'Security', phone: '9426055667', active: true },
      { id: 'ec_4', name: 'Orchid Heights Manager', category: 'Manager', phone: '9712033445', active: true },
      { id: 'ec_5', name: 'Manish Mali', category: 'Gardener', phone: '9033099881', active: true }
    ];
  } else if (colName === 'financial_reports') {
    defaults = [
      {
        id: 'fin_seed_1',
        month: 'June',
        year: 2026,
        title: 'June 2026 Maintenance & General Fund Accounts',
        description: 'Society maintenance collections, elevator maintenance, and electricity billing accounts ledger.',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileName: 'June_2026_Maintenance.pdf',
        fileType: 'application/pdf',
        totalExpense: 145000,
        createdAt: new Date().toISOString(),
        uploadedBy: 'Rahul Popat (B-1104 / Admin)',
        reportType: 'expense',
        attachments: []
      },
      {
        id: 'fin_seed_2',
        month: 'May',
        year: 2026,
        title: 'May 2026 Society Auditor Balance Sheets',
        description: 'Full balance sheet audited ledger for May 2026 operations.',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileName: 'May_2026_Audit_Report.pdf',
        fileType: 'application/pdf',
        totalExpense: 210000,
        createdAt: new Date().toISOString(),
        uploadedBy: 'Rahul Popat (B-1104 / Admin)',
        reportType: 'expense',
        attachments: []
      }
    ];
  } else if (colName === 'announcements') {
    defaults = [
      {
        id: 'ann_seed_1',
        target: 'all',
        text: '📢 Notice: Q2 Maintenance Payment Dues Reminder. All residents are requested to clear their Q2 maintenance dues by 15th July 2026 to avoid late fees.',
        timestamp: new Date().toISOString(),
        sender: 'Orchid Heights Administration',
        imageUrl: '',
        videoUrl: ''
      },
      {
        id: 'ann_seed_2',
        target: 'all',
        text: '🚪 Biometric Gate System Upgrade: A new modern biometric card reader scanner has been successfully deployed at Gate 1.',
        timestamp: new Date().toISOString(),
        sender: 'Orchid Heights Administration',
        imageUrl: '',
        videoUrl: ''
      }
    ];
  } else if (colName === 'daily_helpers') {
    defaults = [
      { id: 'dh_1', name: 'Pooja (Maid)', phone: '9876543210', role: 'Maid', flats: ['B-1104', 'B-1102'] },
      { id: 'dh_2', name: 'Ramesh (Milkman)', phone: '9876543211', role: 'Milkman', flats: ['B-1104', 'A-102'] },
      { id: 'dh_3', name: 'Suresh (Cleaner)', phone: '9876543212', role: 'Car Cleaner', flats: ['B-1104'] },
      { id: 'dh_4', name: 'Kamlesh (Plumber)', phone: '9876543213', role: 'Other', flats: [] },
    ];
  } else if (colName === 'movies_schedule') {
    defaults = [
      {
        id: 'movie_seed_1',
        title: 'Singham Again',
        genre: 'Action / Masala',
        timing: '8:00 PM',
        day: 'Friday',
        date: new Date().toISOString().split('T')[0],
        length: '2h 45m',
        trailerUrl: 'https://youtube.com',
        posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80',
        synopsis: 'The ultimate action cop entertainer is screening at our mini theater this Friday! Fun for the entire family.',
        rating: 'UA',
        createdAt: new Date().toISOString(),
        postedBy: 'B-1104'
      }
    ];
  }

  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function saveLocalCollection(colName: string, data: any[]) {
  const key = `orchid_fallback_${colName}`;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('orchid_local_data_changed'));
}

// In-memory filter evaluating queries on local collections
function filterLocalList(colName: string, q: any): any[] {
  let list = [...getLocalCollection(colName)];
  const queryInfo = constraintsMap.get(q);
  if (!queryInfo) return list;
  
  queryInfo.constraints.forEach(c => {
    const { field, op, value } = c;
    list = list.filter(item => {
      const itemVal = item[field];
      if (itemVal === undefined) return false;
      
      if (op === '==' || op === '===') {
        return String(itemVal).toUpperCase() === String(value).toUpperCase();
      }
      if (op === '!=') {
        return String(itemVal).toUpperCase() !== String(value).toUpperCase();
      }
      if (op === '>') {
        return itemVal > value;
      }
      if (op === '>=') {
        return itemVal >= value;
      }
      if (op === '<') {
        return itemVal < value;
      }
      if (op === '<=') {
        return itemVal <= value;
      }
      if (op === 'array-contains') {
        return Array.isArray(itemVal) && itemVal.includes(value);
      }
      return true;
    });
  });
  
  if (queryInfo.orderBy) {
    const { field, direction } = queryInfo.orderBy;
    list.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      
      let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else {
        comparison = (valA as any) - (valB as any);
      }
      return direction === 'desc' ? -comparison : comparison;
    });
  }
  
  return list;
}

// Simulated Mock snapshots
class MockDocumentSnapshot {
  id: string;
  private _data: any;
  existsFlag: boolean;
  
  constructor(id: string, data: any, existsFlag = true) {
    this.id = id;
    this._data = data;
    this.existsFlag = existsFlag && data !== undefined && data !== null;
  }
  
  exists() {
    return this.existsFlag;
  }
  
  data() {
    return this._data;
  }
}

class MockQuerySnapshot {
  docs: MockDocumentSnapshot[];
  size: number;
  empty: boolean;
  
  constructor(docs: MockDocumentSnapshot[]) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
  
  forEach(callback: (doc: MockDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// High-fidelity wraps executing live database, switching automatically upon rate limit/quota failures
export const getDoc = async (ref: any): Promise<any> => {
  if (checkQuotaExceeded()) {
    const path = pathMap.get(ref) || (ref ? ref.path : '');
    const { collection: colName, docId } = parsePath(path);
    if (!docId) return new MockDocumentSnapshot('', undefined, false);
    const localList = getLocalCollection(colName);
    const matched = localList.find(item => String(item.id) === String(docId) || String(item.wing + '-' + item.flatNo) === String(docId));
    return new MockDocumentSnapshot(docId, matched, !!matched);
  }
  try {
    return await rawGetDoc(ref);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return getDoc(ref);
    }
    throw error;
  }
};

export const getDocs = async (q: any): Promise<any> => {
  if (checkQuotaExceeded()) {
    const path = pathMap.get(q) || (q ? q.path : '');
    const { collection: colName } = parsePath(path);
    const filtered = filterLocalList(colName, q);
    const docs = filtered.map(item => {
      const itemId = item.id || `${item.wing}-${item.flatNo}`;
      return new MockDocumentSnapshot(itemId, item, true);
    });
    return new MockQuerySnapshot(docs);
  }
  try {
    return await rawGetDocs(q);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return getDocs(q);
    }
    throw error;
  }
};

export const setDoc = async (ref: any, data: any, options?: any): Promise<any> => {
  const sanitized = sanitizeData(data);
  if (checkQuotaExceeded()) {
    const path = pathMap.get(ref) || (ref ? ref.path : '');
    const { collection: colName, docId } = parsePath(path);
    if (!docId) return;
    const localList = getLocalCollection(colName);
    const idx = localList.findIndex(item => String(item.id) === String(docId) || String(item.wing + '-' + item.flatNo) === String(docId));
    if (idx > -1) {
      if (options?.merge) {
        localList[idx] = { ...localList[idx], ...sanitized };
      } else {
        localList[idx] = { ...sanitized, id: docId };
      }
    } else {
      localList.push({ ...sanitized, id: docId });
    }
    saveLocalCollection(colName, localList);
    return;
  }
  try {
    return await rawSetDoc(ref, sanitized, options);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return setDoc(ref, data, options);
    }
    throw error;
  }
};

export const addDoc = async (coll: any, data: any): Promise<any> => {
  const sanitized = sanitizeData(data);
  if (checkQuotaExceeded()) {
    const path = pathMap.get(coll) || (coll ? coll.path : '');
    const { collection: colName } = parsePath(path);
    const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
    const localList = getLocalCollection(colName);
    const newItem = { ...sanitized, id: docId };
    localList.push(newItem);
    saveLocalCollection(colName, localList);
    return { id: docId, path: `${colName}/${docId}` } as any;
  }
  try {
    return await rawAddDoc(coll, sanitized);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return addDoc(coll, data);
    }
    throw error;
  }
};

export const updateDoc = async (ref: any, data: any): Promise<any> => {
  const sanitized = sanitizeData(data);
  if (checkQuotaExceeded()) {
    const path = pathMap.get(ref) || (ref ? ref.path : '');
    const { collection: colName, docId } = parsePath(path);
    if (!docId) return;
    const localList = getLocalCollection(colName);
    const idx = localList.findIndex(item => String(item.id) === String(docId) || String(item.wing + '-' + item.flatNo) === String(docId));
    if (idx > -1) {
      localList[idx] = { ...localList[idx], ...sanitized };
      saveLocalCollection(colName, localList);
    }
    return;
  }
  try {
    return await rawUpdateDoc(ref, sanitized);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return updateDoc(ref, data);
    }
    throw error;
  }
};

export const deleteDoc = async (ref: any): Promise<any> => {
  if (checkQuotaExceeded()) {
    const path = pathMap.get(ref) || (ref ? ref.path : '');
    const { collection: colName, docId } = parsePath(path);
    if (!docId) return;
    const localList = getLocalCollection(colName);
    const filtered = localList.filter(item => String(item.id) !== String(docId) && String(item.wing + '-' + item.flatNo) !== String(docId));
    saveLocalCollection(colName, filtered);
    return;
  }
  try {
    return await rawDeleteDoc(ref);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return deleteDoc(ref);
    }
    throw error;
  }
};

export const onSnapshot = (ref_or_query: any, onNext: any, onError?: any): any => {
  if (checkQuotaExceeded()) {
    const triggerUpdate = () => {
      try {
        const path = pathMap.get(ref_or_query) || (ref_or_query ? ref_or_query.path : '');
        const { collection: colName, docId } = parsePath(path);
        if (docId) {
          const localList = getLocalCollection(colName);
          const matched = localList.find(item => String(item.id) === String(docId) || String(item.wing + '-' + item.flatNo) === String(docId));
          const snap = new MockDocumentSnapshot(docId, matched, !!matched);
          onNext(snap as any);
        } else {
          const filtered = filterLocalList(colName, ref_or_query);
          const docs = filtered.map(item => {
            const itemId = item.id || `${item.wing}-${item.flatNo}`;
            return new MockDocumentSnapshot(itemId, item, true);
          });
          const snap = new MockQuerySnapshot(docs);
          onNext(snap as any);
        }
      } catch (err) {
        console.error('Mock snapshot listener fail:', err);
      }
    };
    triggerUpdate();
    window.addEventListener('orchid_local_data_changed', triggerUpdate);
    return () => {
      window.removeEventListener('orchid_local_data_changed', triggerUpdate);
    };
  }
  
  const safeOnError = (error: any) => {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      onSnapshot(ref_or_query, onNext, onError);
      return;
    }
    if (onError) onError(error);
  };
  
  try {
    return rawOnSnapshot(ref_or_query, onNext, safeOnError);
  } catch (error) {
    if (isQuotaError(error)) {
      setQuotaExceeded(true);
      return onSnapshot(ref_or_query, onNext, onError);
    }
    throw error;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Seed the Firestore database with the initial Excel owners and default passwords if empty
 */
export async function seedDatabaseIfNeeded() {
  const pathForSeed = 'owners';
  try {
    const ownersCol = collection(db, 'owners');
    const q = query(ownersCol, limit(96));
    const snap = await getDocs(q);
    
    if (snap.size < 90) {
      console.log('--- Seeding Firestore with default residents and passwords (size < 90) ---');
      const initialOwners = getInitialOwners();
      
      for (const owner of initialOwners) {
        const id = `${owner.wing}-${owner.flatNo}`;
        
        // Write Flat Owner details
        await setDoc(doc(db, 'owners', id), owner);
        
        // Write Password mapping (Default admin@123 except B-1104 which is Rahul Popat's mobile)
        const password = (owner.wing === 'B' && owner.flatNo === 1104) ? '9898180810' : 'admin@123';
        await setDoc(doc(db, 'passwords', id), {
          wing: owner.wing,
          flatNo: owner.flatNo,
          password
        });
      }
      console.log('--- Firestore database seeded successfully! ---');
    }
  } catch (error) {
    console.error('Failed to seed Firestore database:', error);
    handleFirestoreError(error, OperationType.WRITE, pathForSeed);
  }
}

/**
 * Authenticate owner or security guard
 */
export async function verifyCredentials(role: string, payload: any): Promise<{ success: boolean; session?: any; message?: string }> {
  if (role === 'security') {
    if (payload.username === 'admin' && payload.password === 'admin@123') {
      return {
        success: true,
        session: { role: 'security', name: 'Security Guard' }
      };
    }
    return { success: false, message: 'Invalid Security Guard credentials.' };
  }

  if (role === 'owner' || role === 'admin') {
    const { wing, flatNo, password } = payload;
    if (!wing || !flatNo) {
      return { success: false, message: 'Wing and Flat number are required.' };
    }
    
    const flatNum = parseInt(flatNo, 10);
    const id = `${wing}-${flatNum}`;
    
    let savedPassword = 'admin@123';
    try {
      const pwdDoc = await getDoc(doc(db, 'passwords', id));
      if (pwdDoc.exists()) {
        savedPassword = pwdDoc.data().password;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `passwords/${id}`);
    }

    if (password === savedPassword) {
      let ownerData: FlatOwner | null = null;
      try {
        const ownerDoc = await getDoc(doc(db, 'owners', id));
        ownerData = ownerDoc.exists() ? (ownerDoc.data() as FlatOwner) : null;
      } catch (error) {
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
            } as any;
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

/**
 * Get all owners
 */
export async function getAllOwners(): Promise<FlatOwner[]> {
  await seedDatabaseIfNeeded(); // Always seed if empty
  const ownersCol = collection(db, 'owners');
  try {
    const snap = await getDocs(ownersCol);
    const owners: FlatOwner[] = [];
    snap.forEach((docSnap) => {
      owners.push(docSnap.data() as FlatOwner);
    });
    
    // Sort sequentially: Wing A first, then Wing B, then by Flat Number
    owners.sort((a, b) => {
      if (a.wing !== b.wing) {
        return a.wing.localeCompare(b.wing);
      }
      return a.flatNo - b.flatNo;
    });
    
    return owners;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'owners');
  }
}

/**
 * Update an owner details
 */
export async function updateOwnerDetails(wing: string, flatNo: number, payload: any): Promise<{ success: boolean; owner?: FlatOwner; message?: string }> {
  const id = `${wing}-${flatNo}`;
  const ownerRef = doc(db, 'owners', id);
  let ownerSnap;
  try {
    ownerSnap = await getDoc(ownerRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `owners/${id}`);
  }
  
  if (!ownerSnap.exists()) {
    return { success: false, message: 'Flat owner not found.' };
  }

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

  try {
    await setDoc(ownerRef, updated);

    if (password) {
      await setDoc(doc(db, 'passwords', id), {
        wing,
        flatNo,
        password
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `owners/${id}`);
  }

  return { success: true, owner: updated as FlatOwner };
}

/**
 * Change Flat Password override
 */
export async function adminChangePassword(wing: string, flatNo: number, newPassword: string): Promise<boolean> {
  const id = `${wing}-${flatNo}`;
  try {
    await setDoc(doc(db, 'passwords', id), {
      wing,
      flatNo,
      password: newPassword
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `passwords/${id}`);
  }
}

/**
 * Reset whole database
 */
export async function resetDatabaseToDefault(): Promise<boolean> {
  try {
    const ownersCol = collection(db, 'owners');
    const snap = await getDocs(ownersCol);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, 'owners', d.id));
      await deleteDoc(doc(db, 'passwords', d.id));
    }

    const visitorsCol = collection(db, 'visitors');
    const visitorsSnap = await getDocs(visitorsCol);
    for (const d of visitorsSnap.docs) {
      await deleteDoc(doc(db, 'visitors', d.id));
    }

    const notificationsCol = collection(db, 'notifications');
    const notificationsSnap = await getDocs(notificationsCol);
    for (const d of notificationsSnap.docs) {
      await deleteDoc(doc(db, 'notifications', d.id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'all_collections');
  }

  await seedDatabaseIfNeeded();
  return true;
}

/**
 * Create a new visitor request
 */
export async function registerVisitor(payload: any): Promise<Visitor> {
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

  try {
    await setDoc(doc(db, 'visitors', visitorId), newVisitor);
    
    // Explicitly write a document in the 'notifications' collection
    await setDoc(doc(db, 'notifications', visitorId), {
      id: visitorId,
      visitorId,
      fullName,
      mobileNumber,
      email: email || '',
      wing,
      flatNo: parseInt(flatNo, 10),
      reason,
      guestType,
      photoUrl: photoUrl || '',
      status: 'pending',
      requestTime: newVisitor.requestTime,
      flatOwnerName: newVisitor.flatOwnerName,
      visitorCount: count
    });

    // Write to unified society notification feed
    await createSocietyNotification({
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `visitors/${visitorId}`);
  }
}

/**
 * Fetch visitor list based on filters
 */
export async function getVisitorsList(filters?: { wing?: string; flatNo?: number; limitNo?: number; includeDeleted?: boolean }): Promise<Visitor[]> {
  const visitorsCol = collection(db, 'visitors');
  let snap;
  try {
    snap = await getDocs(visitorsCol);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'visitors');
  }

  let visitors: Visitor[] = [];
  
  snap.forEach((docSnap) => {
    visitors.push(docSnap.data() as Visitor);
  });

  if (!filters?.includeDeleted) {
    visitors = visitors.filter((v) => !v.deletedByResident);
  }

  if (filters?.wing) {
    visitors = visitors.filter((v) => v.wing.toUpperCase() === filters.wing!.toUpperCase());
  }
  if (filters?.flatNo) {
    visitors = visitors.filter((v) => Number(v.flatNo) === Number(filters.flatNo));
  }

  // Sort: Newest first
  visitors.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());

  if (filters?.limitNo) {
    visitors = visitors.slice(0, filters.limitNo);
  }

  return visitors;
}

/**
 * Fetch pending visitor alerts for a specific flat
 */
export async function pollPendingVisitorAlerts(wing: string, flatNo: number): Promise<Visitor[]> {
  const visitorsCol = collection(db, 'visitors');
  let snap;
  try {
    snap = await getDocs(visitorsCol);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'visitors');
  }

  const pending: Visitor[] = [];

  snap.forEach((docSnap) => {
    const v = docSnap.data() as Visitor;
    if (v.wing.toUpperCase() === wing.toUpperCase() && Number(v.flatNo) === Number(flatNo) && v.status === 'pending') {
      pending.push(v);
    }
  });

  return pending;
}

/**
 * Respond to visitor request
 */
export async function respondToVisitorRequest(
  visitorId: string,
  status: 'approved' | 'rejected' | 'expired',
  respondedBy?: string,
  rejectReason?: string
): Promise<{ success: boolean; visitor?: Visitor }> {
  const visitorRef = doc(db, 'visitors', visitorId);
  let snap;
  try {
    snap = await getDoc(visitorRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `visitors/${visitorId}`);
  }
  
  if (!snap.exists()) {
    return { success: false };
  }

  const currentVisitor = snap.data() as Visitor;
  const updated: Visitor = {
    ...currentVisitor,
    status,
    respondedTime: new Date().toISOString(),
    respondedBy: respondedBy || 'Resident',
    rejectReason: rejectReason || ''
  };

  try {
    await setDoc(visitorRef, updated);

    // Explicitly update the status in the 'notifications' collection
    await setDoc(doc(db, 'notifications', visitorId), {
      status,
      respondedTime: updated.respondedTime,
      respondedBy: updated.respondedBy,
      rejectReason: updated.rejectReason
    }, { merge: true });

    // Find and update the corresponding society notification log so the alerts panel displays the live response
    try {
      const societyNotificationsCol = collection(db, 'society_notifications');
      const q = query(societyNotificationsCol, where('metadata.visitorId', '==', visitorId));
      const societyNotifSnap = await getDocs(q);
      
      for (const docSnap of societyNotifSnap.docs) {
        const notifData = docSnap.data();
        const newTitle = `🚪 Gate Visitor: ${currentVisitor.fullName} (${status.toUpperCase()})`;
        const newMsg = status === 'approved'
          ? `Visitor ${currentVisitor.fullName} (${currentVisitor.guestType}) was APPROVED for entry to Flat ${currentVisitor.wing}-${currentVisitor.flatNo} by ${respondedBy || 'Resident'} for ${currentVisitor.reason}.`
          : `Visitor ${currentVisitor.fullName} (${currentVisitor.guestType}) was REJECTED for entry to Flat ${currentVisitor.wing}-${currentVisitor.flatNo} by ${respondedBy || 'Resident'}.${rejectReason ? ' Reason: ' + rejectReason : ''}`;
        
        await setDoc(doc(db, 'society_notifications', docSnap.id), {
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
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Failed to update society notifications log:', e);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `visitors/${visitorId}`);
  }

  return { success: true, visitor: updated };
}

/**
 * Delete a visitor request log
 */
export async function deleteVisitorRequest(visitorId: string): Promise<boolean> {
  const visitorRef = doc(db, 'visitors', visitorId);
  try {
    await setDoc(visitorRef, { deletedByResident: true }, { merge: true });
    // Also delete the matching notification so it doesn't pop up anymore
    await deleteDoc(doc(db, 'notifications', visitorId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `visitors/${visitorId}`);
  }
}

/**
 * Setup a real-time listener on pending notifications for a specific flat
 */
export function subscribeToVisitorNotifications(
  wing: string,
  flatNo: number,
  onUpdate: (visitors: Visitor[]) => void,
  onError?: (error: Error) => void
) {
  const notificationsCol = collection(db, 'notifications');
  const q = query(
    notificationsCol,
    where('wing', '==', wing.toUpperCase()),
    where('flatNo', '==', Number(flatNo)),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const pending: Visitor[] = [];
      snapshot.forEach((docSnap) => {
        pending.push(docSnap.data() as Visitor);
      });
      // Sort: Newest first (requestTime descending)
      pending.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
      onUpdate(pending);
    },
    (error) => {
      console.error('Snapshot listener error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Setup a real-time listener on all visitors for security panel
 */
export function subscribeToAllVisitors(
  onUpdate: (visitors: Visitor[]) => void,
  onError?: (error: Error) => void
) {
  const visitorsCol = collection(db, 'visitors');
  return onSnapshot(
    visitorsCol,
    (snapshot) => {
      const list: Visitor[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Visitor);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
      onUpdate(list);
    },
    (error) => {
      console.error('All visitors snapshot listener error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Creates a brand new announcement / broadcast targeted at specific residents.
 */
export async function sendBroadcastAnnouncement(
  target: 'all' | 'wing' | 'flat',
  wing: 'A' | 'B' | '',
  flatNo: number,
  text: string,
  sender: string,
  imageUrl?: string,
  videoUrl?: string
): Promise<boolean> {
  const id = 'ann_' + Math.random().toString(36).substring(2, 11);
  const docRef = doc(db, 'announcements', id);
  
  const payload: Announcement = {
    id,
    target,
    text,
    timestamp: new Date().toISOString(),
    sender,
    imageUrl: imageUrl || '',
    videoUrl: videoUrl || ''
  };
  
  if (wing) payload.wing = wing as 'A' | 'B';
  if (flatNo) payload.flatNo = flatNo;

  try {
    await setDoc(docRef, payload);
    return true;
  } catch (error) {
    console.error('Failed to send broadcast announcement:', error);
    return false;
  }
}

/**
 * Delete an announcement / notice
 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'announcements', id));
    return true;
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    return false;
  }
}

/**
 * Fetch all announcements for admin management
 */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const annCol = collection(db, 'announcements');
  try {
    const snap = await getDocs(annCol);
    const list: Announcement[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as Announcement);
    });
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'announcements');
  }
}

/**
 * Add or Edit an announcement
 */
export async function saveAnnouncement(ann: Announcement): Promise<boolean> {
  try {
    const cleaned: any = {
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
      attachments: ann.attachments || []
    };
    if (ann.wing) cleaned.wing = ann.wing;
    if (ann.flatNo) cleaned.flatNo = ann.flatNo;
    await setDoc(doc(db, 'announcements', ann.id), cleaned);
    return true;
  } catch (error) {
    console.error('Failed to save announcement:', error);
    return false;
  }
}

/**
 * Real-time subscription to targeted announcements for residents.
 */
export function subscribeToAnnouncements(
  wing: 'A' | 'B',
  flatNo: number,
  onUpdate: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void
) {
  const annCol = collection(db, 'announcements');
  return onSnapshot(
    annCol,
    (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Announcement;
        
        // Filter in-memory based on target rules
        const matchesAll = item.target === 'all';
        const matchesWing = item.target === 'wing' && item.wing === wing;
        const matchesFlat = item.target === 'flat' && item.wing === wing && item.flatNo === flatNo;
        
        if (matchesAll || matchesWing || matchesFlat) {
          list.push(item);
        }
      });
      
      // Sort newest first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(list);
    },
    (error) => {
      console.error('Announcements subscription failed:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Register or update a user's logged in device details
 */
export async function registerUserDevice(wing: string, flatNo: number, device: DeviceInfo): Promise<void> {
  const id = `${wing}-${flatNo}`;
  const ownerRef = doc(db, 'owners', id);
  try {
    const ownerSnap = await getDoc(ownerRef);
    if (ownerSnap.exists()) {
      const ownerData = ownerSnap.data() as FlatOwner;
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
      
      await setDoc(ownerRef, { devices: currentDevices }, { merge: true });
    }
  } catch (error) {
    console.error('Failed to register user device:', error);
  }
}

/**
 * Deregister/logout a user's logged in device details remotely
 */
export async function deregisterUserDevice(wing: string, flatNo: number, deviceId: string): Promise<boolean> {
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
    console.error('Failed to deregister user device:', error);
  }
  return false;
}

/**
 * Fetch all essential contacts
 */
export async function getEssentialContacts(): Promise<EssentialContact[]> {
  const contactsCol = collection(db, 'essential_contacts');
  try {
    const snap = await getDocs(contactsCol);
    const contacts: EssentialContact[] = [];
    snap.forEach((docSnap) => {
      contacts.push(docSnap.data() as EssentialContact);
    });

    if (contacts.length === 0) {
      // Seed with some default essential contacts
      const defaultContacts: EssentialContact[] = [
        { id: 'ec_1', name: 'Ramesh Patel', category: 'Plumber', phone: '9825012345', active: true },
        { id: 'ec_2', name: 'Kishore Parmar', category: 'Electrician', phone: '9898022334', active: true },
        { id: 'ec_3', name: 'Gate 1 Guard Duty', category: 'Security', phone: '9426055667', active: true },
        { id: 'ec_4', name: 'Orchid Heights Manager', category: 'Manager', phone: '9712033445', active: true },
        { id: 'ec_5', name: 'Manish Mali', category: 'Gardener', phone: '9033099881', active: true }
      ];
      for (const c of defaultContacts) {
        await setDoc(doc(db, 'essential_contacts', c.id), c);
        contacts.push(c);
      }
    }

    return contacts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'essential_contacts');
  }
}

/**
 * Add or update an essential contact
 */
export async function saveEssentialContact(contact: EssentialContact): Promise<boolean> {
  try {
    await setDoc(doc(db, 'essential_contacts', contact.id), contact);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `essential_contacts/${contact.id}`);
  }
}

/**
 * Delete an essential contact
 */
export async function deleteEssentialContact(contactId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'essential_contacts', contactId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `essential_contacts/${contactId}`);
  }
}

/**
 * Fetch all complaints
 */
export async function getComplaintsList(): Promise<Complaint[]> {
  const complaintsCol = collection(db, 'complaints');
  try {
    const snap = await getDocs(complaintsCol);
    const list: Complaint[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as Complaint);
    });
    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'complaints');
  }
}

/**
 * Create a new complaint
 */
export async function createComplaint(payload: any): Promise<Complaint> {
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

  try {
    await setDoc(doc(db, 'complaints', complaintId), newComplaint);
    return newComplaint;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `complaints/${complaintId}`);
  }
}

/**
 * Update complaint status
 */
export async function updateComplaintStatus(
  complaintId: string,
  status: 'open' | 'in-progress' | 'resolved',
  resolvedBy?: string,
  processNotes?: string
): Promise<boolean> {
  const docRef = doc(db, 'complaints', complaintId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Complaint;
      const updated: any = {
        ...data,
        status,
        resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
        resolvedBy: status === 'resolved' ? resolvedBy || 'Secretary' : null,
        processNotes: processNotes !== undefined ? processNotes : (data.processNotes || '')
      };
      await setDoc(docRef, updated);
      return true;
    }
    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `complaints/${complaintId}`);
  }
}

/**
 * Delete a complaint
 */
export async function deleteComplaint(complaintId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'complaints', complaintId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `complaints/${complaintId}`);
  }
}

/**
 * Fetch all financial reports
 */
export async function getFinancialReportsList(): Promise<FinancialReport[]> {
  const reportsCol = collection(db, 'financial_reports');
  try {
    const snap = await getDocs(reportsCol);
    const reports: FinancialReport[] = [];
    snap.forEach((docSnap) => {
      reports.push(docSnap.data() as FinancialReport);
    });
    // Sort newest first
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return reports;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'financial_reports');
  }
}

/**
 * Create a new financial report (supports upsert)
 */
export async function createFinancialReport(payload: any): Promise<FinancialReport> {
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

  try {
    await setDoc(doc(db, 'financial_reports', reportId), newReport);
    return newReport;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `financial_reports/${reportId}`);
  }
}

/**
 * Delete a financial report
 */
export async function deleteFinancialReport(reportId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'financial_reports', reportId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `financial_reports/${reportId}`);
  }
}

/**
 * Get all changed and active passwords
 */
export async function getFlatPasswords(): Promise<Record<string, string>> {
  const passwordsCol = collection(db, 'passwords');
  try {
    const snap = await getDocs(passwordsCol);
    const passwords: Record<string, string> = {};
    snap.forEach((docSnap) => {
      passwords[docSnap.id] = docSnap.data().password;
    });
    return passwords;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'passwords');
  }
}

/**
 * Create a new society notification
 */
export async function createSocietyNotification(payload: {
  type: 'notice' | 'financial' | 'complaint' | 'visitor' | 'amenity_request' | 'movie_schedule';
  title: string;
  message: string;
  wing?: string;
  flatNo?: number;
  metadata?: any;
}): Promise<boolean> {
  const id = 'notif_' + Math.random().toString(36).substring(2, 11);
  const docRef = doc(db, 'society_notifications', id);
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
  try {
    await setDoc(docRef, newNotif);
    return true;
  } catch (error) {
    console.error('Failed to create society notification:', error);
    return false;
  }
}

/**
 * Real-time subscription to society notifications (supports general feeds & flat-specific visitor alerts)
 */
export function subscribeToSocietyNotifications(
  wing: string,
  flatNo: number,
  onUpdate: (notifications: any[]) => void
) {
  const notifCol = collection(db, 'society_notifications');
  return onSnapshot(notifCol, (snapshot) => {
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Filter: notifications are visible to all owners (all wings/flats) EXCEPT:
      // visitor notifications which must go ONLY to their specific flat!
      if (data.type === 'visitor') {
        if (data.wing.toUpperCase() === wing.toUpperCase() && Number(data.flatNo) === Number(flatNo)) {
          list.push({ id: docSnap.id, ...data });
        }
      } else {
        // All other notifications are visible to all owners!
        list.push({ id: docSnap.id, ...data });
      }
    });
    // Sort: newest first
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    onUpdate(list);
  }, (error) => console.error('Society notifications subscription error:', error));
}
