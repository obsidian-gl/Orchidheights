/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Clock, Search, AlertCircle, CheckCircle2, XCircle, FileSpreadsheet, User, Phone, Check, Trash2, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { FlatOwner, Visitor, DailyHelper } from '../types';
import WebcamCapture from './WebcamCapture';
import { api, detectServerEnvironment } from '../lib/api';
import { collection, onSnapshot, doc, setDoc, updateDoc, db } from '../lib/firebase';

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

const TRANSLATIONS = {
  EN: {
    panelTitle: "Gate Security Control Panel",
    panelSub: "Real-time gatekeeper monitoring and resident approvals.",
    expiryLabel: "Auto-Expiry Window",
    manualRefresh: "Manual Refresh",
    syncing: "Syncing...",
    newGateEntry: "New Gate Entry",
    newGateEntrySub: "Register visitor details to request approval from flat owner.",
    visitorName: "Visitor Name",
    visitorNamePlace: "Full name of guest",
    mobileNumber: "Mobile Number",
    mobileNumberPlace: "10-digit mobile number",
    wing: "Wing",
    flatNo: "Flat No",
    guestType: "Guest Type",
    reason: "Reason to Visit",
    reasonPlace: "e.g. Parcel delivery, family",
    email: "Email",
    optional: "(Optional)",
    numVisitors: "Number of Visitors",
    targetOwner: "Target Flat Owner",
    ownerActive: "Owner Active",
    noOwner: "No Owner",
    sendRequest: "Send Gate Entry Request",
    sending: "Sending...",
    activeTracker: "Active Approval Tracker",
    activeTrackerSub: "Live status of sent requests. Instruct visitor to wait.",
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending",
    acknowledgeOpen: "Acknowledge & Open Gate",
    delivery: "Delivery / Courier",
    guest: "Guest / Friend",
    electrician: "Electrician / Repair",
    milkman: "Milkman / Newspaper",
    maid: "Maid / Laundry",
    cabinet: "Service Agent",
    other: "Other Visitor"
  },
  GU: {
    panelTitle: "ગેટ સિક્યુરિટી કંટ્રોલ પેનલ",
    panelSub: "રહેવાસીઓની પરવાનગી મેળવવા માટેની લાઈવ સુરક્ષા સિસ્ટમ.",
    expiryLabel: "ઓટો-સમાપ્તિ સમય",
    manualRefresh: "રીફ્રેશ કરો",
    syncing: "લોડ થાય છે...",
    newGateEntry: "નવી ગેટ એન્ટ્રી દાખલ કરો",
    newGateEntrySub: "ફ્લેટ માલિક પાસેથી મંજૂરી મેળવવા માટે મુલાકાતીની વિગતો અહીં લખો.",
    visitorName: "મુલાકાતીનું નામ",
    visitorNamePlace: "મુલાકાતીનું આખું નામ લખો",
    mobileNumber: "મોબાઇલ નંબર",
    mobileNumberPlace: "૧૦-અંકનો મોબાઇલ નંબર લખો",
    wing: "વિંગ",
    flatNo: "FLAT નંબર",
    guestType: "મુલાકાતીનો પ્રકાર",
    reason: "મુલાકાત લેવાનું કારણ",
    reasonPlace: "દા.ત. પાર્સલ ડિલિવરી, સગા-સંબંધી",
    email: "ઇમેઇલ",
    optional: "(વૈકલ્પિક)",
    numVisitors: "મુલાકાતીઓની સંખ્યા",
    targetOwner: "લક્ષ્ય ફ્લેટના માલિક",
    ownerActive: "માલિક હાજર છે",
    noOwner: "કોઈ માલિક નથી",
    sendRequest: "રહેવાસીને પરવાનગી માટે મોકલો",
    sending: "મોકલી રહ્યું છે...",
    activeTracker: "ચાલુ મંજૂરીઓનું લિસ્ટ",
    activeTrackerSub: "મોકલેલી વિનંતીઓની લાઈવ સ્થિતિ. મુલાકાતીને રાહ જોવાનું કહો.",
    approved: "✅ પ્રવેશ મંજૂર છે",
    rejected: "❌ પ્રવેશ અસ્વીકાર છે",
    pending: "⏳ રાહ જુઓ (બાકી છે)",
    acknowledgeOpen: "સમજાઈ ગયું - ગેટ ખોલો",
    delivery: "📦 ડિલિવરી / કુરિયર",
    guest: "👋 મહેમાન / મિત્ર",
    electrician: "⚡ ઇલેક્ટ્રિશિયન / કામકાજ",
    milkman: "🥛 દૂધવાળો / પેપરવાળો",
    maid: "🧹 ઘરઘાટી / કામવાળા",
    cabinet: "🛠️ સર્વિસ એજન્ટ",
    other: "👤 અન્ય મુલાકાતી"
  }
};

