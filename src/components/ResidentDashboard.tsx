/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, Check, X, Users, Car, Phone, Lock, Eye, EyeOff, ClipboardList, AlertCircle, Trash2, Plus, Clock, RefreshCw, Megaphone, FileText, Download, Search, Wrench, CheckCircle } from 'lucide-react';
import { FlatOwner, Visitor, Vehicle, UserSession, Announcement } from '../types';
import { api, detectServerEnvironment } from '../lib/api';

let alarmIntervalId: any = null;
let alarmAudioContext: AudioContext | null = null;
let alarmStateListener: ((active: boolean) => void) | null = null;

const playHighFrequencyAlarm = () => {
  if (alarmIntervalId) return; // already playing
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    alarmAudioContext = ctx;

    let toggle = true;
    alarmIntervalId = setInterval(() => {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Emergency high frequency (alternates between 2800Hz and 3200Hz to grab attention instantly)
      osc.frequency.setValueAtTime(toggle ? 3200 : 2800, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      toggle = !toggle;
    }, 500);

    if (alarmStateListener) {
      alarmStateListener(true);
    }

    // Auto-stop after 25 seconds
    setTimeout(() => {
      stopHighFrequencyAlarm();
    }, 25000);
  } catch (err) {
    console.warn('Could not play high frequency alarm sound:', err);
  }
};

const stopHighFrequencyAlarm = () => {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  if (alarmAudioContext) {
    try {
      alarmAudioContext.close();
    } catch (e) {}
    alarmAudioContext = null;
  }
  if (alarmStateListener) {
    alarmStateListener(false);
  }
};

const triggerNewVisitorNotification = (visitor: Visitor) => {
  playHighFrequencyAlarm();
  
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const title = `🚪 New Visitor: ${visitor.fullName}`;
        const countText = visitor.visitorCount && visitor.visitorCount > 1 ? ` (${visitor.visitorCount} Visitors)` : '';
        const bodyText = `Type: ${visitor.guestType}${countText}\nWing-Flat: ${visitor.wing}-${visitor.flatNo}\nReason: ${visitor.reason}${visitor.email ? `\nEmail: ${visitor.email}` : ''}`;
        
        new Notification(title, {
          body: bodyText,
          icon: visitor.photoUrl || '/icon.png',
          tag: visitor.id,
          requireInteraction: true,
          actions: [
            { action: 'approve', title: '✅ Approve' },
            { action: 'reject', title: '❌ Reject' }
          ]
        } as any);
      } catch (err) {
        console.warn('Failed to construct desktop Notification:', err);
      }
    }
  }
};

interface ResidentDashboardProps {
  session: UserSession;
  owners: FlatOwner[];
  onRefreshOwners: () => void;
}

