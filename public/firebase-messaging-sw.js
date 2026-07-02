/**
 * Firebase Messaging Service Worker for Orchid Heights Apartment Management System
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyARuaG8wXchD_21vQQcgMkBam1eFpDyn7w",
  authDomain: "elaborate-valor-f2t1j.firebaseapp.com",
  projectId: "elaborate-valor-f2t1j",
  storageBucket: "elaborate-valor-f2t1j.firebasestorage.app",
  messagingSenderId: "193733254976",
  appId: "1:193733254976:web:8ba04c424389e3dd1fa4a5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background notification received:', payload);
  const title = payload.notification?.title || '🚪 New Visitor Request';
  const body = payload.notification?.body || 'A visitor is waiting at the gate for approval!';
  const icon = payload.notification?.image || '/icon.png';
  
  const options = {
    body,
    icon,
    badge: '/icon.png',
    data: payload.data || {},
    requireInteraction: true,
    actions: [
      { action: 'approve', title: '✅ Approve' },
      { action: 'reject', title: '❌ Reject' }
    ]
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const visitorId = event.notification.data?.visitorId || event.notification.data?.id;
  const action = event.action;

  if (action === 'approve' || action === 'reject') {
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    // Broadcast status change to any active clients
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        let sentToClient = false;
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('postMessage' in client) {
            client.postMessage({
              type: 'VISITOR_ACTION',
              visitorId: visitorId,
              status: status
            });
            sentToClient = true;
          }
        }
        
        // If there are no open client windows, we could hit a REST endpoint or Firestore directly
        // But the primary workflow is to focus or open the main application tab
        if (clients.openWindow) {
          return clients.openWindow('/?activeTab=resident');
        }
      })
    );
  } else {
    // Normal body click - open application
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/?activeTab=resident');
        }
      })
    );
  }
});