interface SecurityDashboardProps {
  owners: FlatOwner[];
  onRefreshOwners: () => void;
}

export default function SecurityDashboard({ owners, onRefreshOwners }: SecurityDashboardProps) {
  const [lang, setLang] = useState<'EN' | 'GU'>(() => {
    return (localStorage.getItem('orchid_sec_lang') as 'EN' | 'GU') || 'GU';
  });

  const t = (key: keyof typeof TRANSLATIONS.EN) => {
    return TRANSLATIONS[lang][key] || TRANSLATIONS.EN[key];
  };

  const toggleLang = () => {
    const next = lang === 'EN' ? 'GU' : 'EN';
    setLang(next);
    localStorage.setItem('orchid_sec_lang', next);
  };

  // Expiry window (Configurable, default 15 mins)
  const [expiryMinutes, setExpiryMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('orchid_expiry_window_min');
    return saved ? parseInt(saved, 10) : 15;
  });

  useEffect(() => {
    localStorage.setItem('orchid_expiry_window_min', expiryMinutes.toString());
  }, [expiryMinutes]);

  // Daily Helpers State (Subscribed in Security)
  const [dailyHelpers, setDailyHelpers] = useState<DailyHelper[]>([]);
  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null);

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

  // Multi-flat Select & Search States
  const [selectedFlats, setSelectedFlats] = useState<string[]>(['A-101']);
  const [flatSearchQuery, setFlatSearchQuery] = useState<string>('');
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState<boolean>(false);

  // Active Requests & Logs
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [logsSearch, setLogsSearch] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Sound effects / Visual popups for newly resolved visitors
  const [showStatusAlert, setShowStatusAlert] = useState<Visitor | null>(null);

  // Manual sync/refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Subscribe to Daily Helpers
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'daily_helpers'), (snapshot) => {
      const list: DailyHelper[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as DailyHelper);
      });
      setDailyHelpers(list);
    }, (error) => {
      console.error('SecurityDashboard: Error listening to helpers:', error);
    });
    return () => unsubscribe();
  }, []);

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

  // Generate list of all 96 flats in the society (A-101 to B-1204)
  const allSocietyFlats: string[] = [];
  ['A', 'B'].forEach((w) => {
    for (let floor = 1; floor <= 12; floor++) {
      for (let fIdx = 1; fIdx <= 4; fIdx++) {
        allSocietyFlats.push(`${w}-${floor * 100 + fIdx}`);
      }
    }
  });

  // Flat selection list matching dropdowns
  const currentOwner = owners.find((o) => o.wing === wing && o.flatNo === flatNo);
  const flatOwnerName = currentOwner && !currentOwner.nameEn.toLowerCase().includes('vacant')
    ? `${currentOwner.nameEn} (${currentOwner.nameGu || ''})`
    : `Flat ${wing}-${flatNo}`;

  // Keep selectedFlats synchronized with single dropdown values if multi-select is not modified/interacted with
  useEffect(() => {
    if (!isMultiSelectOpen && selectedFlats.length <= 1) {
      setSelectedFlats([`${wing}-${flatNo}`]);
    }
  }, [wing, flatNo, isMultiSelectOpen]);

  // Fetch visitors list
  const fetchVisitors = async () => {
    try {
      const data = await api.getVisitors();
      if (Array.isArray(data)) {
        setVisitors((prev) => {
          data.forEach((newVis: Visitor) => {
            const oldVis = prev.find((v) => v.id === newVis.id);
            if (oldVis && oldVis.status === 'pending' && newVis.status !== 'pending') {
              setShowStatusAlert(newVis);
              playDecisionSound(newVis.status);
            }
          });
          return data;
        });
      }
    } catch (error) {
      console.error('Failed to fetch visitors:', error);
    }
  };

  // Subscribe to real-time status updates from Firestore
  useEffect(() => {
    const unsubscribe = api.subscribeAllVisitors(
      (data) => {
        setVisitors((prev) => {
          data.forEach((newVis: Visitor) => {
            const oldVis = prev.find((v) => v.id === newVis.id);
            if (oldVis && oldVis.status === 'pending' && newVis.status !== 'pending') {
              setShowStatusAlert(newVis);
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

  // Check if selected type is a recurring daily helper
  const isDailyHelperType = ['Milkman', 'Maid', 'Vehicle Cleaner', 'Newspaper'].includes(guestType);

  // Filter registered daily helpers in db matching currently selected helper role
  const mappedHelpers = dailyHelpers.filter((h) => {
    if (guestType === 'Maid') return h.role === 'Maid';
    if (guestType === 'Milkman') return h.role === 'Milkman';
    if (guestType === 'Vehicle Cleaner') return h.role === 'Car Cleaner';
    if (guestType === 'Newspaper') return h.role === 'Newspaper Guy';
    return false;
  });

  // Handle selecting a registered daily helper from the dropdown list
  const handleHelperSelectionChange = (helperId: string) => {
    setSelectedHelperId(helperId);
    if (!helperId || helperId === 'new') {
      // Clear fields for first-time registration of helper
      setFullName('');
      setMobileNumber('');
      setPhotoUrl('');
      setSelectedFlats([`${wing}-${flatNo}`]);
      return;
    }

    const helper = dailyHelpers.find((h) => h.id === helperId);
    if (helper) {
      setFullName(helper.name);
      setMobileNumber(helper.phone);
      setPhotoUrl(helper.photoUrl || '');
      setSelectedFlats(helper.flats || []);
    }
  };

  // Reset helper selections helper selection state manually if needed, but do not clear visitor input fields on guestType change
  const clearHelperSelections = () => {
    setSelectedHelperId(null);
  };

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !mobileNumber.trim()) {
      setFormError(lang === 'EN' ? 'Please fill out all mandatory fields.' : 'કૃપા કરીને બધી વિગતો ભરો.');
      return;
    }

    if (selectedFlats.length === 0) {
      setFormError(lang === 'EN' ? 'Please select at least one target flat.' : 'કૃપા કરીને ઓછામાં ઓછો એક ટાર્ગેટ ફ્લેટ પસંદ કરો.');
      return;
    }

    if (!photoUrl) {
      setFormError(lang === 'EN' ? 'Visitor photo is mandatory.' : 'મુલાકાતીનો ફોટો લેવો ફરજિયાત છે.');
      return;
    }

    setSubmitting(true);

    try {
      // Determine if this visitor goes into instant bypass or needs residents approvals
      const isBypassed = selectedHelperId && selectedHelperId !== 'new';
      const statusVal = isBypassed ? 'approved' : 'pending';

      // Register visitor logs for ALL selected flats
      for (const flatId of selectedFlats) {
        const parts = flatId.split('-');
        const fWing = parts[0] as 'A' | 'B';
        const fNo = parseInt(parts[1], 10);
        const owner = owners.find((o) => o.wing === fWing && o.flatNo === fNo);
        const ownerName = owner && !owner.nameEn.toLowerCase().includes('vacant')
          ? `${owner.nameEn} (${owner.nameGu || ''})`
          : `Flat ${fWing}-${fNo}`;

        const visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
        const defaultReason = isDailyHelperType ? `${guestType} Entry` : reason.trim() || 'General Visit';

        const newVisitor: any = {
          id: visitorId,
          fullName: fullName.trim(),
          mobileNumber: mobileNumber.trim(),
          email: email.trim() || '',
          wing: fWing,
          flatNo: fNo,
          reason: defaultReason,
          guestType,
          photoUrl: photoUrl || '',
          status: statusVal,
          requestTime: new Date().toISOString(),
          flatOwnerName: ownerName,
          visitorCount: isDailyHelperType ? 1 : visitorCount
        };

        if (statusVal === 'approved') {
          newVisitor.respondedTime = new Date().toISOString();
          newVisitor.respondedBy = 'System Auto-Bypass';
        }

        // Save visitor record in Firestore
        await setDoc(doc(db, 'visitors', visitorId), newVisitor);

        // If status is pending, also save a notification alert for the residents
        if (statusVal === 'pending') {
          await setDoc(doc(db, 'notifications', visitorId), {
            id: visitorId,
            type: 'visitor_request',
            wing: fWing,
            flatNo: fNo,
            visitorName: fullName.trim(),
            guestType,
            timestamp: new Date().toISOString(),
            acknowledged: false,
            status: 'pending'
          });
        }
      }

      // If we registered / bypassed a helper, sync their new flat mappings immediately
      if (isBypassed && selectedHelperId) {
        await updateDoc(doc(db, 'daily_helpers', selectedHelperId), {
          flats: selectedFlats
        });
      }

      // Success effects
      if (isBypassed) {
        playDecisionSound('approved');
      }

      // Reset form fields
      setFullName('');
      setMobileNumber('');
      setEmail('');
      setReason('');
      setPhotoUrl('');
      setVisitorCount(1);
      setSelectedHelperId(null);
      setSelectedFlats([`${wing}-${flatNo}`]);

      // Scroll to tracking section
      const trackerSection = document.getElementById('active-tracker');
      if (trackerSection) {
        trackerSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('Submit visitor error:', error);
      setFormError(error.message || 'Server connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle selected flats checklist
  const toggleFlatSelection = (flatId: string) => {
    setSelectedFlats((prev) => {
      if (prev.includes(flatId)) {
        return prev.filter((f) => f !== flatId);
      } else {
        return [...prev, flatId];
      }
    });
  };

  // Helper arrays
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

  // Filtered flats in the checklist search
  const filteredFlatsChecklist = allSocietyFlats.filter((fId) => {
    if (!flatSearchQuery.trim()) return true;
    return fId.toLowerCase().includes(flatSearchQuery.toLowerCase().trim());
  });

  return (
    <div className="space-y-8">
      
      {/* Top Controls: Manual Refresh & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm gap-4">
        <div className="text-left">
          <h1 className="font-display font-bold text-xl text-slate-800 tracking-tight flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
            <span>{t('panelTitle')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('panelSub')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLang}
            className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer shadow-sm"
          >
            <span>🌐 {lang === 'EN' ? 'ગુજરાતી' : 'English'}</span>
          </button>

          {/* Configurable Auto-Expiry Window */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-left">
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <div>
              <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">{t('expiryLabel')}</label>
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
            <span>{isRefreshing ? t('syncing') : t('manualRefresh')}</span>
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
              {t('acknowledgeOpen')}
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
              <h2 className="font-display font-bold text-lg text-slate-800">{t('newGateEntry')}</h2>
              <p className="text-xs text-slate-500">{t('newGateEntrySub')}</p>
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

            {/* Custom Registered Helpers Dropdown for Recurring service types */}
            {isDailyHelperType && (
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-1.5 text-indigo-800">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-display font-bold text-xs uppercase tracking-wider">
                    {lang === 'EN' ? 'Registered Service Helper Directory' : 'રજિસ્ટર્ડ હેલ્પર ડાયરેક્ટરી'}
                  </span>
                </div>

                <div>
                  <select
                    value={selectedHelperId || ''}
                    onChange={(e) => handleHelperSelectionChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold outline-none"
                  >
                    <option value="">{lang === 'EN' ? '-- Select Registered Helper --' : '-- રજિસ્ટર્ડ હેલ્પર પસંદ કરો --'}</option>
                    <option value="new" className="text-indigo-600 font-bold">
                      {lang === 'EN' ? '+ Register New Service Person / Helper' : '+ નવો હેલ્પર રજિસ્ટર કરો'}
                    </option>
                    {mappedHelpers.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedHelperId && selectedHelperId !== 'new' ? (
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 p-2.5 rounded-lg text-[10px] leading-relaxed">
                    <strong>✅ BYPASS ACTIVE:</strong> This helper is pre-approved by their mapped residents. Entry will be logged instantly and bypass gate approvals!
                  </div>
                ) : selectedHelperId === 'new' ? (
                  <div className="bg-amber-50 text-amber-800 border border-amber-150 p-2.5 rounded-lg text-[10px] leading-relaxed">
                    <strong>⚠️ FIRST TIME REGISTRATION:</strong> This helper will need to be approved by the target resident(s). Once approved, they will be registered for future instant bypasses!
                  </div>
                ) : null}
              </div>
            )}

            {/* Core details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('visitorName')} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder={t('visitorNamePlace')}
                  value={fullName}
                  disabled={!!(selectedHelperId && selectedHelperId !== 'new')}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white disabled:opacity-75 rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('mobileNumber')} <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  placeholder={t('mobileNumberPlace')}
                  value={mobileNumber}
                  disabled={!!(selectedHelperId && selectedHelperId !== 'new')}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white disabled:opacity-75 rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Destination */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('guestType')} <span className="text-red-500">*</span></label>
                <select
                  value={guestType}
                  onChange={(e) => setGuestType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none cursor-pointer"
                >
                  <option value="Delivery">{lang === 'EN' ? 'Delivery / Courier' : '📦 ડિલિવરી / કુરિયર'}</option>
                  <option value="Guest">{lang === 'EN' ? 'Guest / Friend' : '👋 મહેમાન / મિત્ર'}</option>
                  <option value="Electrician">{lang === 'EN' ? 'Electrician / Repair' : '⚡ ઇલેક્ટ્રિશિયન / રિપેર'}</option>
                  <option value="Milkman">{lang === 'EN' ? 'Milkman' : '🥛 દૂધવાળો (Milkman)'}</option>
                  <option value="Maid">{lang === 'EN' ? 'Household Maid' : '🧹 કામવાળા બહેન (Maid)'}</option>
                  <option value="Vehicle Cleaner">{lang === 'EN' ? 'Vehicle Cleaner' : '🚗 ગાડી સાફ કરવાવાળા'}</option>
                  <option value="Newspaper">{lang === 'EN' ? 'Newspaper Delivery' : '📰 પેપરવાળો'}</option>
                  <option value="Cabinet">{lang === 'EN' ? 'Service Agent' : '🛠️ સર્વિસ એજન્ટ'}</option>
                  <option value="Other">{lang === 'EN' ? 'Other Visitor' : '👤 અન્ય મુલાકાતી'}</option>
                </select>
              </div>

              {/* Single flat selectors which will update default target */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('wing')} <span className="text-red-500">*</span></label>
                  <select
                    value={wing}
                    onChange={(e) => setWing(e.target.value as 'A' | 'B')}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3 px-3.5 text-sm font-medium transition outline-none cursor-pointer"
                  >
                    <option value="A">Wing A</option>
                    <option value="B">Wing B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('flatNo')} <span className="text-red-500">*</span></label>
                  <select
                    value={flatNo}
                    onChange={(e) => setFlatNo(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3 px-3.5 text-sm font-medium transition outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).flatMap((floor) =>
                      Array.from({ length: 4 }, (_, j) => floor * 100 + (j + 1))
                    ).map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Searchable Multi-Flat Selection Interface */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
              <button
                type="button"
                onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100 py-3 px-4 flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 transition"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    {lang === 'EN' ? 'Select Target Flat(s) - Multi-Select Enabled' : 'ટાર્ગેટ ફ્લેટ પસંદ કરો - મલ્ટી-સિલેક્ટ ચાલુ'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-indigo-150 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {selectedFlats.length} {lang === 'EN' ? 'Selected' : 'પસંદ કરેલ'}
                  </span>
                  <span>{isMultiSelectOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isMultiSelectOpen && (
                <div className="p-4 space-y-4 bg-white text-left text-xs">
                  {/* Search and control buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={lang === 'EN' ? "Search flats... (e.g. 1104, B-)" : "ફ્લેટ શોધો... (e.g. B-110)"}
                        value={flatSearchQuery}
                        onChange={(e) => setFlatSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFlats(allSocietyFlats)}
                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                      >
                        {lang === 'EN' ? 'Select All' : 'બધા પસંદ કરો'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFlats([])}
                        className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                      >
                        {lang === 'EN' ? 'Deselect All' : 'ખાલી કરો'}
                      </button>
                    </div>
                  </div>

                  {/* Scrollable button grid for quick tablet tap selection */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50 shadow-inner">
                    {filteredFlatsChecklist.map((flatId) => {
                      const isChecked = selectedFlats.includes(flatId);
                      return (
                        <button
                          type="button"
                          key={flatId}
                          onClick={() => toggleFlatSelection(flatId)}
                          className={`py-1 rounded font-mono text-[10px] font-bold border transition-all text-center cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-black scale-95'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          {flatId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Display list of selected flats as tags */}
            {selectedFlats.length > 0 && (
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {lang === 'EN' ? 'Target Flats & Wings:' : 'પસંદ કરેલા ફ્લેટ્સ:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFlats.map((fId) => (
                    <span
                      key={fId}
                      className="inline-flex items-center space-x-1 font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded text-[10px]"
                    >
                      <span>{fId}</span>
                      <button
                        type="button"
                        onClick={() => toggleFlatSelection(fId)}
                        className="hover:text-red-600 font-extrabold focus:outline-none ml-1 text-slate-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Destination lookup banner for a single selected owner */}
            {!isMultiSelectOpen && selectedFlats.length <= 1 && (
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t('targetOwner')}</p>
                  <p className="text-sm font-bold text-slate-800">{flatOwnerName}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                  currentOwner && !currentOwner.nameEn.toLowerCase().includes('vacant')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {currentOwner && !currentOwner.nameEn.toLowerCase().includes('vacant') ? t('ownerActive') : t('noOwner')}
                </span>
              </div>
            )}

            {/* Render standard options when not a recurrent service person */}
            {!isDailyHelperType && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('reason')} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required={!isDailyHelperType}
                    placeholder={t('reasonPlace')}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('email')} <span className="text-slate-400 font-normal">{t('optional')}</span></label>
                  <input
                    type="email"
                    placeholder="visitor@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium transition outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">{t('numVisitors')} <span className="text-red-500">*</span></label>
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
            )}

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
                  <span>
                    {selectedHelperId && selectedHelperId !== 'new'
                      ? (lang === 'EN' ? 'Acknowledge & Register Entry (Approved)' : 'નોંધણી કરો અને પ્રવેશ મંજૂર કરો')
                      : t('sendRequest')
                    }
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Hand: Active Pending Gate Approvals (5 Cols) */}
        <div id="active-tracker" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-base text-slate-800">{t('activeTracker')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('activeTrackerSub')}</p>
            </div>
            <span className="font-mono bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              <span>{pendingVisitors.length} {lang === 'EN' ? 'waiting' : 'બાકી'}</span>
            </span>
          </div>

          {pendingVisitors.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-100 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">{lang === 'EN' ? 'No Pending Visitors' : 'કોઈ બાકી વિનંતી નથી'}</p>
              <p className="text-xs text-slate-400 mt-1">{lang === 'EN' ? 'All registered visitors have been resolved or are cleared.' : 'બધા મુલાકાતીઓને મંજૂરી મળી ગઈ છે અથવા પૂર્ણ છે.'}</p>
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
