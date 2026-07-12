import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlatOwner } from '../types';
import AdminDashboard from './AdminDashboard';

interface AdminLoginFormProps {
  onLoginSuccess: (sess: any) => void;
  onGoBack: () => void;
}

function AdminLoginForm({ onLoginSuccess, onGoBack }: AdminLoginFormProps) {
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
          <div className="inline-flex bg-white border border-slate-800 p-1 rounded-2xl shadow-md mb-2 w-20 h-20 items-center justify-center">
            <img 
              src="https://i.ibb.co/zT5tpcdY/1000296229-1.png" 
              alt="Orchid Heights Logo" 
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
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
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:bg-slate-900/50 rounded-xl py-3 px-4 text-sm font-semibold text-white outline-none transition"
              placeholder="Username"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:bg-slate-900/50 rounded-xl py-3 pl-4 pr-10 text-sm font-semibold text-white outline-none transition"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 text-xs font-bold"
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

interface AdminPageProps {
  owners: FlatOwner[];
  onRefreshOwners: () => Promise<void>;
  adminSession: any;
  setAdminSession: (session: any) => void;
}

export default function AdminPage({
  owners,
  onRefreshOwners,
  adminSession,
  setAdminSession,
}: AdminPageProps) {
  const navigate = useNavigate();

  useEffect(() => {
    let link = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    const originalHref = link.href || '/manifest.json';
    link.href = '/admin-manifest.json';
    document.title = 'Orchid Admin';

    // Swap the favicon to the admin icon as well
    let iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    const originalIconHref = iconLink ? iconLink.href : 'https://i.ibb.co/zT5tpcdY/1000296229-1.png';
    if (iconLink) {
      iconLink.href = 'https://i.ibb.co/n8zFVXDk/Chat-GPT-Image-Jul-12-2026-10-51-40-PM.png';
    }

    return () => {
      link.href = originalHref;
      document.title = 'Orchid Heights Gatekeeper';
      if (iconLink) {
        iconLink.href = originalIconHref;
      }
    };
  }, []);

  const handleLoginSuccess = (sess: any) => {
    localStorage.setItem('orchid_admin_session', JSON.stringify(sess));
    setAdminSession(sess);
  };

  const handleLogout = () => {
    localStorage.removeItem('orchid_admin_session');
    setAdminSession(null);
  };

  if (!adminSession) {
    return (
      <AdminLoginForm
        onLoginSuccess={handleLoginSuccess}
        onGoBack={() => navigate('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-sm py-4 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0 bg-white border border-slate-800 flex items-center justify-center p-0.5">
              <img 
                src="https://i.ibb.co/zT5tpcdY/1000296229-1.png" 
                alt="Orchid Heights Logo" 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm sm:text-base text-white tracking-tight">
                Orchid Heights Admin Portal
              </h1>
              <p className="text-[10px] text-slate-400">Authenticated: orchidheights</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            Log Out Admin
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard
          owners={owners}
          onRefreshOwners={onRefreshOwners}
          onLogoutAdmin={handleLogout}
        />
      </main>
    </div>
  );
}
