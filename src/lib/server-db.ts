/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { db } from './firebase';
import { 
  collection as rawCollection,
  doc as rawDoc,
  getDoc as rawGetDoc,
  getDocs as rawGetDocs,
  setDoc as rawSetDoc,
  deleteDoc as rawDeleteDoc
} from 'firebase/firestore';
import { getInitialOwners } from '../data/ownersData';
import { FlatOwner, Visitor, Announcement, DeviceInfo, Complaint, FinancialReport, EssentialContact } from '../types';

const serverDbPath = path.join(process.cwd(), 'server-db.json');

let isServerQuotaExceeded = false;

// Helper to check if error is a Firestore quota error
function isQuotaError(error: any): boolean {
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

// Read local server-db.json
function readLocalDb(): any {
  try {
    if (!fs.existsSync(serverDbPath)) {
      return initializeLocalDb();
    }
    const data = fs.readFileSync(serverDbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading server-db.json:', err);
    return {};
  }
}

// Write local server-db.json
function writeLocalDb(data: any) {
  try {
    fs.writeFileSync(serverDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing server-db.json:', err);
  }
}

// Initialize server-db.json with default owners and passwords
function initializeLocalDb(): any {
  console.log('--- Initializing local server-db.json with default data ---');
  const initialOwners = getInitialOwners();
  const passwords: Record<string, string> = {};
  initialOwners.forEach((owner) => {
    const id = `${owner.wing}-${owner.flatNo}`;
    passwords[id] = (owner.wing === 'B' && owner.flatNo === 1104) ? '9898180810' : 'admin@123';
  });

  const defaultContacts = [
    { id: 'ec_1', name: 'Ramesh Patel', category: 'Plumber', phone: '9825012345', active: true },
    { id: 'ec_2', name: 'Kishore Parmar', category: 'Electrician', phone: '9898022334', active: true },
    { id: 'ec_3', name: 'Gate 1 Guard Duty', category: 'Security', phone: '9426055667', active: true },
    { id: 'ec_4', name: 'Orchid Heights Manager', category: 'Manager', phone: '9712033445', active: true },
    { id: 'ec_5', name: 'Manish Mali', category: 'Gardener', phone: '9033099881', active: true }
  ];

  const initialDb = {
    owners: initialOwners,
    passwords: passwords,
    visitors: [],
    notifications: [],
    society_notifications: [],
    announcements: [],
    essential_contacts: defaultContacts,
    complaints: [],
    financial_reports: [],
    amenities_bookings: [],
    gym_theatre_logs: [],
    movies_schedule: [],
    daily_helpers: [],
    sos_alerts: [],
    absence_logs: []
  };

  writeLocalDb(initialDb);
  return initialDb;
}

// --- Generic Database CRUD ---

export async function getCollection(collectionName: string): Promise<any[]> {
  if (!isServerQuotaExceeded) {
    try {
      const snap = await rawGetDocs(rawCollection(db, collectionName));
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn(`Firestore quota exceeded during GET ${collectionName}. Switching server to local storage.`);
        isServerQuotaExceeded = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback to local server-db.json
  const localDb = readLocalDb();
  if (collectionName === 'passwords') {
    const passwordsObj = localDb.passwords || {};
    return Object.keys(passwordsObj).map(id => ({ id, password: passwordsObj[id] }));
  }
  return localDb[collectionName] || [];
}

export async function getDocument(collectionName: string, docId: string): Promise<any | null> {
  if (!isServerQuotaExceeded) {
    try {
      const snap = await rawGetDoc(rawDoc(db, collectionName, docId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn(`Firestore quota exceeded during GET ${collectionName}/${docId}. Switching server to local storage.`);
        isServerQuotaExceeded = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback to local server-db.json
  const localDb = readLocalDb();
  if (collectionName === 'passwords') {
    const pwd = localDb.passwords?.[docId];
    return pwd ? { id: docId, password: pwd } : null;
  }
  const collectionList = localDb[collectionName] || [];
  const doc = collectionList.find((item: any) => item.id === docId);
  return doc || null;
}

export async function addDocument(collectionName: string, data: any): Promise<any> {
  const docId = data.id || 'doc_' + Math.random().toString(36).substring(2, 11);
  const docData = { ...data, id: docId };

  if (!isServerQuotaExceeded) {
    try {
      await rawSetDoc(rawDoc(db, collectionName, docId), docData);
      return docData;
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn(`Firestore quota exceeded during POST ${collectionName}. Switching server to local storage.`);
        isServerQuotaExceeded = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback to local server-db.json
  const localDb = readLocalDb();
  if (!localDb[collectionName]) {
    localDb[collectionName] = [];
  }
  localDb[collectionName].push(docData);
  writeLocalDb(localDb);
  return docData;
}

export async function setDocument(collectionName: string, docId: string, data: any): Promise<any> {
  const docData = { ...data, id: docId };

  if (!isServerQuotaExceeded) {
    try {
      await rawSetDoc(rawDoc(db, collectionName, docId), docData, { merge: true });
      return docData;
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn(`Firestore quota exceeded during PUT ${collectionName}/${docId}. Switching server to local storage.`);
        isServerQuotaExceeded = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback to local server-db.json
  const localDb = readLocalDb();
  if (collectionName === 'passwords') {
    if (!localDb.passwords) localDb.passwords = {};
    localDb.passwords[docId] = data.password || data;
    writeLocalDb(localDb);
    return docData;
  }

  if (!localDb[collectionName]) {
    localDb[collectionName] = [];
  }
  const index = localDb[collectionName].findIndex((item: any) => item.id === docId);
  if (index > -1) {
    localDb[collectionName][index] = { ...localDb[collectionName][index], ...docData };
  } else {
    localDb[collectionName].push(docData);
  }
  writeLocalDb(localDb);
  return docData;
}

export async function deleteDocument(collectionName: string, docId: string): Promise<boolean> {
  if (!isServerQuotaExceeded) {
    try {
      await rawDeleteDoc(rawDoc(db, collectionName, docId));
      return true;
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn(`Firestore quota exceeded during DELETE ${collectionName}/${docId}. Switching server to local storage.`);
        isServerQuotaExceeded = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback to local server-db.json
  const localDb = readLocalDb();
  if (collectionName === 'passwords') {
    if (localDb.passwords?.[docId]) {
      delete localDb.passwords[docId];
      writeLocalDb(localDb);
      return true;
    }
    return false;
  }

  const collectionList = localDb[collectionName] || [];
  const index = collectionList.findIndex((item: any) => item.id === docId);
  if (index > -1) {
    collectionList.splice(index, 1);
    localDb[collectionName] = collectionList;
    writeLocalDb(localDb);
    return true;
  }
  return false;
}

// --- Specific API Endpoints Logic ---

export async function seedDatabaseIfNeeded() {
  readLocalDb(); // Automatically initializes if file is missing
}

export async function verifyCredentials(role: string, payload: any): Promise<{ success: boolean; session?: any; message?: string; code?: string; devices?: any[] }> {
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
    const pwdDoc = await getDocument('passwords', id);
    if (pwdDoc) {
      savedPassword = pwdDoc.password || pwdDoc;
    }

    if (password === savedPassword) {
      const ownerData = await getDocument('owners', id);
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

export async function getAllOwners(): Promise<FlatOwner[]> {
  const owners = await getCollection('owners');
  owners.sort((a, b) => a.wing !== b.wing ? a.wing.localeCompare(b.wing) : a.flatNo - b.flatNo);
  return owners;
}

export async function updateOwnerDetails(wing: string, flatNo: number, payload: any): Promise<{ success: boolean; owner?: FlatOwner; message?: string }> {
  const id = `${wing}-${flatNo}`;
  const currentOwner = await getDocument('owners', id);
  if (!currentOwner) return { success: false, message: 'Flat owner not found.' };

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

  await setDocument('owners', id, updated);

  if (password) {
    await setDocument('passwords', id, { password });
  }

  return { success: true, owner: updated };
}

export async function adminChangePassword(wing: string, flatNo: number, newPassword: string): Promise<boolean> {
  const id = `${wing}-${flatNo}`;
  await setDocument('passwords', id, { password: newPassword });
  return true;
}

export async function resetDatabaseToDefault(): Promise<boolean> {
  if (fs.existsSync(serverDbPath)) {
    fs.unlinkSync(serverDbPath);
  }
  initializeLocalDb();
  return true;
}

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

  await addDocument('visitors', newVisitor);

  // Also create a notification document in 'notifications' for real-time polling/listening
  const newNotification = {
    id: visitorId,
    fullName,
    mobileNumber,
    wing,
    flatNo: parseInt(flatNo, 10),
    reason,
    guestType,
    photoUrl: photoUrl || '',
    status: 'pending',
    requestTime: newVisitor.requestTime,
    visitorCount: count
  };
  await setDocument('notifications', visitorId, newNotification);

  // Create society notification for general logs
  await addDocument('society_notifications', {
    type: 'visitor',
    title: `🚪 Gate Visitor: ${fullName}`,
    message: `A visitor (${fullName}, ${guestType}) is requesting entry to Flat ${wing}-${flatNo} for ${reason}.`,
    wing,
    flatNo: parseInt(flatNo, 10),
    timestamp: new Date().toISOString(),
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

export async function getVisitorsList(filters?: { wing?: string; flatNo?: number; limitNo?: number; includeDeleted?: boolean }): Promise<Visitor[]> {
  let visitors = await getCollection('visitors');
  if (!filters?.includeDeleted) visitors = visitors.filter((v: any) => !v.deletedByResident);
  if (filters?.wing) visitors = visitors.filter((v: any) => v.wing.toUpperCase() === filters.wing!.toUpperCase());
  if (filters?.flatNo) visitors = visitors.filter((v: any) => Number(v.flatNo) === Number(filters.flatNo));

  visitors.sort((a: any, b: any) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
  if (filters?.limitNo) visitors = visitors.slice(0, filters.limitNo);
  return visitors;
}

export async function pollPendingVisitorAlerts(wing: string, flatNo: number): Promise<Visitor[]> {
  const visitors = await getCollection('visitors');
  return visitors.filter((v: any) => v.wing.toUpperCase() === wing.toUpperCase() && Number(v.flatNo) === Number(flatNo) && v.status === 'pending');
}

export async function respondToVisitorRequest(
  visitorId: string,
  status: 'approved' | 'rejected' | 'expired',
  respondedBy?: string,
  rejectReason?: string
): Promise<{ success: boolean; visitor?: Visitor }> {
  const visitor = await getDocument('visitors', visitorId);
  if (!visitor) return { success: false };

  const updated: Visitor = {
    ...visitor,
    status,
    respondedTime: new Date().toISOString(),
    respondedBy: respondedBy || 'Resident',
    rejectReason: rejectReason || ''
  };

  await setDocument('visitors', visitorId, updated);

  // Also update 'notifications' collection status
  const notif = await getDocument('notifications', visitorId);
  if (notif) {
    await setDocument('notifications', visitorId, { ...notif, status });
  }

  // Update society notification log status
  const societyNotifs = await getCollection('society_notifications');
  const sNotif = societyNotifs.find((n: any) => n.metadata && n.metadata.visitorId === visitorId);
  if (sNotif) {
    const newTitle = `🚪 Gate Visitor: ${visitor.fullName} (${status.toUpperCase()})`;
    const newMsg = status === 'approved'
      ? `Visitor ${visitor.fullName} (${visitor.guestType}) was APPROVED for entry to Flat ${visitor.wing}-${visitor.flatNo} by ${respondedBy || 'Resident'} for ${visitor.reason}.`
      : `Visitor ${visitor.fullName} (${visitor.guestType}) was REJECTED for entry to Flat ${visitor.wing}-${visitor.flatNo} by ${respondedBy || 'Resident'}.${rejectReason ? ' Reason: ' + rejectReason : ''}`;

    await setDocument('society_notifications', sNotif.id, {
      ...sNotif,
      title: newTitle,
      message: newMsg,
      status: status,
      metadata: {
        ...sNotif.metadata,
        status: status,
        respondedTime: updated.respondedTime,
        respondedBy: updated.respondedBy,
        rejectReason: updated.rejectReason
      }
    });
  }

  return { success: true, visitor: updated };
}

export async function deleteVisitorRequest(visitorId: string): Promise<boolean> {
  const visitor = await getDocument('visitors', visitorId);
  if (visitor) {
    await setDocument('visitors', visitorId, { ...visitor, deletedByResident: true });
    return true;
  }
  return false;
}
