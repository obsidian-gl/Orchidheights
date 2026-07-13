/**
 * Orchid Heights Apartment Management System
 * Backend FCM Notifications Manager
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { collection, onSnapshot, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

let messaging: Messaging | null = null;

try {
  // Initialize Firebase Admin SDK for Cloud Messaging (FCM)
  // On Cloud Run, it auto-detects credentials. Locally, it falls back gracefully if credentials are not configured.
  const apps = getApps();
  const app = apps.length === 0 ? initializeApp({
    projectId: firebaseConfig.projectId
  }) : getApp();
  
  messaging = getMessaging(app);
  console.log('[Server FCM] Firebase Admin SDK initialized successfully for FCM.');
} catch (error) {
  console.error('[Server FCM] Failed to initialize Firebase Admin:', error);
}

/**
 * Send an FCM notification to all registered tokens for a specific flat
 */
export async function sendFCMToFlat(wing: string, flatNo: number, visitor: any) {
  if (!messaging) {
    console.warn('[Server FCM] Messaging not initialized. Skipping push alert.');
    return;
  }

  try {
    const fcmTokensCol = collection(db, 'fcm_tokens');
    const q = query(
      fcmTokensCol,
      where('wing', '==', wing),
      where('flatNo', '==', Number(flatNo))
    );
    
    const querySnapshot = await getDocs(q);
    const tokens: string[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });

    if (tokens.length === 0) {
      console.log(`[Server FCM] No registered device tokens found for Flat ${wing}-${flatNo}`);
      return;
    }

    console.log(`[Server FCM] Sending FCM push alert to ${tokens.length} devices for Flat ${wing}-${flatNo}`);

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `🚪 New Visitor: ${visitor.fullName}`,
        body: `Guest Type: ${visitor.guestType}\nReason: ${visitor.reason}`,
      },
      data: {
        id: visitor.id,
        type: 'visitor',
        wing: visitor.wing,
        flatNo: String(visitor.flatNo),
        photoUrl: visitor.photoUrl || '',
        visitorCount: String(visitor.visitorCount || 1)
      },
      webpush: {
        fcmOptions: {
          link: '/visitors'
        },
        notification: {
          icon: visitor.photoUrl || 'https://i.ibb.co/zT5tpcdY/1000296229-1.png',
          badge: 'https://i.ibb.co/zT5tpcdY/1000296229-1.png',
          sound: '/assets/alert.mp3',
          requireInteraction: true,
          actions: [
            { action: 'approve', title: '✅ Approve' },
            { action: 'reject', title: '❌ Reject' }
          ]
        }
      }
    });

    // Cleanup expired / invalid tokens
    if (response.responses && response.responses.length > 0) {
      for (let i = 0; i < response.responses.length; i++) {
        const res = response.responses[i];
        if (!res.success && res.error) {
          const errorCode = res.error.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/invalid-argument'
          ) {
            const badToken = tokens[i];
            console.log(`[Server FCM] Automatically purging invalid/expired FCM token: ${badToken}`);
            try {
              await deleteDoc(doc(db, 'fcm_tokens', badToken));
            } catch (err) {
              console.error('[Server FCM] Failed to delete token from DB:', err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Server FCM] Error during flat-specific multicast send:', err);
  }
}

/**
 * Broadcast an FCM notice to ALL registered devices
 */
export async function broadcastFCMNotice(notif: any) {
  if (!messaging) return;

  try {
    const fcmTokensCol = collection(db, 'fcm_tokens');
    const querySnapshot = await getDocs(fcmTokensCol);
    const tokens: string[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });

    if (tokens.length === 0) return;

    console.log(`[Server FCM] Broadcasting society alert to ${tokens.length} devices.`);

    await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: notif.title || '🔔 Orchid Heights Notice',
        body: notif.message,
      },
      data: {
        id: notif.id,
        type: notif.type,
        wing: notif.wing || '',
        flatNo: String(notif.flatNo || 0)
      },
      webpush: {
        fcmOptions: {
          link: notif.type === 'notice' ? '/helpdesk' : '/notifications'
        },
        notification: {
          icon: 'https://i.ibb.co/zT5tpcdY/1000296229-1.png',
          badge: 'https://i.ibb.co/zT5tpcdY/1000296229-1.png',
        }
      }
    });
  } catch (err) {
    console.error('[Server FCM] Error during broadcast multicast send:', err);
  }
}

/**
 * Start background listeners on the server to automatically send FCM pushes on new Firestore entries
 */
export function startServerNotificationListener() {
  console.log('[Server FCM] Initializing background Firestore triggers...');

  const visitorsCol = collection(db, 'visitors');
  const societyNotifCol = collection(db, 'society_notifications');

  let isInitialVisitors = true;
  let isInitialSociety = true;

  // 1. Reactive trigger for new visitor entry requests
  onSnapshot(visitorsCol, async (snapshot) => {
    if (isInitialVisitors) {
      isInitialVisitors = false;
      console.log('[Server FCM] Stored visitors index loaded. Triggers are armed.');
      return;
    }

    const docChanges = snapshot.docChanges();
    for (const change of docChanges) {
      if (change.type === 'added') {
        const visitor = change.doc.data();
        if (visitor.status === 'pending') {
          // Verify that request is recent to prevent redundant triggers on system boot
          const requestTime = new Date(visitor.requestTime).getTime();
          const now = Date.now();
          if (now - requestTime < 5 * 60 * 1000) { // last 5 minutes
            console.log(`[Server FCM] Reactive push triggered for visitor: ${visitor.fullName} (Flat ${visitor.wing}-${visitor.flatNo})`);
            await sendFCMToFlat(visitor.wing, visitor.flatNo, visitor);
          }
        }
      }
    }
  }, (err) => {
    console.error('[Server FCM] Visitors Firestore subscription failed:', err);
  });

  // 2. Reactive trigger for general society broadcasts (Notices, Announcements, etc.)
  onSnapshot(societyNotifCol, async (snapshot) => {
    if (isInitialSociety) {
      isInitialSociety = false;
      console.log('[Server FCM] Stored society notifications index loaded. Broadcast triggers are armed.');
      return;
    }

    const docChanges = snapshot.docChanges();
    for (const change of docChanges) {
      if (change.type === 'added') {
        const notif = change.doc.data();
        // Visitor requests are already handled by the visitorsCol subscription specifically
        if (notif.type !== 'visitor') {
          const timestamp = new Date(notif.timestamp).getTime();
          const now = Date.now();
          if (now - timestamp < 2 * 60 * 1000) { // within 2 minutes of being created
            console.log(`[Server FCM] Reactive push triggered for society alert: ${notif.title}`);
            await broadcastFCMNotice(notif);
          }
        }
      }
    }
  }, (err) => {
    console.error('[Server FCM] Society notifications Firestore subscription failed:', err);
  });
}
