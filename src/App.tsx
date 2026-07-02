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

  // Master owners list
  const [owners, setOwners] = useState<FlatOwner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('directory');

  // Load the full list of flat owners
  const loadOwners = async () => {
    setLoadingOwners(true);
    try {
      const response = await fetch('/api/owners');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setOwners(data);
        }
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
