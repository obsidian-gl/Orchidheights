/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FlatOwner, UserSession } from './types';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SecurityDashboard from './components/SecurityDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import Directory from './components/Directory';
import AdminPage from './components/AdminPage';
import { api, detectServerEnvironment } from './lib/api';

export default function App() {
  // Session details stored in localStorage for persistent logins
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('orchid_gate_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminSession, setAdminSession] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('orchid_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Master owners list
  const [owners, setOwners] = useState<FlatOwner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('directory');

  // Load the full list of flat owners
  const loadOwners = async () => {
    setLoadingOwners(true);
    try {
      await detectServerEnvironment();
      const data = await api.getOwners();
      if (Array.isArray(data)) {
        setOwners(data);
      }
    } catch (error) {
      console.error('Failed to load owners directory:', error);
    } finally {
      setLoadingOwners(false);
    }
  };

  // Fetch owners directory when app boots or session loads
  useEffect(() => {
    loadOwners();
  }, []);

  // Register service worker and request Notification permission on startup
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((reg) => {
          console.log('Orchid Heights service worker registered:', reg.scope);
        })
        .catch((err) => {
          console.error('Orchid Heights service worker registration failed:', err);
        });
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Set default tabs based on authenticated roles
  useEffect(() => {
    if (session) {
      if (session.role === 'security') {
        setActiveTab('security');
      } else if (session.role === 'owner' || session.role === 'admin') {
        setActiveTab('resident');
      }
    } else {
      setActiveTab('directory');
    }
  }, [session]);

  // Capture device details for security logs when residents log in
  useEffect(() => {
    if (session && (session.role === 'owner' || session.role === 'admin') && session.wing && session.flatNo) {
      const captureDevice = async () => {
        try {
          // Get or create unique browser/device persistent id
          const flatKey = `${session.wing}_${session.flatNo}`;
          let deviceId = localStorage.getItem(`orchid_device_uuid_${flatKey}`);
          if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + flatKey;
            localStorage.setItem(`orchid_device_uuid_${flatKey}`, deviceId);
          }

          // Get or create a virtual persistent IMEI number
          let imei = localStorage.getItem(`orchid_device_imei_${flatKey}`);
          if (!imei) {
            imei = '358401' + Math.floor(100000 + Math.random() * 900000) + Math.floor(10 + Math.random() * 90);
            localStorage.setItem(`orchid_device_imei_${flatKey}`, imei);
          }

          // Fetch public IP address using an online API, fallback if offline or failed
          let ipAddress = '127.0.0.1';
          try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            if (data.ip) ipAddress = data.ip;
          } catch {
            try {
              const res = await fetch('https://api64.ipify.org?format=json');
              const data = await res.json();
              if (data.ip) ipAddress = data.ip;
            } catch (e) {
              console.warn('IP lookup failed, using local network IP:', e);
            }
          }

          // Parse OS and Browser details elegantly
          const ua = navigator.userAgent;
          let os = 'Other Device';
          if (/android/i.test(ua)) os = 'Android';
          else if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
          else if (/win/i.test(ua)) os = 'Windows';
          else if (/mac/i.test(ua)) os = 'MacOS';
          else if (/linux/i.test(ua)) os = 'Linux';

          let browser = 'Browser';
          if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) browser = 'Chrome';
          else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
          else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
          else if (/edge|edg/i.test(ua)) browser = 'Edge';
          else if (/opr/i.test(ua)) browser = 'Opera';

          const devInfo = {
            deviceId,
            ipAddress,
            userAgent: ua,
            imei,
            os,
            browser,
            lastLogin: new Date().toISOString()
          };

          await api.registerDevice(session.wing, session.flatNo, devInfo);
          
          // Refresh local directory data after logging device
          const updatedOwners = await api.getOwners();
          if (Array.isArray(updatedOwners)) {
            setOwners(updatedOwners);
          }
        } catch (err) {
          console.error('Device registration error:', err);
        }
      };

      captureDevice();
    }
  }, [session]);

  // Synchronize current user session details to Cache Storage for PWA Service Worker background access
  useEffect(() => {
    if ('caches' in window) {
      if (session && (session.role === 'owner' || session.role === 'admin') && session.wing && session.flatNo) {
        const data = JSON.stringify({
          wing: session.wing,
          flatNo: session.flatNo,
          role: session.role
        });
        caches.open('orchid-user-cache').then((cache) => {
          cache.put('/current-user.json', new Response(data));
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'USER_SESSION_UPDATED' });
          }
        }).catch((err) => console.warn('Cache write failed:', err));
      } else {
        caches.open('orchid-user-cache').then((cache) => {
          cache.delete('/current-user.json');
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'USER_SESSION_UPDATED' });
          }
        }).catch((err) => console.warn('Cache delete failed:', err));
      }
    }
  }, [session]);

  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('orchid_gate_session', JSON.stringify(userSession));
    loadOwners(); // reload fresh directory data
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('orchid_gate_session');
    setActiveTab('directory');
  };

  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminPage
            owners={owners}
            onRefreshOwners={loadOwners}
            adminSession={adminSession}
            setAdminSession={setAdminSession}
          />
        }
      />
      <Route
        path="/*"
        element={
          loadingOwners && owners.length === 0 ? (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center space-y-4">
                <div className="inline-block border-4 border-indigo-600 border-t-transparent rounded-full w-10 h-10 animate-spin"></div>
                <p className="text-sm font-semibold text-slate-600 font-display">Powering up Orchid Heights Gatekeeper...</p>
              </div>
            </div>
          ) : !session ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="login-page"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <Login onLoginSuccess={handleLoginSuccess} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
              {/* Navigation Header */}
              <Navbar
                session={session}
                onLogout={handleLogout}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />

              {/* Main Layout Stage */}
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full"
                  >
                    {activeTab === 'security' && session.role === 'security' && (
                      <SecurityDashboard
                        owners={owners}
                        onRefreshOwners={loadOwners}
                      />
                    )}

                    {activeTab === 'resident' && (session.role === 'owner' || session.role === 'admin') && (
                      <ResidentDashboard
                        session={session}
                        owners={owners}
                        onRefreshOwners={loadOwners}
                      />
                    )}

                    {activeTab === 'directory' && (
                      <Directory
                        owners={owners}
                        session={session}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>

              {/* Footer Branding Panel */}
              <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-500">
                    Orchid Heights Gatekeeper • Smart Visitor Protection Panel
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Developed in high-fidelity full stack. All rights reserved. 
                  </p>
                </div>
              </footer>
            </div>
          )
        }
      />
    </Routes>
  );
}