export default function ResidentDashboard({ session, owners, onRefreshOwners }: ResidentDashboardProps) {
  const { wing, flatNo } = session;

  // Active visitor request state
  const [activePoll, setActivePoll] = useState<Visitor[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);

  useEffect(() => {
    alarmStateListener = (active) => {
      setIsAlarmActive(active);
    };
    return () => {
      alarmStateListener = null;
    };
  }, []);

  // Stop alarm if no more active pending visitors are present
  useEffect(() => {
    if (activePoll.length === 0) {
      stopHighFrequencyAlarm();
    }
  }, [activePoll]);

  // Track which visitors have already triggered audio/desktop notifications
  const notifiedVisitorIds = React.useRef<Set<string>>(new Set());

  // Find current owner data
  const myOwnerData = owners.find((o) => o.wing === wing && o.flatNo === flatNo);

  // Household Members State
  const [newMember, setNewMember] = useState<string>('');
  
  // Vehicle State
  const [vType, setVType] = useState<'twowheeler' | 'fourwheeler'>('fourwheeler');
  const [vPlate, setVPlate] = useState<string>('');
  const [vModel, setVModel] = useState<string>('');

  // General settings
  const [altContact, setAltContact] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string>('');
  const [settingsError, setSettingsError] = useState<string>('');

  // History Log State
  const [guestHistory, setGuestHistory] = useState<Visitor[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Subscribe to targeted real-time announcements
  useEffect(() => {
    if (!wing || !flatNo) return;
    const unsubscribe = api.subscribeAnnouncements(wing, flatNo, (list) => {
      setAnnouncements(list);
    });
    return () => unsubscribe();
  }, [wing, flatNo]);

  // Rejection State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState<string>('');

  // Sub-tabs state inside Resident Portal
  const [residentTab, setResidentTab] = useState<'home' | 'notices' | 'complaints' | 'financials' | 'contacts'>('home');

  // Complaints state
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState<boolean>(false);
  const [compTitle, setCompTitle] = useState<string>('');
  const [compDesc, setCompDesc] = useState<string>('');
  const [compMedia, setCompMedia] = useState<string>('');
  const [compSuccess, setCompSuccess] = useState<string>('');
  const [compError, setCompError] = useState<string>('');

  // Financial Reports state
  const [financials, setFinancials] = useState<any[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState<boolean>(false);

  // Essential Contacts state
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [contactCategoryFilter, setContactCategoryFilter] = useState<string>('all');

  // Fetch helper methods
  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const list = await api.getComplaints();
      setComplaints(list);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const fetchFinancials = async () => {
    setLoadingFinancials(true);
    try {
      const list = await api.getFinancialReports();
      setFinancials(list);
    } catch (err) {
      console.error('Failed to fetch financials:', err);
    } finally {
      setLoadingFinancials(false);
    }
  };

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const list = await api.getEssentialContacts();
      setContacts(list);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Trigger loads when tab changes
  useEffect(() => {
    if (residentTab === 'complaints') {
      fetchComplaints();
    } else if (residentTab === 'financials') {
      fetchFinancials();
    } else if (residentTab === 'contacts') {
      fetchContacts();
    }
  }, [residentTab]);

  // Raise a new complaint
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTitle.trim() || !compDesc.trim()) return;
    setCompSuccess('');
    setCompError('');
    try {
      const flatId = `${wing}-${flatNo}`;
      await api.createComplaint({
        flatId,
        title: compTitle.trim(),
        description: compDesc.trim(),
        mediaUrl: compMedia.trim()
      });
      setCompSuccess('Your complaint has been successfully registered on the board! The Secretary has been notified.');
      setCompTitle('');
      setCompDesc('');
      setCompMedia('');
      fetchComplaints();
    } catch (err: any) {
      setCompError(err.message || 'Failed to submit complaint.');
    }
  };

  // Manual sync/refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await detectServerEnvironment();
      onRefreshOwners();
      await checkVisitorAlerts();
      await fetchMyGuestHistory();
      if (residentTab === 'complaints') await fetchComplaints();
      if (residentTab === 'financials') await fetchFinancials();
      if (residentTab === 'contacts') await fetchContacts();
    } catch (error) {
      console.error('Failed to perform manual sync:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Request desktop notification permission on dashboard load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch((err) => console.warn('Notification permission rejected:', err));
    }
  }, []);

  // Initialize form states from loaded database
  useEffect(() => {
    if (myOwnerData) {
      setAltContact(myOwnerData.secondaryContact || '');
    }
  }, [myOwnerData]);

  // Fetch pending visitor alerts for this specific flat
  const checkVisitorAlerts = async () => {
    if (!wing || !flatNo) return;
    try {
      const data = await api.pollVisitorAlerts(wing, flatNo);
      
      // Look for brand new pending visitors to trigger alerts
      data.forEach((v) => {
        if (!notifiedVisitorIds.current.has(v.id)) {
          notifiedVisitorIds.current.add(v.id);
          triggerNewVisitorNotification(v);
        }
      });

      setActivePoll(data);
    } catch (error) {
      console.error('Failed to poll visitor alerts:', error);
    }
  };

  // Fetch personal guest history logs
  const fetchMyGuestHistory = async () => {
    if (!wing || !flatNo) return;
    setLoadingHistory(true);
    try {
      const data = await api.getVisitors({ wing, flatNo });
      setGuestHistory(data);
    } catch (error) {
      console.error('Failed to fetch personal history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Subscribe to real-time notifications and fetch initial history on load
  useEffect(() => {
    if (!wing || !flatNo) return;

    // Fetch initial guest history
    fetchMyGuestHistory();

    // Set up real-time listener on the 'notifications' collection
    const unsubscribe = api.subscribeNotifications(
      wing,
      flatNo,
      (pendingNotifications) => {
        // Look for brand new pending visitors to trigger alerts
        pendingNotifications.forEach((v) => {
          if (!notifiedVisitorIds.current.has(v.id)) {
            notifiedVisitorIds.current.add(v.id);
            triggerNewVisitorNotification(v);
          }
        });

        setActivePoll(pendingNotifications);
      },
      (error) => {
        console.error('Real-time notifications subscription failed, falling back to polling:', error);
        // Fallback to manual polling ifSnapshot fails
        checkVisitorAlerts();
      }
    );

    // Maintain a slower polling interval (5 seconds) to update historical logs automatically
    const historyInterval = setInterval(() => {
      fetchMyGuestHistory();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(historyInterval);
    };
  }, [wing, flatNo]);

  // Check for auto-expiration on the resident dashboard for safety (redundancy)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiryMs = 15 * 60 * 1000; // 15 mins default
      activePoll.forEach(async (v) => {
        if (v.status === 'pending') {
          const reqTime = new Date(v.requestTime).getTime();
          if (now - reqTime > expiryMs) {
            console.log(`Resident Dashboard: Auto-expiring visitor ${v.fullName}`);
            await api.respondToVisitor(v.id, 'expired', 'System Auto-Expiry');
          }
        }
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [activePoll]);

  // Respond to waiting visitor (Accept / Reject)
  const handleRespond = async (visitorId: string, status: 'approved' | 'rejected', customReason?: string) => {
    stopHighFrequencyAlarm();
    try {
      const responderName = session.ownerName || `Owner of Flat ${wing}-${flatNo}`;
      const res = await api.respondToVisitor(visitorId, status, responderName, customReason || '');
      if (res.success) {
        // Optimistic state clear
        setActivePoll((prev) => prev.filter((v) => v.id !== visitorId));
        setRejectingId(null);
        setRejectReasonText('');
        fetchMyGuestHistory();
      }
    } catch (error) {
      console.error('Failed to respond to visitor:', error);
    }
  };

  // Delete historical visitor record
  const handleDeleteHistoryRecord = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the visitor log for "${name}" from your history?`)) {
      return;
    }
    try {
      const res = await api.deleteVisitor(id);
      if (res.success) {
        fetchMyGuestHistory();
      } else {
        alert(res.message || 'Failed to delete record.');
      }
    } catch (error) {
      console.error('Failed to delete history:', error);
      alert('Error deleting log. Please try again.');
    }
  };

  // Save changes to backend
  const updateOwnerProfile = async (updatedData: Partial<FlatOwner>, successMsg: string) => {
    if (!wing || !flatNo || !myOwnerData) return;
    setSettingsError('');
    setSettingsSuccess('');
    setSavingSettings(true);

    try {
      const payload = {
        secondaryContact: updatedData.secondaryContact !== undefined ? updatedData.secondaryContact : myOwnerData.secondaryContact,
        members: updatedData.members !== undefined ? updatedData.members : myOwnerData.members,
        vehicles: updatedData.vehicles !== undefined ? updatedData.vehicles : myOwnerData.vehicles,
        password: updatedData.phone !== undefined ? undefined : newPassword || undefined // send password if set
      };

      const res = await api.updateOwner(wing, flatNo, payload);

      if (res.success) {
        setSettingsSuccess(successMsg);
        if (newPassword) setNewPassword(''); // clear password input
        onRefreshOwners(); // trigger reload in App.tsx
      } else {
        setSettingsError(res.message || 'Failed to update profile.');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      setSettingsError(error.message || 'Server connection error.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add family member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.trim() || !myOwnerData) return;

    if (myOwnerData.members.length >= 2) {
      setSettingsError('You can register a maximum of 2 family members per flat.');
      return;
    }

    const updatedMembers = [...myOwnerData.members, newMember.trim()];
    updateOwnerProfile({ members: updatedMembers }, `Added ${newMember.trim()} to household.`);
    setNewMember('');
  };

  // Remove family member
  const handleRemoveMember = (idx: number) => {
    if (!myOwnerData) return;
    const updatedMembers = [...myOwnerData.members];
    const removed = updatedMembers.splice(idx, 1)[0];
    updateOwnerProfile({ members: updatedMembers }, `Removed ${removed} from household.`);
  };

  // Add vehicle
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPlate.trim() || !vModel.trim() || !myOwnerData) return;

    const newV: Vehicle = {
      id: 'vh_' + Math.random().toString(36).substr(2, 9),
      type: vType,
      plateNumber: vPlate.toUpperCase().trim(),
      brandModel: vModel.trim()
    };

    const updatedVehicles = [...myOwnerData.vehicles, newV];
    updateOwnerProfile({ vehicles: updatedVehicles }, `Registered vehicle ${vPlate.toUpperCase()}.`);
    setVPlate('');
    setVModel('');
  };

  // Remove vehicle
  const handleRemoveVehicle = (vehicleId: string) => {
    if (!myOwnerData) return;
    const updatedVehicles = myOwnerData.vehicles.filter((v) => v.id !== vehicleId);
    updateOwnerProfile({ vehicles: updatedVehicles }, 'Vehicle unregistered successfully.');
  };

  // Save generic settings (alt contact & password)
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myOwnerData) return;
    updateOwnerProfile({ secondaryContact: altContact }, 'Contact details & password updated successfully.');
  };

  return (
    <div className="space-y-8 text-slate-800">
      
      {isAlarmActive && (
        <div className="bg-red-600 border border-red-700 text-white font-bold p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse shadow-lg">
          <div className="flex items-center space-x-3 text-left">
            <span className="w-3 h-3 bg-white rounded-full animate-ping shrink-0"></span>
            <div>
              <p className="text-sm font-black tracking-tight flex items-center gap-1.5">
                <span>🚨 VISITOR ALARM RINGING!</span>
              </p>
              <p className="text-[10px] text-red-100 font-medium">A high frequency emergency alert is playing to grab your attention.</p>
            </div>
          </div>
          <button
            onClick={() => stopHighFrequencyAlarm()}
            className="w-full sm:w-auto bg-white text-red-600 hover:bg-red-50 text-xs font-extrabold uppercase px-5 py-2.5 rounded-xl shadow-md transition-all duration-150 transform hover:scale-[1.02] cursor-pointer"
          >
            Silence Alarm
          </button>
        </div>
      )}

      {/* Top Header Controls: Manual Refresh & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm gap-4">
        <div className="text-left">
          <h1 className="font-display font-bold text-xl text-slate-800 tracking-tight flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
            <span>Resident Dashboard • Flat {wing}-{flatNo}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Logged in as {myOwnerData ? myOwnerData.nameEn : `Flat ${wing}-${flatNo}`}</p>
        </div>
        <div>
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

      {/* Portal Tab Bar Navigation */}
      <div className="flex overflow-x-auto gap-2 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm scrollbar-none shrink-0">
        <button
          onClick={() => setResidentTab('home')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${residentTab === 'home' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Bell className="w-4 h-4" />
          <span>My Flat & History</span>
        </button>
        <button
          onClick={() => setResidentTab('notices')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${residentTab === 'notices' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Society Notices</span>
        </button>
        <button
          onClick={() => setResidentTab('complaints')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${residentTab === 'complaints' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Resolution Board</span>
        </button>
        <button
          onClick={() => setResidentTab('financials')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${residentTab === 'financials' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Financial Ledger</span>
        </button>
        <button
          onClick={() => setResidentTab('contacts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${residentTab === 'contacts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Phone className="w-4 h-4" />
          <span>Address Book</span>
        </button>
      </div>

      {/* Tab 1: Home View (Visitor Approvals, History log, bento profile configs) */}
      {residentTab === 'home' && (
        <div className="space-y-8">
          {/* URGENT PENDING APPROVAL ALERTS */}
          {activePoll.length > 0 && (
            <div className="bg-gradient-to-r from-red-500 to-amber-600 rounded-3xl p-6 text-white shadow-2xl border-2 border-amber-400 relative overflow-hidden animate-pulse">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Bell className="w-40 h-40" />
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-amber-300 animate-bounce" />
                <span className="font-display font-bold text-xs uppercase tracking-widest text-amber-200">
                  Visitor Waiting At Gate! (ઓર્કીડ સેક્યુરીટી ગેટ)
                </span>
              </div>

              {activePoll.map((visitor) => (
                <div
                  key={visitor.id}
                  className="bg-slate-900/90 border border-white/20 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-6 text-left"
                >
                  <div className="w-32 h-32 bg-slate-800 rounded-xl overflow-hidden border-2 border-white/40 shadow-inner shrink-0">
                    <img src={visitor.photoUrl} alt={visitor.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div>
                      <span className="font-mono bg-amber-500/35 border border-amber-400/30 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {visitor.guestType}
                      </span>
                      <h3 className="font-display font-black text-xl text-white tracking-tight mt-1.5 uppercase truncate">
                        {visitor.fullName}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300 font-medium">
                      <p><span className="text-slate-400">Phone:</span> {visitor.mobileNumber}</p>
                      {visitor.email && <p><span className="text-slate-400">Email:</span> {visitor.email}</p>}
                      <p className="col-span-1 sm:col-span-2"><span className="text-slate-400">Purpose:</span> {visitor.reason}</p>
                    </div>

                    <p className="text-[10px] text-slate-400 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Awaiting your approval since {new Date(visitor.requestTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-56 shrink-0 justify-center bg-slate-900/40 p-4 rounded-xl border border-white/5">
                    {rejectingId === visitor.id ? (
                      <div className="space-y-2 text-left w-full">
                        <p className="text-[10px] text-red-300 font-bold uppercase tracking-wider">Provide rejection reason:</p>
                        <input
                          type="text"
                          placeholder="e.g. Unknown person, wrong flat"
                          value={rejectReasonText}
                          onChange={(e) => setRejectReasonText(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 focus:border-red-400 text-white placeholder-slate-500 rounded-lg py-1.5 px-2.5 text-xs outline-none transition"
                        />
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => handleRespond(visitor.id, 'rejected', rejectReasonText)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-1 rounded-lg text-[10px] flex items-center justify-center space-x-1 shadow transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReasonText('');
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-2.5 rounded-lg text-[10px] transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRespond(visitor.id, 'approved')}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve Entry</span>
                        </button>
                        <button
                          onClick={() => setRejectingId(visitor.id)}
                          className="w-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject / Decline</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GUEST HISTORY & REPORTS LOG */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
            <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 pb-3 justify-between">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-base text-slate-800">Guest History & Reports</h3>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                {guestHistory.length} total entries
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Report log of all visitor attempts to your flat, with dates, times, visitor images, and whether entry was approved or declined.
            </p>

            {loadingHistory && guestHistory.length === 0 ? (
              <div className="py-12 flex items-center justify-center">
                <span className="inline-block border-2 border-indigo-600 border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
              </div>
            ) : guestHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-12 border-2 border-dashed border-slate-100 rounded-xl">
                <ClipboardList className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Visitor Logs Available</p>
                <p className="text-[10px] text-slate-400 mt-1">Logs populate as soon as visitors register at the security gate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-1">
                {guestHistory.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 hover:border-slate-300 transition relative overflow-hidden flex flex-col justify-between"
                  >
                    <button
                      onClick={() => handleDeleteHistoryRecord(log.id, log.fullName)}
                      title="Delete visitor log"
                      className="absolute top-3 right-3 text-slate-400 hover:text-red-500 hover:bg-slate-200/50 p-1 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 pr-6 text-left">
                        <img src={log.photoUrl} alt={log.fullName} className="w-11 h-11 rounded-lg object-cover border bg-slate-200 shrink-0" referrerPolicy="no-referrer" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 truncate uppercase">{log.fullName}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{log.mobileNumber} • {log.guestType}</p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 bg-white border border-slate-200/40 p-2 rounded-lg leading-relaxed text-left">
                        <p className="font-medium"><span className="text-slate-400 font-normal">Reason:</span> {log.reason}</p>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
                      <p className="flex items-center text-left">
                        <Clock className="w-3.5 h-3.5 mr-1 shrink-0" />
                        {new Date(log.requestTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(log.requestTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                        log.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : log.status === 'expired'
                          ? 'bg-slate-50 text-slate-500 border border-slate-200'
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BENTO SETTINGS & PROFILE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              
              {/* Household family members config */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
                <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 pb-3">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-display font-bold text-base text-slate-800">Household Members</h3>
                </div>

                {settingsError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-start space-x-1.5 mb-3">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{settingsError}</span>
                  </div>
                )}

                {settingsSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs flex items-start space-x-1.5 mb-3">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{settingsSuccess}</span>
                  </div>
                )}

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Add up to <span className="font-bold text-indigo-600">2 family members</span> who are part of your flat. 
                  These members are authorized to access the system and receive notifications.
                </p>

                <div className="space-y-2.5 mb-5">
                  {myOwnerData?.members && myOwnerData.members.length > 0 ? (
                    myOwnerData.members.map((member, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="bg-indigo-100 text-indigo-700 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-bold text-slate-800 uppercase">{member}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(idx)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-md transition cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">
                      No other household members added yet. Add up to 2.
                    </div>
                  )}
                </div>

                {(!myOwnerData?.members || myOwnerData.members.length < 2) && (
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Enter family member's full name"
                      value={newMember}
                      onChange={(e) => setNewMember(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-medium transition outline-none"
                    />
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow transition shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Vehicle management config */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
                <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 pb-3">
                  <Car className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-display font-bold text-base text-slate-800">My Vehicles</h3>
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Register your vehicles (two-wheelers or four-wheelers) so our security gate guards can instantly identify you and allow seamless entries.
                </p>

                <div className="space-y-2.5 mb-5">
                  {myOwnerData?.vehicles && myOwnerData.vehicles.length > 0 ? (
                    myOwnerData.vehicles.map((v) => (
                      <div key={v.id} className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl bg-white border p-1 rounded-lg shrink-0">
                            {v.type === 'fourwheeler' ? '🚗' : '🏍️'}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-800 capitalize leading-none">{v.brandModel}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">{v.type === 'fourwheeler' ? 'Car' : 'Bike / Scooter'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded text-[10px] uppercase">
                            {v.plateNumber}
                          </span>
                          <button
                            onClick={() => handleRemoveVehicle(v.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-md transition cursor-pointer"
                            title="Unregister vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">
                      No vehicles registered for your flat yet.
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddVehicle} className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Register New Vehicle</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Vehicle Type</label>
                      <select
                        value={vType}
                        onChange={(e) => setVType(e.target.value as 'twowheeler' | 'fourwheeler')}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none"
                      >
                        <option value="fourwheeler">Four Wheeler (Car)</option>
                        <option value="twowheeler">Two Wheeler (Bike)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Plate Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GJ-03-AB-1234"
                        value={vPlate}
                        onChange={(e) => setVPlate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Brand & Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Honda Activa, Maruti Swift"
                      value={vModel}
                      onChange={(e) => setVModel(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs shadow transition cursor-pointer"
                  >
                    Register Vehicle
                  </button>
                </form>
              </div>
            </div>

            {/* Right column: Alternate contact & Password config */}
            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={handleSaveGeneral} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left space-y-4">
                <div className="flex items-center space-x-2.5 mb-2 border-b border-slate-100 pb-3">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-display font-bold text-base text-slate-800">Security & Alternate Contact</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alternate Contact No.</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        placeholder="Secondary phone"
                        value={altContact}
                        onChange={(e) => setAltContact(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-medium transition outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Update Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 pl-3.5 pr-9 text-xs font-medium transition outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow"
                >
                  Save Details & Password
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Society Announcements Notice Board */}
      {residentTab === 'notices' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <Megaphone className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h3 className="font-display font-bold text-base text-slate-800">Society Notice Board</h3>
            </div>
            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {announcements.length} Active Notice(s)
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-150 rounded-xl">
              <Megaphone className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-xs font-semibold text-slate-500 font-display">All Quiet Here</p>
              <p className="text-[10px] text-slate-400 mt-1">There are no active general announcements published at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-5 border rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition border-slate-200 text-left space-y-4 relative overflow-hidden shadow-sm"
                >
                  <span className="absolute top-4 right-4 text-[9px] font-bold bg-white text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full uppercase font-mono">
                    Target: {ann.target} {ann.target === 'wing' ? `(${ann.wing})` : ann.target === 'flat' ? `(${ann.wing}-${ann.flatNo})` : ''}
                  </span>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 font-mono tracking-wider">ANNOUNCEMENT</p>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                      {ann.text}
                    </p>
                  </div>

                  {ann.imageUrl && (
                    <div className="rounded-xl overflow-hidden max-h-[300px] border border-slate-200 shadow-sm">
                      <img
                        src={ann.imageUrl}
                        alt="Notice media"
                        className="w-full h-full object-cover bg-slate-100"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {ann.videoUrl && (
                    <div className="rounded-xl overflow-hidden max-h-[350px] border border-slate-200 bg-slate-900 shadow-sm">
                      <video
                        src={ann.videoUrl}
                        controls
                        className="w-full max-h-[350px] object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/50 pt-3 font-mono">
                    <span>Published By: <strong className="text-slate-600 font-semibold">{ann.sender}</strong></span>
                    <span>
                      {new Date(ann.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(ann.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Complaints & Resolution Board */}
      {residentTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
            <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 pb-3 text-indigo-600">
              <Wrench className="w-5 h-5" />
              <h3 className="font-display font-bold text-base text-slate-800">Raise a Complaint</h3>
            </div>

            {compError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs mb-3">
                {compError}
              </div>
            )}

            {compSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs mb-3">
                {compSuccess}
              </div>
            )}

            <form onSubmit={handleCreateComplaint} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Complaint Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lift A2 fan not working"
                  value={compTitle}
                  onChange={(e) => setCompTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl p-3 text-xs font-medium transition outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the problem in detail (wing, floor, details) so our society technicians can fix it immediately..."
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl p-3 text-xs font-medium transition outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Photo / Video Link (Optional)</label>
                <input
                  type="url"
                  placeholder="e.g. https://images.unsplash.com/... or base64"
                  value={compMedia}
                  onChange={(e) => setCompMedia(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl p-3 text-xs font-medium transition outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
              >
                File Public Complaint
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-base text-slate-800">Complaints Resolution Board</h3>
              </div>
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                {complaints.length} Filed
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              This board is transparently visible to all residents. The Admin/Secretary Rahul Popat updates statuses in real-time as tickets are dispatched.
            </p>

            {loadingComplaints && complaints.length === 0 ? (
              <div className="py-16 flex items-center justify-center">
                <span className="inline-block border-4 border-indigo-600 border-t-transparent rounded-full w-8 h-8 animate-spin"></span>
              </div>
            ) : complaints.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                <CheckCircle className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Zero Pending Complaints!</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Everything at Orchid Heights is running smoothly.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                {complaints.map((comp) => (
                  <div key={comp.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/40 hover:bg-slate-50 transition space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="bg-indigo-100 text-indigo-800 font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                          Flat {comp.flatId}
                        </span>
                        <h4 className="font-bold text-xs text-slate-800 mt-1 uppercase">{comp.title}</h4>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono border ${
                        comp.status === 'open'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : comp.status === 'in-progress'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {comp.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed pr-6">
                      {comp.description}
                    </p>

                    {comp.mediaUrl && (
                      <div className="rounded-xl overflow-hidden max-h-48 border border-slate-200 shadow-inner">
                        <img src={comp.mediaUrl} alt="Complaint Attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}

                    {comp.status === 'resolved' ? (
                      <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-[10px] text-emerald-800 leading-tight space-y-0.5">
                        <p className="font-bold flex items-center">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Resolved successfully
                        </p>
                        <p className="font-medium text-emerald-600">
                          Action taken by: {comp.resolvedBy || 'Secretary'} on {new Date(comp.resolvedAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 font-mono">
                        Filed: {new Date(comp.createdAt).toLocaleDateString('en-IN')} • {new Date(comp.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Financial ledger / Balance sheets */}
      {residentTab === 'financials' && (
        <div className="space-y-6 text-left">
          
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="font-mono bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                Maintenance Account Ledger
              </span>
              <h3 className="font-display font-black text-lg tracking-tight uppercase">Flat {wing}-{flatNo} Status</h3>
              <p className="text-xs text-slate-400">Your maintenance fees are cleared up to date. Next quarterly invoice is generated automatically.</p>
            </div>
            
            <div className="flex gap-4 shrink-0 bg-slate-900/60 p-4 rounded-xl border border-white/5 items-center">
              <div className="text-right">
                <p className="text-[9px] font-mono text-slate-500 uppercase font-bold">Maintenance Status</p>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-wider mt-0.5">Fully Paid (ખેંચાયેલ છે)</p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
                <Check className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-base text-slate-800">Quarterly Balance Sheets & Ledgers</h3>
              </div>
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {financials.length} Published Reports
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Orchid Heights Society operates with absolute financial transparency. View quarterly balance sheets, society ledger entries, and maintenance expenses uploaded by Secretary Rahul Popat.
            </p>

            {loadingFinancials && financials.length === 0 ? (
              <div className="py-16 flex items-center justify-center">
                <span className="inline-block border-4 border-indigo-600 border-t-transparent rounded-full w-8 h-8 animate-spin"></span>
              </div>
            ) : financials.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-150 rounded-xl text-slate-400">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No Financial Ledgers Released</p>
                <p className="text-[10px] text-slate-400 mt-1">The Secretary has not uploaded the quarterly audits yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {financials.map((fin) => (
                  <div key={fin.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/30 hover:bg-slate-50 transition flex flex-col justify-between shadow-sm relative overflow-hidden animate-fadeIn">
                    <span className="absolute top-4 right-4 bg-indigo-100 text-indigo-800 font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      {fin.month} {fin.year}
                    </span>

                    <div className="space-y-2 text-left mb-4">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase font-mono">Ledger Statement</p>
                      <h4 className="font-bold text-xs text-slate-800 uppercase">{fin.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {fin.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-2 bg-slate-50/50 -mx-4 -mb-4 p-4 rounded-b-2xl">
                      <div className="text-left">
                        <p className="text-[8px] font-mono text-slate-400 uppercase font-bold">Total Outlay</p>
                        <p className="text-xs font-black text-slate-700 font-mono mt-0.5">₹{fin.totalExpense.toLocaleString('en-IN')}</p>
                      </div>

                      {fin.pdfUrl ? (
                        <a
                          href={fin.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center space-x-1.5 shadow transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Report</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No document attached</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Essential Emergency Contacts Directory */}
      {residentTab === 'contacts' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <Phone className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h3 className="font-display font-bold text-base text-slate-800">Essential Society Contacts</h3>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['all', 'Plumber', 'Electrician', 'Security', 'Manager', 'Gardener', 'Other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setContactCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold transition cursor-pointer border ${
                    contactCategoryFilter === cat
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'all' ? 'Show All' : cat}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Quickly call electricians, plumbers, gatekeepers, and office administrative managers of Orchid Heights. Tap the dial button to call directly from your device.
          </p>

          {loadingContacts && contacts.length === 0 ? (
            <div className="py-16 flex items-center justify-center">
              <span className="inline-block border-4 border-indigo-600 border-t-transparent rounded-full w-8 h-8 animate-spin"></span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Phone className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-semibold">No contacts registered.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts
                .filter((c) => contactCategoryFilter === 'all' || c.category === contactCategoryFilter)
                .map((contact) => (
                  <div key={contact.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="space-y-1.5 text-left pr-3">
                      <span className="bg-indigo-100 text-indigo-800 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        {contact.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800 uppercase block">{contact.name}</h4>
                      <p className="text-[10px] font-mono font-medium text-slate-400">{contact.phone}</p>
                    </div>

                    <a
                      href={`tel:${contact.phone}`}
                      className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white p-3 rounded-full shadow transition-all duration-150 flex items-center justify-center cursor-pointer shrink-0"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
