/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Clock, Search, AlertCircle, CheckCircle2, XCircle, FileSpreadsheet, User, Phone, Check, Trash2, RefreshCw } from 'lucide-react';
import { FlatOwner, Visitor } from '../types';
import WebcamCapture from './WebcamCapture';
import { api, detectServerEnvironment } from '../lib/api';

const playDecisionSound = (status: 'approved' | 'rejected' | 'expired') => {
  if (status === 'expired') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    if (status === 'approved') {
      // Pleasant upward success chord
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.3); // G5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
    } else {
      // Downward buzzer warning tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220.00, now); // A3
      osc1.frequency.linearRampToValueAtTime(146.83, now + 0.35); // D3
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);
    }
  } catch (err) {
    console.warn('Could not play decision sound:', err);
  }
};

interface SecurityDashboardProps {
  owners: FlatOwner[];
  onRefreshOwners: () => void;
}

export default function SecurityDashboard({ owners, onRefreshOwners }: SecurityDashboardProps) {
  // Expiry window (Configurable, default 15 mins)
  const [expiryMinutes, setExpiryMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('orchid_expiry_window_min');
    return saved ? parseInt(saved, 10) : 15;
  });

  useEffect(() => {
    localStorage.setItem('orchid_expiry_window_min', expiryMinutes.toString());
  }, [expiryMinutes]);

  // Visitor Form State
  const [fullName, setFullName] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [wing, setWing] = useState<'A' | 'B'>('A');
  const [flatNo, setFlatNo] = useState<number>(101);
  const [reason, setReason] = useState<string>('');
  const [guestType, setGuestType] = useState<string>('Delivery');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [visitorCount, setVisitorCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Active Requests & Logs
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [logsSearch, setLogsSearch] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Sound effects / Visual popups for newly resolved visitors
  const [showStatusAlert, setShowStatusAlert] = useState<Visitor | null>(null);

  // Manual sync/refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await detectServerEnvironment();
      onRefreshOwners();
      await fetchVisitors();
    } catch (error) {
      console.error('Failed to perform manual sync:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate list of flats (101-104 up to 1201-1204)
  const flats: number[] = [];
  for (let floor = 1; floor <= 12; floor++) {
    for (let flatIndex = 1; flatIndex <= 4; flatIndex++) {
      flats.push(floor * 100 + flatIndex);
    }
  }

  // Lookup Owner Name dynamically based on wing & flatNo
  const currentOwner = owners.find((o) => o.wing === wing && o.flatNo === flatNo);
  const flatOwnerName = currentOwner && !currentOwner.nameEn.toLowerCase().includes('vacant')
    ? `${currentOwner.nameEn} (${currentOwner.nameGu || ''})`
    : `Flat ${wing}-${flatNo}`;

  // Fetch visitors list
  const fetchVisitors = async () => {
    try {
      const data = await api.getVisitors();
      if (Array.isArray(data)) {
        // Detect if any previously pending visitor got approved or rejected recently
        setVisitors((prev) => {
          // Check if any visitor that was pending is now approved/rejected
          data.forEach((newVis: Visitor) => {
            const oldVis = prev.find((v) => v.id === newVis.id);
            if (oldVis && oldVis.status === 'pending' && newVis.status !== 'pending') {
              // Trigger visual alert
              setShowStatusAlert(newVis);
              // Play success/warning chime!
              playDecisionSound(newVis.status);
            }
          });
          return newVisitsData(data);
        });
      }
    } catch (error) {
      console.error('Failed to fetch visitors:', error);
    }
  };

  // Keep a stable version of visitor mapper helper
  const newVisitsData = (data: Visitor[]): Visitor[] => data;

  // Subscribe to real-time status updates from Firestore
  useEffect(() => {
    const unsubscribe = api.subscribeAllVisitors(
      (data) => {
        setVisitors((prev) => {
          // Detect if any previously pending visitor got approved or rejected recently
          data.forEach((newVis: Visitor) => {
            const oldVis = prev.find((v) => v.id === newVis.id);
            if (oldVis && oldVis.status === 'pending' && newVis.status !== 'pending') {
              // Trigger visual alert
              setShowStatusAlert(newVis);
              // Play success/warning chime!
              playDecisionSound(newVis.status);
            }
          });
          return data;
        });
      },
      (error) => {
        console.error('Real-time visitors subscription failed:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Check for auto-expiration of pending visitors periodically (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const limitMs = expiryMinutes * 60 * 1000;
      
      visitors.forEach(async (v) => {
        if (v.status === 'pending') {
          const reqTime = new Date(v.requestTime).getTime();
          if (now - reqTime > limitMs) {
            console.log(`System: Visitor request for ${v.fullName} (id: ${v.id}) expired after ${expiryMinutes} minutes.`);
            await api.respondToVisitor(v.id, 'expired', 'System Auto-Expiry');
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [visitors, expiryMinutes]);

  // Handle deleting a visitor request/log
  const handleDeleteVisitor = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the visitor record for "${name}"?`)) {
      return;
    }
    try {
      const res = await api.deleteVisitor(id);
      if (res.success) {
        fetchVisitors();
      } else {
        alert(res.message || 'Failed to delete visitor record.');
      }
    } catch (error) {
      console.error('Failed to delete visitor:', error);
      alert('Error deleting visitor. Please try again.');
    }
  };

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !mobileNumber.trim() || !reason.trim()) {
      setFormError('Please fill out all mandatory fields.');
      return;
    }

    if (!photoUrl) {
      setFormError('Visitor photo is mandatory. Please capture a webcam snap or select a preset avatar.');
      return;
    }

    setSubmitting(true);

    try {
      const visitor = await api.createVisitor({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        wing,
        flatNo,
        reason: reason.trim(),
        guestType,
        photoUrl,
        flatOwnerName,
        visitorCount
      });

      if (visitor) {
        // Reset form
        setFullName('');
        setMobileNumber('');
        setEmail('');
        setReason('');
        setPhotoUrl(''); // will reset capture preview
        setVisitorCount(1);
        fetchVisitors();
        
        // Scroll to active tracking list
        const trackerSection = document.getElementById('active-tracker');
        if (trackerSection) {
          trackerSection.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        setFormError('Failed to submit visitor request.');
      }
    } catch (error: any) {
      console.error('Submit visitor error:', error);
      setFormError(error.message || 'Server connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Extract pending and past visitors
  const pendingVisitors = visitors.filter((v) => v.status === 'pending');
  const resolvedVisitors = visitors.filter((v) => v.status !== 'pending');

  // Filter logs by search query
  const filteredLogs = resolvedVisitors.filter((v) => {
    const q = logsSearch.toLowerCase().trim();
    if (q === '') return true;
    return (
      v.fullName.toLowerCase().includes(q) ||
      v.mobileNumber.includes(q) ||
      `${v.wing}-${v.flatNo}`.toLowerCase().includes(q) ||
      v.reason.toLowerCase().includes(q) ||
      v.guestType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      
      {/* Top Controls: Manual Refresh & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm gap-4">
        <div className="text-left">
          <h1 className="font-display font-bold text-xl text-slate-800 tracking-tight flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
            <span>Gate Security Control Panel</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time gatekeeper monitoring and resident approvals.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
          {/* Configurable Auto-Expiry Window */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-left">
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <div>
              <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Auto-Expiry Window</label>
              <select
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(parseInt(e.target.value, 10))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none p-0 cursor-pointer"
              >
                <option value={1}>1 Min (Test)</option>
                <option value={5}>5 Min</option>
                <option value={10}>10 Min</option>
                <option value={15}>15 Min (Default)</option>
                <option value={30}>30 Min</option>
                <option value={45}>45 Min</option>
                <option value={60}>1 Hour</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 disabled:opacity-60 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Manual Refresh'}</span>
          </button>
        </div>
      </div>
      
      {/* Visual Resolution Modal/Alert Banner (Big Confirmation Overlay) */}
      {showStatusAlert && (
        <div className={`fixed inset-x-0 top-16 z-50 p-4 border-b animate-bounce ${
          showStatusAlert.status === 'approved' 
            ? 'bg-emerald-500 border-emerald-600 text-white' 
            : 'bg-red-500 border-red-600 text-white'
        } shadow-lg flex items-center justify-between`}>
          <div className="max-w-4xl mx-auto flex items-center space-x-4 w-full">
            <div className="bg-white p-2.5 rounded-full text-slate-900 shrink-0 shadow-md text-xl">
              {showStatusAlert.status === 'approved' ? '✅' : '❌'}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Resident Response Alert</p>
              <h4 className="text-base font-bold font-display">
                Flat {showStatusAlert.wing}-{showStatusAlert.flatNo} ({showStatusAlert.flatOwnerName.split(' ')[0]}) has{' '}
                <span className="underline uppercase">{showStatusAlert.status}</span> entry for{' '}
                <span className="font-semibold">{showStatusAlert.fullName}</span>!
              </h4>
            </div>
            <button
              onClick={() => setShowStatusAlert(null)}
              className="bg-white/20 hover:bg-white/35 border border-white/20 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
            >
              Acknowledge & Open Gate
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form + Active tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Hand: New Visitor Registration Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
          <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-800">New Gate Entry</h2>
              <p className="text-xs text-slate-500">Register visitor details to request approval from flat owner.</p>
            </div>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl text-xs flex items-start space-x-2 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterVisitor} className="space-y-6">
            
            {/* Webcam / Image upload Section */}
            <WebcamCapture
              onPhotoCaptured={(base64) => setPhotoUrl(base64)}
              value={photoUrl}
              guestType={guestType}
            />

            {/* Core details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Visitor Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Full name of guest"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Mobile Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Destination */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Wing <span className="text-red-500">*</span></label>
                <select
                  value={wing}
                  onChange={(e) => setWing(e.target.value as 'A' | 'B')}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                >
                  <option value="A">Wing A</option>
                  <option value="B">Wing B</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Flat No <span className="text-red-500">*</span></label>
                <select
                  value={flatNo}
                  onChange={(e) => setFlatNo(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                >
                  {flats.map((flat) => (
                    <option key={flat} value={flat}>{flat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Guest Type <span className="text-red-500">*</span></label>
                <select
                  value={guestType}
                  onChange={(e) => setGuestType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                >
                  <option value="Delivery">Delivery / Courier</option>
                  <option value="Guest">Guest / Friend</option>
                  <option value="Electrician">Electrician / Repair</option>
                  <option value="Milkman">Milkman / Newspaper</option>
                  <option value="Maid">Maid / Laundry</option>
                  <option value="Cabinet">Service Agent</option>
                  <option value="Other">Other Visitor</option>
                </select>
              </div>
            </div>

            {/* Display looked-up Owner Name */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Target Flat Owner</p>
                <p className="text-sm font-bold text-slate-800">{flatOwnerName}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                currentOwner && !currentOwner.nameEn.toLowerCase().includes('vacant')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {currentOwner && !currentOwner.nameEn.toLowerCase().includes('vacant') ? 'Owner Active' : 'No Owner'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Reason to Visit <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parcel delivery, family"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input
                  type="email"
                  placeholder="visitor@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Number of Visitors <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  required
                  value={visitorCount}
                  onChange={(e) => setVisitorCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {submitting ? (
                <span className="inline-block border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Send Entry Approval Request</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Hand: Active Pending Gate Approvals (5 Cols) */}
        <div id="active-tracker" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-base text-slate-800">Pending Approvals</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live awaiting responses from residents.</p>
            </div>
            <span className="font-mono bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              <span>{pendingVisitors.length} waiting</span>
            </span>
          </div>

          {pendingVisitors.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-100 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No Pending Visitors</p>
              <p className="text-xs text-slate-400 mt-1">All registered visitors have been resolved or are cleared.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {pendingVisitors.map((v) => (
                <div
                  key={v.id}
                  className="bg-amber-50/45 border-l-4 border-amber-500 border border-slate-200/80 p-4 rounded-xl space-y-3 relative overflow-hidden"
                >
                  {/* Cancel/delete request button top right */}
                  <button
                    onClick={() => handleDeleteVisitor(v.id, v.fullName)}
                    title="Cancel visitor request"
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-3 pr-6">
                    <img src={v.photoUrl} alt={v.fullName} className="w-12 h-12 rounded-lg object-cover bg-slate-200 shrink-0 border" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate">{v.fullName}</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded uppercase font-mono">
                          {v.guestType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate">Flat {v.wing}-{v.flatNo} • {v.flatOwnerName.split(' ')[0]}</p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-white border border-slate-200/40 p-2 rounded-lg space-y-1">
                    <p className="font-medium"><span className="text-slate-400">Reason:</span> {v.reason}</p>
                    <p className="text-[10px] text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Awaiting since {new Date(v.requestTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Pulsing indicator */}
                  <div className="flex items-center space-x-1.5 text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100 py-1 px-2.5 rounded-md w-max animate-pulse">
                    <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    <span>Waiting for Resident response...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Archive / Log Registry (Bento Panel at bottom) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-100 p-2.5 rounded-xl text-slate-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-800">Gate Visitor Log</h3>
              <p className="text-xs text-slate-400">Archived list of all cleared and rejected visitors.</p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Search visitor log..."
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg py-1.5 pl-8 pr-3 text-xs font-medium transition outline-none"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileSpreadsheet className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No Logs Available</p>
            <p className="text-xs text-slate-400 mt-1">Visitors that are approved or rejected will show up here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Visitor</th>
                  <th className="py-3 px-4">Flat Target</th>
                  <th className="py-3 px-4">Reason / Guest Type</th>
                  <th className="py-3 px-4 text-center font-bold">Timing</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 flex items-center space-x-3">
                      <img src={log.photoUrl} alt={log.fullName} className="w-9 h-9 rounded-md object-cover border bg-slate-100 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 text-xs uppercase">{log.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{log.mobileNumber}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block text-[11px]">
                        {log.wing}-{log.flatNo}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[150px]">{log.flatOwnerName.split(' ')[0]}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 text-xs">{log.reason}</p>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.5 rounded uppercase mt-1 inline-block">
                        {log.guestType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[10px] text-center">
                      <p>In: {new Date(log.requestTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(log.requestTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                      {log.respondedTime && (
                        <p className="mt-0.5 text-slate-500">Responded: {new Date(log.respondedTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1.5 justify-center">
                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          log.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.status === 'expired'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span>{log.status === 'approved' ? '● Approved' : log.status === 'expired' ? '● Expired' : '● Rejected'}</span>
                        </span>
                        {log.status === 'expired' && (
                          <button
                            type="button"
                            onClick={() => {
                              setFullName(log.fullName);
                              setMobileNumber(log.mobileNumber);
                              setEmail(log.email || '');
                              setWing(log.wing);
                              setFlatNo(log.flatNo);
                              setReason(log.reason);
                              setGuestType(log.guestType);
                              setPhotoUrl(log.photoUrl);
                              setVisitorCount(log.visitorCount || 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-100 transition flex items-center space-x-1 cursor-pointer"
                            title="Prefill fields to re-submit request"
                          >
                            <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                            <span>Re-Submit</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
