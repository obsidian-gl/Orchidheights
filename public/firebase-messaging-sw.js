/**
 * Firebase Messaging & Background Sync Service Worker
 * Orchid Heights Apartment Management System
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyARuaG8wXchD_21vQQcgMkBam1eFpDyn7w",
  authDomain: "elaborate-valor-f2t1j.firebaseapp.com",
  projectId: "elaborate-valor-f2t1j",
  storageBucket: "elaborate-valor-f2t1j.firebasestorage.app",
  messagingSenderId: "193733254976",
  appId: "1:193733254976:web:8ba04c424389e3dd1fa4a5"
});

const messaging = firebase.messaging();
const db = firebase.firestore();

let activeUnsubscribe = null;
let activeSocietyUnsubscribe = null;
const notifiedIds = new Set();
const notifiedSocietyIds = new Set();

// Check Cache Storage and setup background listeners for visitors
function syncBackgroundListeners() {
  if (typeof caches === 'undefined') return;

  caches.open('orchid-user-cache')
    .then(cache => cache.match('/current-user.json'))
    .then(response => {
      if (!response) {
        console.log('[SW] No cached session found. Stopping background listener.');
        if (activeUnsubscribe) {
          activeUnsubscribe();
          activeUnsubscribe = null;
        }
        if (activeSocietyUnsubscribe) {
          activeSocietyUnsubscribe();
          activeSocietyUnsubscribe = null;
        }
        return;
      }
      return response.json();
    })
    .then(session => {
      if (!session || !session.wing || !session.flatNo) {
        return;
      }
      setupVisitorListener(session.wing, session.flatNo);
      setupSocietyNotificationListener(session.wing, session.flatNo);
    })
    .catch(err => {
      console.warn('[SW] Error syncing background listeners:', err);
    });
}

// Subscribe to real-time visitors for the specific flat in the background
function setupVisitorListener(wing, flatNo) {
  if (activeUnsubscribe) {
    activeUnsubscribe();
  }

  console.log(`[SW] Starting background visitor snapshot listener for flat ${wing}-${flatNo}`);

  activeUnsubscribe = db.collection('visitors')
    .where('wing', '==', wing)
    .where('flatNo', '==', Number(flatNo))
    .where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const visitor = change.doc.data();

          // Ensure we don't alert for old records on initial snapshot load
          const requestTimeMs = visitor.requestTime ? new Date(visitor.requestTime).getTime() : Date.now();
          const isFresh = (Date.now() - requestTimeMs) < 60000;

          if (!notifiedIds.has(docId) && isFresh) {
            notifiedIds.add(docId);
            
            const title = `🚪 New Visitor: ${visitor.fullName}`;
            const body = `Guest Type: ${visitor.guestType}\nWing-Flat: ${visitor.wing}-${visitor.flatNo}\nReason: ${visitor.reason}`;
            const icon = visitor.photoUrl || 'https://i.ibb.co/zT5tpcdY/1000296229-1.png';

            self.registration.showNotification(title, {
              body,
              icon,
              badge: 'https://i.ibb.co/zT5tpcdY/1000296229-1.png',
              tag: docId,
              requireInteraction: true,
              data: { 
                visitorId: docId, 
                wing, 
                flatNo 
              },
              actions: [
                { action: 'approve', title: '✅ Approve' },
                { action: 'reject', title: '❌ Reject' }
              ]
            });
          } else {
            // Keep track of pre-existing documents loaded on snapshot initiation
            notifiedIds.add(docId);
          }
        }
      });
    }, err => {
      console.error('[SW] Firestore background snapshot listener error:', err);
    });
}

// Subscribe to real-time society-wide notifications in the background
function setupSocietyNotificationListener(wing, flatNo) {
  if (activeSocietyUnsubscribe) {
    activeSocietyUnsubscribe();
  }

  console.log(`[SW] Starting background society notifications listener for flat ${wing}-${flatNo}`);

  activeSocietyUnsubscribe = db.collection('society_notifications')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const notif = change.doc.data();

          // Ensure we don't alert for old records on initial snapshot load
          const timestampVal = notif.timestamp || notif.createdAt || new Date().toISOString();
          const notifTime = new Date(timestampVal).getTime();
          const isFresh = (Date.now() - notifTime) < 60000;

          if (!notifiedSocietyIds.has(docId) && isFresh) {
            notifiedSocietyIds.add(docId);

            // Filter visitor notifications that do not belong to this flat
            if (notif.type === 'visitor') {
              const targetWing = notif.wing || notif.metadata?.wing || '';
              const targetFlat = notif.flatNo || notif.metadata?.flatNo || '';
              if (targetWing && targetFlat) {
                if (targetWing.toUpperCase() !== wing.toUpperCase() || Number(targetFlat) !== Number(flatNo)) {
                  return; // Skip, not our visitor
                }
              }
            }

            const title = notif.title || '🔔 Orchid Heights Alert';
            const body = notif.message || 'A new society alert has been broadcasted.';
            const icon = 'https://i.ibb.co/zT5tpcdY/1000296229-1.png';

            self.registration.showNotification(title, {
              body,
              icon,
              badge: 'https://i.ibb.co/zT5tpcdY/1000296229-1.png',
              tag: docId,
              requireInteraction: true,
              data: { 
                id: docId,
                type: notif.type,
                metadata: notif.metadata || {},
                wing,
                flatNo 
              }
            });
          } else {
            notifiedSocietyIds.add(docId);
          }
        }
      });
    }, err => {
      console.error('[SW] Firestore background society notifications listener error:', err);
    });
}

// FCM standard background messages support
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] FCM Background notification received:', payload);
  const title = payload.notification?.title || '🚪 New Visitor Request';
  const body = payload.notification?.body || 'A visitor is waiting at the gate for approval!';
  const icon = payload.notification?.image || 'https://i.ibb.co/zT5tpcdY/1000296229-1.png';
  
  self.registration.showNotification(title, {
    body,
    icon,
    badge: 'https://i.ibb.co/zT5tpcdY/1000296229-1.png',
    data: payload.data || {},
    requireInteraction: true,
    actions: [
      { action: 'approve', title: '✅ Approve' },
      { action: 'reject', title: '❌ Reject' }
    ]
  });
});

// Sync listeners on startup and registration events
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      syncBackgroundListeners();
    })
  );
});

// Periodic background check to keep subscription fresh
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'USER_SESSION_UPDATED') {
    console.log('[SW] Session update event received. Re-syncing background listener.');
    syncBackgroundListeners();
  }
});

// Handle notifications actions and click events
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const visitorId = event.notification.data?.visitorId || event.notification.data?.id;
  const action = event.action;

  if (action === 'approve' || action === 'reject') {
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    // Write directly to Firestore from the service worker background thread!
    const updatePromise = db.collection('visitors').doc(visitorId).update({
      status: status,
      respondedTime: new Date().toISOString(),
      respondedBy: 'Background SW Quick Action'
    }).then(() => {
      console.log(`[SW] Background successfully updated visitor ${visitorId} to status: ${status}`);
    }).catch(err => {
      console.error('[SW] Failed to update visitor status from background worker:', err);
    });

    // Broadcast status change to any active browser client tabs
    const broadcastPromise = clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('postMessage' in client) {
          client.postMessage({
            type: 'VISITOR_ACTION',
            visitorId: visitorId,
            status: status
          });
        }
      }
      
      // Focus or open the browser window to resident section
      if (clients.openWindow) {
        return clients.openWindow('/visitors');
      }
    });

    event.waitUntil(Promise.all([updatePromise, broadcastPromise]));
  } else {
    // Standard click on notification body - focus/open application with target route matching type
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        const targetType = event.notification.data?.type || 'notifications';
        const itemId = event.notification.data?.id || event.notification.data?.visitorId || '';
        
        let targetPath = '/notifications';
        if (targetType === 'notice') {
          targetPath = `/helpdesk?noticeId=${itemId}`;
        } else if (targetType === 'complaint') {
          targetPath = `/complaintbox?complaintId=${itemId}`;
        } else if (targetType === 'visitor_request' || targetType === 'visitor') {
          targetPath = '/visitors';
        } else if (targetType === 'movie_schedule') {
          const movieId = event.notification.data?.metadata?.movieId || '';
          targetPath = `/amenities/gym-schedule?movieId=${movieId}`;
        }

        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            if ('postMessage' in client) {
              client.postMessage({
                type: 'NOTIFICATION_CLICK_REDIRECT',
                target: targetType,
                itemId: itemId,
                metadata: event.notification.data?.metadata || {}
              });
            }
            // Navigate the open window to targetPath as well to ensure perfect deep linking
            if ('navigate' in client) {
              client.navigate(targetPath);
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetPath);
        }
      })
    );
  }
});

// Try to trigger background checks on wake-up
syncBackgroundListeners();
