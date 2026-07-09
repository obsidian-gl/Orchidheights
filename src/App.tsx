/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FlatOwner, UserSession } from './types';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SecurityDashboard from './components/SecurityDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import AdminDashboard from './components/AdminDashboard';
import Directory from './components/Directory';
import { api, detectServerEnvironment } from './lib/api';

function AdminLoginForm({ onLoginSuccess, onGoBack }: { onLoginSuccess: (sess: any) => void; onGoBack: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username === 'orchidheights' && password === '9898180810') {
      onLoginSuccess({ username: 'orchidheights', role: 'admin' });
    } else {
      setError('Invalid admin credentials. Access Denied.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 p-3.5 rounded-2xl shadow-inner mb-2">
            <span className="font-sans font-black text-xl tracking-tight">OH</span>
          </div>
          <h2 className="font-display font-black text-xl text-white tracking-tight">Private Administration</h2>
          <p className="text-xs text-slate-400">Enter secure keys to access the Orchid Heights control center.</p>
        </div>

        {error && (
          <p className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold text-center">
            ⚠️ {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
            <input
              type="text" required
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:bg-slate-900/50 rounded-xl py-3 px-4 text-sm font-semibold text-white outline-none transition"
              placeholder="Username"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:bg-slate-900/50 rounded-xl py-3 pl-4 pr-10 text-sm font-semibold text-white outline-none transition"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg transition duration-150 transform active:scale-95 cursor-pointer"
          >
            Authenticate Control Suite
          </button>
        </form>

        <button
          type="button"
          onClick={onGoBack}
          className="w-full text-slate-400 hover:text-white text-xs font-bold py-2 hover:bg-slate-800/40 rounded-xl transition cursor-pointer"
        >
          ← Return to Gatekeeper System
        </button>
      </div>
    </div>
  );
}

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

  const [isAdminPath, setIsAdminPath] = useState(() => window.location.pathname === '/admin');
  const [adminSession, setAdminSession] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('orchid_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handlePathChange = () => {
      setIsAdminPath(window.location.pathname === '/admin');
    };
    window.addEventListener('popstate', handlePathChange);
    
    const interval = setInterval(() => {
      const isCurrentlyAdmin = window.location.pathname === '/admin';
      if (isCurrentlyAdmin !== isAdminPath) {
        setIsAdminPath(isCurrentlyAdmin);
      }
    }, 1000);

    return () => {
      window.removeEventListener('popstate', handlePathChange);
      clearInterval(interval);
    };
  }, [isAdminPath]);

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

  // Handle loading states gracefully
  if (loadingOwners && owners.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="inline-block border-4 border-indigo-600 border-t-transparent rounded-full w-10 h-10 animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600 font-display">Powering up Orchid Heights Gatekeeper...</p>
        </div>
      </div>
    );
  }

  // Conditional Admin view logic
  if (isAdminPath) {
    if (!adminSession) {
      return (
        <AdminLoginForm
          onLoginSuccess={(sess) => {
            localStorage.setItem('orchid_admin_session', JSON.stringify(sess));
            setAdminSession(sess);
          }}
          onGoBack={() => {
            window.history.pushState({}, '', '/');
            setIsAdminPath(false);
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-sm py-4 text-left">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
                <span className="text-xs font-black">OH</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-sm sm:text-base text-white tracking-tight">Orchid Heights Admin Portal</h1>
                <p className="text-[10px] text-slate-400">Authenticated: orchidheights</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('orchid_admin_session');
                setAdminSession(null);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              Log Out Admin
            </button>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminDashboard
            owners={owners}
            onRefreshOwners={loadOwners}
            onLogoutAdmin={() => {
              localStorage.removeItem('orchid_admin_session');
              setAdminSession(null);
            }}
          />
        </main>
      </div>
    );
  }

  // Unauthenticated user fallback: Show login screen
  if (!session) {
    return (
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
    );
  }

  return (
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

            {activeTab === 'admin' && session.role === 'admin' && (
              <AdminDashboard
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
  );
}
