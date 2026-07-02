/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit,
  onSnapshot,
  where
} from 'firebase/firestore';
import { FlatOwner, Visitor } from '../types';
import { getInitialOwners } from '../data/ownersData';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific database ID from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
    const q = query(ownersCol, limit(1));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log('--- Seeding Firestore with default residents and passwords ---');
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

      const isB1104Admin = wing === 'B' && flatNum === 1104;

      return {
        success: true,
        session: {
          role: isB1104Admin ? 'admin' : 'owner',
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
  const { fullName, mobileNumber, email, wing, flatNo, reason, guestType, photoUrl, flatOwnerName } = payload;
  const visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
  
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
    flatOwnerName: flatOwnerName || `Flat ${wing}-${flatNo}`
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
      flatOwnerName: newVisitor.flatOwnerName
    });

    return newVisitor;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `visitors/${visitorId}`);
  }
}

/**
 * Fetch visitor list based on filters
 */
export async function getVisitorsList(filters?: { wing?: string; flatNo?: number; limitNo?: number }): Promise<Visitor[]> {
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
export async function respondToVisitorRequest(visitorId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; visitor?: Visitor }> {
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
  const updated = {
    ...currentVisitor,
    status,
    respondedTime: new Date().toISOString()
  };

  try {
    await setDoc(visitorRef, updated);

    // Explicitly update the status in the 'notifications' collection
    await setDoc(doc(db, 'notifications', visitorId), {
      status,
      respondedTime: updated.respondedTime
    }, { merge: true });
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
    await deleteDoc(visitorRef);
    // Also delete the matching notification
    await deleteDoc(doc(db, 'notifications', visitorId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `visitors/${visitorId}`);
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
