/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LogOut, Shield, Home, Clock, Phone, Building } from 'lucide-react';
import { UserSession } from '../types';

interface NavbarProps {
  session: UserSession;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ session, onLogout, activeTab, setActiveTab }: NavbarProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleLabel = () => {
    if (session.role === 'admin') return 'Resident Admin';
    if (session.role === 'security') return 'Gate Security';
    return `Resident Flat ${session.wing}-${session.flatNo}`;
  };

  const getRoleIcon = () => {
    if (session.role === 'security') return <Shield className="w-4 h-4 text-emerald-600" />;
    return <Home className="w-4 h-4 text-indigo-600" />;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 bg-white border border-slate-200 flex items-center justify-center p-0.5">
              <img 
                src="https://i.ibb.co/zT5tpcdY/1000296229-1.png" 
                alt="Orchid Heights Logo" 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-baseline space-x-1">
                <span className="font-display font-bold text-lg text-slate-900 tracking-tight">Orchid Heights</span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">ઓર્કીડ હાઇટ્સ</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider hidden sm:block">Gate Security System</p>
            </div>
          </div>

          {/* Navigation Links for Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {session.role === 'security' && (
              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'security'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Gate Entry
              </button>
            )}
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center space-x-4">
            {/* Clock */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-slate-600 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{time || '00:00:00'}</span>
            </div>

            {/* Profile Info */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-100 p-1.5 pr-3 rounded-xl">
              <div className="bg-white p-1 rounded-lg border border-slate-200">
                {getRoleIcon()}
              </div>
              <div className="text-left leading-none">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {getRoleLabel()}
                </p>
                <p className="text-xs font-medium text-slate-700 max-w-[120px] truncate">
                  {session.role === 'security' ? 'Gate Guard' : session.ownerName}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 p-2 rounded-lg text-slate-500 transition shadow-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        {session.role === 'security' && (
          <div className="flex md:hidden border-t border-slate-100 py-2 justify-around">
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'security' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'
              }`}
            >
              Gate Entry
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
