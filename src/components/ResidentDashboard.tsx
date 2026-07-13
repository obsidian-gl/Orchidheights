/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, Check, X, Users, Car, Phone, Lock, Eye, EyeOff, ClipboardList, AlertCircle, Trash2, Plus, Clock, RefreshCw, Megaphone, FileText, Download, Search, Wrench, CheckCircle, Upload, Calendar, Home, User, Dumbbell, Film, Sparkles, BookOpen, MapPin, CheckSquare, PlusCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { FlatOwner, Visitor, Vehicle, UserSession, Announcement, AmenityBooking, GymTheatreLog, DailyHelper, AbsenceLog, EssentialContact } from '../types';
import { api, detectServerEnvironment } from '../lib/api';
import { db, collection, doc, setDoc, addDoc, getDocs, onSnapshot, updateDoc, deleteDoc, query, where, orderBy } from '../lib/firebase';
import { compressImage } from '../lib/imageCompressor';
import { uploadFileInChunks } from '../lib/fileStorage';

import VisitorsSection from './resident/VisitorsSection';
import DirectorySection from './resident/DirectorySection';
import AmenitiesSection from './resident/AmenitiesSection';
import LocalServicesSection from './resident/LocalServicesSection';
import HelpDeskSection from './resident/HelpDeskSection';
import NoticeSection from './resident/NoticeSection';
import ProfileSection from './resident/ProfileSection';
import BuildingServicesSection from './resident/BuildingServicesSection';

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
      osc.frequency.setValueAtTime(toggle ? 3200 : 2800, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1.0, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      
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
  const { wing = 'A', flatNo = 101 } = session;

  // Active visitor request state
  const [activePoll, setActivePoll] = useState<Visitor[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [activeSosAlerts, setActiveSosAlerts] = useState<any[]>([]);
  const [sosHoldProgress, setSosHoldProgress] = useState<number>(0);
  const [isHoldingSos, setIsHoldingSos] = useState<boolean>(false);

  const holdStartTimeRef = useRef<number>(0);
  const holdAnimationRef = useRef<number | null>(null);

  // Subscribe to real-time SOS Alerts
  useEffect(() => {
    const qSos = query(collection(db, 'sos_alerts'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(qSos, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setActiveSosAlerts(list);
    }, (error) => {
      console.error('Error listening to SOS alerts:', error);
    });
    return () => unsubscribe();
  }, []);

  // Sync SOS and visitor alarms
  useEffect(() => {
    if (activeSosAlerts.length > 0) {
      playHighFrequencyAlarm();
    } else {
      if (activePoll.length === 0) {
        stopHighFrequencyAlarm();
      }
    }
  }, [activeSosAlerts, activePoll]);

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
  const notifiedVisitorIds = useRef<Set<string>>(new Set());

  // Find current owner data
  const myOwnerData = owners.find((o) => o.wing === wing && o.flatNo === flatNo);

  // Household Members State
  const [newMember, setNewMember] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  
  // Vehicle State
  const [vType, setVType] = useState<'twowheeler' | 'fourwheeler'>('fourwheeler');
  const [vPlate, setVPlate] = useState<string>('');
  const [vModel, setVModel] = useState<string>('');
  const [vParkingPlot, setVParkingPlot] = useState<string>('');

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

  // Notification permission tracking state
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    return 'Notification' in window ? Notification.permission : 'denied';
  });

  const handleRequestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        setNotifPermission(perm);
        if (perm === 'granted') {
          alert('🎉 Thank you! Notifications are now enabled. You will receive real-time visitor alerts even when the app is closed.');
        } else {
          alert('⚠️ Permission not granted. Please enable notifications in your browser/app settings to receive visitor alerts.');
        }
      }).catch(err => {
        console.warn('Error requesting permission:', err);
      });
    }
  };

  // Bottom Bar Main Tabs & Sub-sections
  const [activeMainTab, setActiveMainTab] = useState<'community' | 'personal'>('community');
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);
  const [lastVisitedSubSection, setLastVisitedSubSection] = useState<string | null>(() => localStorage.getItem('orchid_last_visited_block'));
  const [highlightBlock, setHighlightBlock] = useState<string | null>(null);

  // New persistent states
  const [amenityBookings, setAmenityBookings] = useState<AmenityBooking[]>([]);
  const [gymTheatreLogs, setGymTheatreLogs] = useState<GymTheatreLog[]>([]);
  const [dailyHelpers, setDailyHelpers] = useState<DailyHelper[]>([]);
  const [absenceLogs, setAbsenceLogs] = useState<AbsenceLog[]>([]);
  const [essentialContacts, setEssentialContacts] = useState<EssentialContact[]>([]);
  const [societyNotifications, setSocietyNotifications] = useState<any[]>([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('orchid_dismissed_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sub-tabs state inside Resident Portal
  const [residentTab, setResidentTab] = useState<'home' | 'notices' | 'complaints' | 'financials' | 'contacts'>('home');

  // Load real-time persistent data for Amenities, Helpers, and Absences
  useEffect(() => {
    // 1. Amenity Bookings
    const qBookings = query(collection(db, 'amenities_bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const list: AmenityBooking[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AmenityBooking);
      });
      setAmenityBookings(list);
    }, (error) => console.error('Error listening to bookings:', error));

    // 2. Gym and Theatre Logs
    const qLogs = query(collection(db, 'gym_theatre_logs'), orderBy('createdAt', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const list: GymTheatreLog[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as GymTheatreLog);
      });
      setGymTheatreLogs(list);
    }, (error) => console.error('Error listening to logs:', error));

    // 3. Daily Helpers and Seeding
    const qHelpers = collection(db, 'daily_helpers');
    const unsubHelpers = onSnapshot(qHelpers, async (snapshot) => {
      if (snapshot.empty) {
        // Seed default helpers
        const defaults = [
          { name: 'Pooja (Maid)', phone: '9876543210', role: 'Maid', flats: ['B-1104', 'B-1102'] },
          { name: 'Ramesh (Milkman)', phone: '9876543211', role: 'Milkman', flats: ['B-1104', 'A-102'] },
          { name: 'Suresh (Cleaner)', phone: '9876543212', role: 'Car Cleaner', flats: ['B-1104'] },
          { name: 'Kamlesh (Plumber)', phone: '9876543213', role: 'Other', flats: [] },
        ];
        for (const item of defaults) {
          try {
            await addDoc(collection(db, 'daily_helpers'), item);
          } catch (e) {
            console.error('Seeding error:', e);
          }
        }
      } else {
        const list: DailyHelper[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as DailyHelper);
        });
        setDailyHelpers(list);
      }
    }, (error) => console.error('Error listening to helpers:', error));

    // 4. Absence Logs
    const qAbsence = query(collection(db, 'absence_logs'), orderBy('createdAt', 'desc'));
    const unsubAbsences = onSnapshot(qAbsence, (snapshot) => {
      const list: AbsenceLog[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AbsenceLog);
      });
      setAbsenceLogs(list);
    }, (error) => console.error('Error listening to absence logs:', error));

    // 5. Essential Contacts
    const qContacts = collection(db, 'essential_contacts');
    const unsubContacts = onSnapshot(qContacts, async (snapshot) => {
      if (snapshot.empty) {
        const defaults: EssentialContact[] = [
          { id: 'ec_1', name: 'Ramesh Patel', category: 'Plumber', phone: '9825012345', active: true },
          { id: 'ec_2', name: 'Kishore Parmar', category: 'Electrician', phone: '9898022334', active: true },
          { id: 'ec_3', name: 'Gate 1 Guard Duty', category: 'Security', phone: '9426055667', active: true },
          { id: 'ec_4', name: 'Orchid Heights Manager', category: 'Manager', phone: '9712033445', active: true },
          { id: 'ec_5', name: 'Manish Mali', category: 'Gardener', phone: '9033099881', active: true }
        ];
        for (const c of defaults) {
          try {
            await setDoc(doc(db, 'essential_contacts', c.id), c);
          } catch (e) {
            console.error('Seeding essential contacts error:', e);
          }
        }
      } else {
        const list: EssentialContact[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as EssentialContact);
        });
        setEssentialContacts(list);
      }
    }, (error) => console.error('Error listening to essential contacts:', error));

    // 6. Society Notifications
    const unsubSocietyNotifs = api.subscribeSocietyNotifications(wing, flatNo, (list) => {
      setSocietyNotifications(list);
    });

    return () => {
      unsubBookings();
      unsubLogs();
      unsubHelpers();
      unsubAbsences();
      unsubContacts();
      unsubSocietyNotifs();
    };
  }, []);

  // Save last visited sub-section in localStorage for persistence
  useEffect(() => {
    if (lastVisitedSubSection) {
      localStorage.setItem('orchid_last_visited_block', lastVisitedSubSection);
    }
  }, [lastVisitedSubSection]);

  // Smoothly restore the user's scroll position when they return to the main dashboard from any block
  useEffect(() => {
    if (activeSubSection === null && lastVisitedSubSection) {
      setHighlightBlock(lastVisitedSubSection);
      const timer = setTimeout(() => {
        const element = document.getElementById(`block-${lastVisitedSubSection}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      // Clear visual highlight after 2.5 seconds
      const clearTimer = setTimeout(() => {
        setHighlightBlock(null);
      }, 2500);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [activeSubSection, lastVisitedSubSection]);

  // Amenities Function booking form states
  const [fPropertyName, setFPropertyName] = useState<string>('Clubhouse Party Hall');
  const [fDateFrom, setFDateFrom] = useState<string>('');
  const [fDateTo, setFDateTo] = useState<string>('');
  const [fReason, setFReason] = useState<string>('');
  const [fStuffNeeded, setFStuffNeeded] = useState<string>('');
  const [fParkingRequest, setFParkingRequest] = useState<string>('');
  const [amenityBookingError, setAmenityBookingError] = useState<string>('');
  const [amenityBookingSuccess, setAmenityBookingSuccess] = useState<string>('');

  // Gym / Theatre logs form states
  const [gymTheatreSuccess, setGymTheatreSuccess] = useState<string>('');
  const [gymTheatreError, setGymTheatreError] = useState<string>('');
  const [exitPhotoBase64, setExitPhotoBase64] = useState<string>('');
  const [exitPhotoFile, setExitPhotoFile] = useState<File | null>(null);
  const [activeCheckInLog, setActiveCheckInLog] = useState<GymTheatreLog | null>(null);
  const [showExitPhotoModal, setShowExitPhotoModal] = useState<boolean>(false);
  const [exitPhotoTimeError, setExitPhotoTimeError] = useState<boolean>(false);

  // Absence form states
  const [absDateFrom, setAbsDateFrom] = useState<string>('');
  const [absDateTo, setAbsDateTo] = useState<string>('');
  const [absMilkRedirect, setAbsMilkRedirect] = useState<string>('');
  const [absNewspaperRedirect, setAbsNewspaperRedirect] = useState<string>('');
  const [absParcelRedirect, setAbsParcelRedirect] = useState<string>('');
  const [absenceError, setAbsenceError] = useState<string>('');
  const [absenceSuccess, setAbsenceSuccess] = useState<string>('');

  // Download 3-month visitor logs as CSV
  const handleDownloadVisitorReport = () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const reportData = guestHistory.filter(v => new Date(v.requestTime) >= threeMonthsAgo);
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Visitor Name,Mobile,Wing,Flat,Reason,Type,Visitor Count,Status,Request Time,Responded Time,Responded By,Reject Reason\n";
    
    reportData.forEach(v => {
      const row = [
        `"${v.fullName.replace(/"/g, '""')}"`,
        `"${v.mobileNumber}"`,
        `"${v.wing}"`,
        `"${v.flatNo}"`,
        `"${(v.reason || '').replace(/"/g, '""')}"`,
        `"${v.guestType}"`,
        `"${v.visitorCount || 1}"`,
        `"${v.status}"`,
        `"${v.requestTime}"`,
        `"${v.respondedTime || ''}"`,
        `"${(v.respondedBy || '').replace(/"/g, '""')}"`,
        `"${(v.rejectReason || '').replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `visitor_report_flat_${wing}-${flatNo}_3months.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit function booking request
  const handleAddAmenityBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmenityBookingError('');
    setAmenityBookingSuccess('');
    
    if (!fDateFrom || !fDateTo || !fReason.trim() || !fStuffNeeded.trim()) {
      setAmenityBookingError('Please fill in all the required fields.');
      return;
    }

    try {
      const newBooking: Omit<AmenityBooking, 'id'> = {
        flatId: `${wing}-${flatNo}`,
        propertyName: fPropertyName,
        dateFrom: fDateFrom,
        dateTo: fDateTo,
        reason: fReason.trim(),
        stuffNeeded: fStuffNeeded.trim(),
        parkingRequest: fParkingRequest.trim(),
        approvedFlats: [`${wing}-${flatNo}`], // current owner auto-approves
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'amenities_bookings'), newBooking);
      setAmenityBookingSuccess('Function clubhouse booking registered successfully on the public board!');
      setFDateFrom('');
      setFDateTo('');
      setFReason('');
      setFStuffNeeded('');
      setFParkingRequest('');
    } catch (err: any) {
      setAmenityBookingError(err.message || 'Failed to request booking.');
    }
  };

  const handleDismissNotification = (id: string) => {
    const updated = [...dismissedNotifIds, id];
    setDismissedNotifIds(updated);
    localStorage.setItem('orchid_dismissed_notifs', JSON.stringify(updated));
  };

  // Vote or Toggle support for a function booking
  const handleVoteAmenityBooking = async (bookingId: string) => {
    const currentFlat = `${wing}-${flatNo}`;
    const target = amenityBookings.find(b => b.id === bookingId);
    if (!target) return;

    let updatedApprovedFlats = [...(target.approvedFlats || [])];
    if (updatedApprovedFlats.includes(currentFlat)) {
      updatedApprovedFlats = updatedApprovedFlats.filter(f => f !== currentFlat);
    } else {
      updatedApprovedFlats.push(currentFlat);
    }

    try {
      await updateDoc(doc(db, 'amenities_bookings', bookingId), {
        approvedFlats: updatedApprovedFlats
      });
    } catch (error) {
      console.error('Failed to vote booking:', error);
    }
  };

  // Check In to Gym / Theatre
  const handleCheckInGymTheatre = async (amenity: 'Gym' | 'Theatre') => {
    setGymTheatreSuccess('');
    setGymTheatreError('');
    const flatId = `${wing}-${flatNo}`;
    
    // Check if flat is already checked in and hasn't checked out
    const activeSession = gymTheatreLogs.find(l => l.flatId === flatId && l.amenity === amenity && !l.checkOutTime);
    if (activeSession) {
      setGymTheatreError(`Your flat is already checked into ${amenity}. Please check out first.`);
      return;
    }

    const payload: Omit<GymTheatreLog, 'id'> = {
      flatId,
      amenity,
      checkInTime: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'gym_theatre_logs'), payload);
      setGymTheatreSuccess(`Checked in to ${amenity} successfully!`);
    } catch (err: any) {
      setGymTheatreError(err.message || 'Check-in failed.');
    }
  };

  // Check Out Gym / Theatre Flow initiator
  const handleCheckOutGymTheatreFlow = (log: GymTheatreLog) => {
    setGymTheatreError('');
    setGymTheatreSuccess('');
    setActiveCheckInLog(log);
    setExitPhotoBase64('');
    setExitPhotoTimeError(false);
    setShowExitPhotoModal(true);
  };

  // Handle Photo input conversion with 15-minute file age verification
  const handleExitPhotoChange = (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setGymTheatreError('Exit Photo size exceeds 8MB maximum limit.');
      return;
    }

    // Verify 15-minute maximum age of the photo to ensure it is live/recent
    setExitPhotoFile(file);
    const fileAgeMs = Date.now() - file.lastModified;
    const fileAgeMinutes = fileAgeMs / 60000;
    if (fileAgeMinutes > 15) {
      setGymTheatreError('Security Audit: The exit photo must be a live image captured within the last 15 minutes. Please snap a new photo.');
      setExitPhotoTimeError(true);
      setExitPhotoBase64('');
      return;
    }

    // Compress the live selfie image to keep database payload ultra-lightweight and prevent size limit crashes
    compressImage(file, 500, 500, 0.5)
      .then((compressedBase64) => {
        setExitPhotoBase64(compressedBase64);
        setExitPhotoTimeError(false);
        setGymTheatreError('');
      })
      .catch((err) => {
        console.error('Exit photo compression failed:', err);
        setGymTheatreError('Failed to process image compression.');
      });
  };

  // Confirm Check Out with Image upload
  const handleConfirmCheckOut = async () => {
    if (!activeCheckInLog) return;
    if (!exitPhotoBase64) {
      setGymTheatreError('An exit checkout selfie snapshot is required to proceed.');
      return;
    }

    const checkInTime = new Date(activeCheckInLog.checkInTime).getTime();
    const now = new Date();
    const nowTime = now.getTime();
    const elapsedMs = nowTime - checkInTime;
    const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / 60000));

    try {
      setGymTheatreSuccess('');
      setGymTheatreError('Uploading verification snapshot in progress...');
      
      let finalPhotoUrl = exitPhotoBase64;
      if (exitPhotoFile) {
        // Upload exit photo file in chunks to completely bypass firestore size limits!
        const meta = await uploadFileInChunks(exitPhotoFile);
        finalPhotoUrl = meta.fileId;
      }

      await updateDoc(doc(db, 'gym_theatre_logs', activeCheckInLog.id), {
        checkOutTime: now.toISOString(),
        exitPhotoUrl: finalPhotoUrl,
        durationMinutes: elapsedMinutes
      });
      setGymTheatreSuccess(`Checked out of ${activeCheckInLog.amenity} successfully! Total session: ${elapsedMinutes} minutes.`);
      setShowExitPhotoModal(false);
      setActiveCheckInLog(null);
      setExitPhotoBase64('');
      setExitPhotoFile(null);
      setExitPhotoTimeError(false);
    } catch (err: any) {
      setGymTheatreError(err.message || 'Check-out failed.');
    }
  };

  // Map Daily Helpers mapping toggle
  const handleToggleHelperMapping = async (helperId: string) => {
    const flatId = `${wing}-${flatNo}`;
    const target = dailyHelpers.find(h => h.id === helperId);
    if (!target) return;

    let updatedFlats = [...(target.flats || [])];
    if (updatedFlats.includes(flatId)) {
      updatedFlats = updatedFlats.filter(f => f !== flatId);
    } else {
      updatedFlats.push(flatId);
    }

    try {
      await updateDoc(doc(db, 'daily_helpers', helperId), {
        flats: updatedFlats
      });
    } catch (error) {
      console.error('Failed to update helper flat assignment:', error);
    }
  };

  // Absence Log Planner Actions
  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbsenceSuccess('');
    setAbsenceError('');

    if (!absDateFrom || !absDateTo) {
      setAbsenceError('Please choose planned departure and return dates.');
      return;
    }

    const flatId = `${wing}-${flatNo}`;
    const payload: Omit<AbsenceLog, 'id'> = {
      flatId,
      dateFrom: absDateFrom,
      dateTo: absDateTo,
      milkRedirectFlat: absMilkRedirect.trim() || undefined,
      newspaperRedirectFlat: absNewspaperRedirect.trim() || undefined,
      parcelRedirectFlat: absParcelRedirect.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'absence_logs'), payload);
      setAbsenceSuccess('Your planned absence vacation calendar block has been registered. The gatekeeper has been automated to bypass alerting your flat.');
      setAbsDateFrom('');
      setAbsDateTo('');
      setAbsMilkRedirect('');
      setAbsNewspaperRedirect('');
      setAbsParcelRedirect('');
    } catch (err: any) {
      setAbsenceError(err.message || 'Failed to save planned vacation blocks.');
    }
  };

  const handleCancelAbsence = async () => {
    const flatId = `${wing}-${flatNo}`;
    const active = absenceLogs.find((a) => a.flatId === flatId);
    if (!active) return;
    if (confirm('Cancel your planned absence calendar? This will immediately resume normal daily helper alarms and notifications.')) {
      try {
        await deleteDoc(doc(db, 'absence_logs', active.id));
        setAbsenceSuccess('Absence vacation period canceled. Helper alerts have been re-activated.');
      } catch (err: any) {
        setAbsenceError(err.message || 'Failed to delete vacation block.');
      }
    }
  };

  // Delete history records
  const handleDeleteHistoryRecord = async (visitorId: string, visitorName: string) => {
    if (confirm(`Remove visitor "${visitorName}" from your local logs panel?`)) {
      try {
        await api.deleteVisitor(visitorId);
        fetchMyGuestHistory();
      } catch (err: any) {
        console.error('Failed to delete logs:', err);
      }
    }
  };

  // Profile management updates
  const updateOwnerProfile = async (fields: Partial<FlatOwner>, msg: string) => {
    if (!myOwnerData) return;
    setSavingSettings(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const res = await api.updateOwner(wing, flatNo, fields);
      if (res.success) {
        setSettingsSuccess(msg);
        onRefreshOwners();
      } else {
        setSettingsError(res.message || 'Failed to save updates.');
      }
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to save updates.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.trim() || !myOwnerData) return;
    const memberStr = newMemberPhone.trim()
      ? `${newMember.trim()} (${newMemberPhone.trim()})`
      : newMember.trim();
    const updatedMembers = [...(myOwnerData.members || []), memberStr];
    updateOwnerProfile({ members: updatedMembers }, 'Household family member registered successfully.');
    setNewMember('');
    setNewMemberPhone('');
  };

  const handleRemoveMember = (idx: number) => {
    if (!myOwnerData) return;
    const updatedMembers = (myOwnerData.members || []).filter((_, i) => i !== idx);
    updateOwnerProfile({ members: updatedMembers }, 'Household family member unregistered.');
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPlate.trim() || !vModel.trim() || !myOwnerData) return;
    const newV: Vehicle = {
      id: Math.random().toString(36).substring(2, 9),
      type: vType,
      plateNumber: vPlate.trim().toUpperCase(),
      brandModel: vModel.trim(),
      parkingPlot: vParkingPlot.trim() || undefined
    };
    const updatedVehicles = [...(myOwnerData.vehicles || []), newV];
    updateOwnerProfile({ vehicles: updatedVehicles }, 'Vehicle register plate license registered successfully.');
    setVPlate('');
    setVModel('');
    setVParkingPlot('');
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    if (!myOwnerData) return;
    const updatedVehicles = (myOwnerData.vehicles || []).filter(v => v.id !== vehicleId);
    updateOwnerProfile({ vehicles: updatedVehicles }, 'Vehicle registry plate deleted.');
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myOwnerData) return;
    updateOwnerProfile({ secondaryContact: altContact }, 'Settings updated successfully.');
  };

  // Complaints, Financials, Contacts state
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState<boolean>(false);
  const [compTitle, setCompTitle] = useState<string>('');
  const [compDesc, setCompDesc] = useState<string>('');
  const [compMedia, setCompMedia] = useState<string>('');
  const [compMediaName, setCompMediaName] = useState<string>('');
  const [compMediaType, setCompMediaType] = useState<string>('');
  const [compSuccess, setCompSuccess] = useState<string>('');
  const [compError, setCompError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [financials, setFinancials] = useState<any[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState<boolean>(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
  const [contactCategoryFilter, setContactCategoryFilter] = useState<string>('all');
  const [directorySearch, setDirectorySearch] = useState<string>('');

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

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await detectServerEnvironment();
      onRefreshOwners();
      await checkVisitorAlerts();
      await fetchMyGuestHistory();
      await fetchComplaints();
      await fetchFinancials();
      await fetchContacts();
    } catch (error) {
      console.error('Failed to perform manual sync:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Request desktop notification permission and pre-fetch list databases
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch((err) => console.warn('Notification permission rejected:', err));
    }
    fetchComplaints();
    fetchFinancials();
    fetchContacts();
  }, []);

  // Initialize form states from loaded database
  useEffect(() => {
    if (myOwnerData) {
      setAltContact(myOwnerData.secondaryContact || '');
    }
  }, [myOwnerData]);

  const checkVisitorAlerts = async () => {
    if (!wing || !flatNo) return;
    try {
      const data = await api.pollVisitorAlerts(wing, flatNo);
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

    fetchMyGuestHistory();

    const unsubscribe = api.subscribeNotifications(
      wing,
      flatNo,
      (pendingNotifications) => {
        pendingNotifications.forEach((v) => {
          if (!notifiedVisitorIds.current.has(v.id)) {
            notifiedVisitorIds.current.add(v.id);
            triggerNewVisitorNotification(v);
          }
        });
        setActivePoll(pendingNotifications);
      },
      (error) => {
        console.error('Real-time notifications subscription failed:', error);
        checkVisitorAlerts();
      }
    );

    const historyInterval = setInterval(() => {
      fetchMyGuestHistory();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(historyInterval);
    };
  }, [wing, flatNo]);

  // Check for auto-expiration on the resident dashboard
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiryMs = 15 * 60 * 1000;
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

  const handleRespond = async (visitorId: string, status: 'approved' | 'rejected', customReason?: string) => {
    stopHighFrequencyAlarm();
    try {
      const responderName = session.ownerName || `Owner of Flat ${wing}-${flatNo}`;
      const targetVisitor = activePoll.find((v) => v.id === visitorId);
      const res = await api.respondToVisitor(visitorId, status, responderName, customReason || '');
      if (res.success) {
        // Auto-register first-time helper if approved by resident
        if (targetVisitor && status === 'approved') {
          const type = targetVisitor.guestType;
          if (['Maid', 'Milkman', 'Vehicle Cleaner', 'Newspaper'].includes(type)) {
            const normalizedPhone = targetVisitor.mobileNumber.trim();
            const qHelpers = query(
              collection(db, 'daily_helpers'),
              where('phone', '==', normalizedPhone)
            );
            const querySnap = await getDocs(qHelpers);
            if (querySnap.empty) {
              const helperRole = 
                type === 'Maid' ? 'Maid' :
                type === 'Milkman' ? 'Milkman' :
                type === 'Vehicle Cleaner' ? 'Car Cleaner' :
                type === 'Newspaper' ? 'Newspaper Guy' : 'Other';

              await addDoc(collection(db, 'daily_helpers'), {
                name: targetVisitor.fullName,
                phone: normalizedPhone,
                role: helperRole,
                flats: [`${targetVisitor.wing}-${targetVisitor.flatNo}`],
                photoUrl: targetVisitor.photoUrl || ''
              });
            } else {
              // Add this flat if not already there
              const helperDoc = querySnap.docs[0];
              const helperData = helperDoc.data();
              const currentFlats = helperData.flats || [];
              const thisFlatId = `${targetVisitor.wing}-${targetVisitor.flatNo}`;
              if (!currentFlats.includes(thisFlatId)) {
                await updateDoc(doc(db, 'daily_helpers', helperDoc.id), {
                  flats: [...currentFlats, thisFlatId]
                });
              }
            }
          }
        }

        setActivePoll((prev) => prev.filter((v) => v.id !== visitorId));
        setRejectingId(null);
        setRejectReasonText('');
        fetchMyGuestHistory();
      }
    } catch (error) {
      console.error('Failed to respond to visitor:', error);
    }
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setCompError('File is too large. Max size allowed is 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCompMedia(e.target.result as string);
        setCompMediaName(file.name);
        setCompMediaType(file.type);
      }
    };
    reader.readAsDataURL(file);
  };

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
        mediaUrl: compMedia,
        mediaName: compMediaName,
        mediaType: compMediaType
      });
      setCompSuccess('Your complaint has been successfully registered on the board! The Secretary has been notified.');
      setCompTitle('');
      setCompDesc('');
      setCompMedia('');
      setCompMediaName('');
      setCompMediaType('');
      fetchComplaints();
    } catch (err: any) {
      setCompError(err.message || 'Failed to submit complaint.');
    }
  };

  const startSosHold = (e: React.MouseEvent | React.TouchEvent) => {
    cancelSosHold();

    setIsHoldingSos(true);
    setSosHoldProgress(0);
    holdStartTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const pct = Math.min(100, (elapsed / 5000) * 100);
      setSosHoldProgress(pct);

      if (elapsed >= 5000) {
        triggerGlobalSosAlert();
        cancelSosHold();
      } else {
        holdAnimationRef.current = requestAnimationFrame(updateProgress);
      }
    };

    holdAnimationRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelSosHold = () => {
    setIsHoldingSos(false);
    setSosHoldProgress(0);
    if (holdAnimationRef.current) {
      cancelAnimationFrame(holdAnimationRef.current);
      holdAnimationRef.current = null;
    }
  };

  const triggerGlobalSosAlert = async () => {
    try {
      playHighFrequencyAlarm();
      const payload = {
        flatId: `${wing}-${flatNo}`,
        triggeredBy: fullName,
        triggeredAt: new Date().toISOString(),
        status: 'active'
      };
      await addDoc(collection(db, 'sos_alerts'), payload);
      alert("🚨 EMERGENCY SOS BROADCASTED! Society-wide emergency alarm has been triggered and sent to all owners and guards.");
    } catch (err: any) {
      console.error('Failed to trigger SOS:', err);
      alert('🔴 Failed to broadcast SOS alert. Playing local high-frequency alarm only.');
    }
  };

  const fullName = myOwnerData?.nameEn || 'RAHUL JASHVANTRAI POPAT';
  const firstName = fullName.split(' ')[0] || 'Rahul';
  const nameGu = myOwnerData?.nameGu || 'રાહુલ જશવંતરાય પોપટ';
  const flatStr = `Flat ${wing}-${flatNo}`;
  const activeSocietyNotifs = societyNotifications.filter((n) => !dismissedNotifIds.includes(n.id));

  return (
    <div className="space-y-6 text-slate-800 pb-24 text-left">

      {/* Prominent Notification Enable Banner if permission not granted */}
      {notifPermission !== 'granted' && (
        <div className="mx-4 mt-2 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                🔔 Real-time Gate Notifications are Disabled
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Please allow notification permissions to instantly receive and approve/reject visitor requests at the gate, even when the app is closed!
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestPermission}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-extrabold uppercase tracking-wider px-4 py-2 rounded-xl transition shadow active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            Enable Notifications
          </button>
        </div>
      )}
      
      {/* Top Header Bar & Identity Card matching the reference image exactly */}
      {activeSubSection === null && (
        <div className="p-4 pt-6 pb-2 text-left space-y-5">
          {/* Integrated Premium Hero Cover Card mimicking the reference image precisely */}
          <div className="relative overflow-hidden w-full rounded-[36px] min-h-[300px] text-white border border-[#242A66]/30 shadow-2xl flex flex-col justify-between p-6 max-w-lg mx-auto">
            {/* Real photography background of the luxury high-rise Orchid Heights complex */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
              <img 
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80" 
                alt="Orchid Heights Luxury Building" 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {/* Elegant dual-tone dark gradient overlay for text readability and premium tone */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-900/80 to-slate-950/95" />
            </div>

            {/* Top Interactive Row inside the Banner */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow bg-white/95 p-0.5 shrink-0">
                  <img 
                    src="https://i.ibb.co/zT5tpcdY/1000296229-1.png" 
                    alt="Orchid Heights Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h1 className="font-sans font-black text-white text-base leading-tight uppercase tracking-tight shadow-sm">
                    Orchid Heights
                  </h1>
                  <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest font-sans">
                    Owners Association • ઓર્કીડ સોસાયટી
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Hold to SOS Button */}
                <button
                  onMouseDown={startSosHold}
                  onMouseUp={cancelSosHold}
                  onMouseLeave={cancelSosHold}
                  onTouchStart={startSosHold}
                  onTouchEnd={cancelSosHold}
                  onTouchCancel={cancelSosHold}
                  className="relative w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-sans font-black text-[10px] tracking-wider flex items-center justify-center shadow-lg transition-all transform active:scale-95 cursor-pointer overflow-hidden select-none"
                  title="Hold for 5 seconds to broadcast SOS alarm"
                >
                  {isHoldingSos && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-red-900 transition-all duration-75"
                      style={{ height: `${sosHoldProgress}%`, opacity: 0.8 }}
                    />
                  )}
                  <span className="relative z-10 font-black">
                    {isHoldingSos ? `${Math.ceil((5000 - (sosHoldProgress / 100) * 5000) / 1000)}s` : 'SOS'}
                  </span>
                </button>

                {/* Notification bell with badge */}
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="relative p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer shadow-sm border border-white/10 backdrop-blur-md"
                  title="Open Notifications Panel"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {(societyNotifications.filter((n) => !dismissedNotifIds.includes(n.id)).length + activeSosAlerts.length) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#7C3AED] text-white text-[8px] font-black rounded-full flex items-center justify-center shadow animate-bounce">
                      {societyNotifications.filter((n) => !dismissedNotifIds.includes(n.id)).length + activeSosAlerts.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Resident Identity Info Section inside the Banner */}
            <div className="relative z-10 flex flex-col items-center text-center mt-6 mb-2">
              {/* Initials Avatar Badge centered */}
              <div className="w-14 h-14 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm flex items-center justify-center text-white font-sans font-medium text-xl select-none mb-3 shadow-inner">
                {firstName.substring(0, 2).toUpperCase()}
              </div>

              {/* Blue-violet Role Pill */}
              <div className="inline-flex items-center bg-[#7C3AED]/30 border border-[#7C3AED]/50 px-4.5 py-1 rounded-full mb-2.5 shadow-sm select-none">
                <span className="text-[#C7D2FE] text-[9px] font-sans font-bold uppercase tracking-widest">
                  FLAT {wing}-{flatNo} RESIDENT OWNER
                </span>
              </div>

              {/* Bold Upper-case Name */}
              <h3 className="text-white font-sans font-black text-lg sm:text-xl tracking-wide uppercase leading-tight max-w-[90%]">
                {fullName}
              </h3>

              {/* Gujarati Subtitle translation */}
              {nameGu && (
                <p className="text-[#94A3B8] text-[11px] sm:text-xs font-semibold tracking-wide mt-1 font-sans">
                  {nameGu}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Main Routing --- */}
      {activeMainTab === 'community' ? (
        activeSubSection === null ? (
          /* 6-Tile Bento Grid Dashboard matching the reference image layout */
          <div className="space-y-6">
            
            {/* Active SOS Alerts Emergency Panel */}
            {activeSosAlerts.length > 0 && (
              <div className="bg-red-600 text-white p-5 rounded-3xl space-y-3 shadow-lg animate-pulse border-2 border-red-400 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 animate-bounce shrink-0" />
                    <h4 className="font-sans font-black text-sm uppercase tracking-wider">🚨 ACTIVE SOCIETY EMERGENCY (SOS)!</h4>
                  </div>
                  <button
                    onClick={() => stopHighFrequencyAlarm()}
                    className="bg-white/20 hover:bg-white/30 text-white font-sans font-extrabold px-3 py-1 rounded-xl text-[10px] uppercase select-none transition cursor-pointer"
                  >
                    Mute Sound
                  </button>
                </div>
                
                <div className="space-y-2.5">
                  {activeSosAlerts.map((sos) => {
                    const isMySos = sos.flatId === `${wing}-${flatNo}`;
                    return (
                      <div key={sos.id} className="bg-black/20 p-3 rounded-2xl flex items-center justify-between text-xs font-semibold">
                        <div className="pr-2">
                          <p className="text-white font-bold leading-normal">
                            <span className="underline font-black">{sos.triggeredBy}</span> of Flat <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono font-black">{sos.flatId}</span> is requesting immediate assistance!
                          </p>
                          <p className="text-[10px] text-white/75 mt-0.5 font-mono">
                            Triggered: {new Date(sos.triggeredAt).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {isMySos ? (
                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to resolve and clear your SOS emergency alert?")) {
                                try {
                                  await updateDoc(doc(db, 'sos_alerts', sos.id), { status: 'resolved' });
                                } catch (e) {
                                  console.error('Failed to resolve SOS:', e);
                                }
                              }
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all select-none shrink-0"
                          >
                            I'm Safe
                          </button>
                        ) : (
                          <a
                            href="tel:+919999900000"
                            className="bg-white text-red-600 hover:bg-red-50 font-sans font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all select-none shrink-0 text-center"
                          >
                            Call Guard
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Active visitor alarm ringing banner */}
            {isAlarmActive && (
              <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between animate-pulse shadow-md">
                <p className="text-xs font-bold">🚨 ACTIVE VISITOR AWAITING ENTRY APPROVAL!</p>
                <button
                  onClick={() => stopHighFrequencyAlarm()}
                  className="bg-white text-red-600 font-black px-4 py-1.5 rounded-xl text-[10px]"
                >
                  Silence Alarm
                </button>
              </div>
            )}

            {/* Quick alert bar for waiting visitors */}
            {activePoll.length > 0 && (
              <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl flex items-center justify-between font-bold text-xs shadow-sm border border-amber-400">
                <p>🚪 {activePoll.length} visitor(s) are waiting at the main security gate right now!</p>
                <button
                  onClick={() => setActiveSubSection('visitors')}
                  className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider"
                >
                  Approve Entry
                </button>
              </div>
            )}

            {/* Grid of blocks formatted in responsive columns */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              
              {/* Block 1: Gate Visitors */}
              <div
                id="block-visitors"
                onClick={() => {
                  setLastVisitedSubSection('visitors');
                  setActiveSubSection('visitors');
                }}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group ${
                  highlightBlock === 'visitors' ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/20 border-indigo-300' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Users className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
                <div className="mt-4">
                  <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                    Gate Visitors
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                    Manage Guest Entries
                  </p>
                </div>
              </div>

              {/* Block 2: Complaint Box */}
              <div
                id="block-complaints"
                onClick={() => {
                  setLastVisitedSubSection('complaints');
                  setActiveSubSection('complaints');
                }}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group ${
                  highlightBlock === 'complaints' ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/20 border-indigo-300' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-full bg-[#EC4899] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
                <div className="mt-4">
                  <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                    Complaint Box
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                    Raise & Resolve Issues
                  </p>
                </div>
              </div>

              {/* Block 3: Resident Directory */}
              <div
                id="block-directory"
                onClick={() => {
                  setLastVisitedSubSection('directory');
                  setActiveSubSection('directory');
                }}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group ${
                  highlightBlock === 'directory' ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/20 border-indigo-300' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
                <div className="mt-4">
                  <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                    Resident Directory
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                    Look up Neighbours
                  </p>
                </div>
              </div>

              {/* Block 4: Amenities Bookings */}
              <div
                id="block-amenity"
                onClick={() => {
                  setLastVisitedSubSection('amenity');
                  setActiveSubSection('amenity');
                }}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group ${
                  highlightBlock === 'amenity' ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/20 border-indigo-300' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
                <div className="mt-4">
                  <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                    Amenities Bookings
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                    View Building Amenities
                  </p>
                </div>
              </div>

              {/* Block 5: Local Services */}
              <div
                id="block-services"
                onClick={() => {
                  setLastVisitedSubSection('services');
                  setActiveSubSection('services');
                }}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group ${
                  highlightBlock === 'services' ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/20 border-indigo-300' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-full bg-[#DB2777] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
                <div className="mt-4">
                  <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                    Local Services
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                    Contacts for House Help etc.
                  </p>
                </div>
              </div>

              {/* Block 6: Help & Financial */}
              <div
                id="block-helpdesk"
                onClick={() => {
                  setLastVisitedSubSection('helpdesk');
                  setActiveSubSection('helpdesk');
                }}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group ${
                  highlightBlock === 'helpdesk' ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/20 border-indigo-300' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
                <div className="mt-4">
                  <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                    Help & Financial
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                    Raise Issues, Society Ledger
                  </p>
                </div>
              </div>

              {/* Block 8: Society Alerts & Logs (Dedicated Notifications Block - 2-week history) */}
              <div
                id="block-notifications"
                onClick={() => {
                  setLastVisitedSubSection('notifications');
                  setActiveSubSection('notifications');
                }}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group ${
                  highlightBlock === 'notifications' ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/20 border-indigo-300' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-sm relative">
                    <Bell className="w-5 h-5" />
                    {societyNotifications.filter((n) => !dismissedNotifIds.includes(n.id)).length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
                </div>
                <div className="mt-4">
                  <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                    Society Alerts & Logs
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                    2-Week Notification History
                  </p>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* Sub-section Detail Screen Pane with BACK button */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveSubSection(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer select-none border border-slate-200 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Orchid Heights</span>
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-xs flex items-center justify-center bg-white p-0.5">
                  <img 
                    src="https://i.ibb.co/zT5tpcdY/1000296229-1.png" 
                    alt="Orchid Heights Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>

            {activeSubSection === 'visitors' && (
              <VisitorsSection
                wing={wing}
                flatNo={flatNo}
                activePoll={activePoll}
                guestHistory={guestHistory}
                loadingHistory={loadingHistory}
                rejectingId={rejectingId}
                setRejectingId={setRejectingId}
                rejectReasonText={rejectReasonText}
                setRejectReasonText={setRejectReasonText}
                handleRespond={handleRespond}
                handleDeleteHistoryRecord={handleDeleteHistoryRecord}
                handleDownloadVisitorReport={handleDownloadVisitorReport}
                isAlarmActive={isAlarmActive}
                stopAlarm={stopHighFrequencyAlarm}
              />
            )}

            {activeSubSection === 'directory' && (
              <DirectorySection
                owners={owners}
                session={session}
                directorySearch={directorySearch}
                setDirectorySearch={setDirectorySearch}
                dailyHelpers={dailyHelpers}
                absenceLogs={absenceLogs}
              />
            )}

            {activeSubSection === 'amenity' && (
              <AmenitiesSection
                wing={wing}
                flatNo={flatNo}
                amenityBookings={amenityBookings}
                gymTheatreLogs={gymTheatreLogs}
                handleAddAmenityBooking={handleAddAmenityBooking}
                handleVoteAmenityBooking={handleVoteAmenityBooking}
                handleCheckInGymTheatre={handleCheckInGymTheatre}
                handleCheckOutGymTheatreFlow={handleCheckOutGymTheatreFlow}
                showExitPhotoModal={showExitPhotoModal}
                setShowExitPhotoModal={setShowExitPhotoModal}
                exitPhotoBase64={exitPhotoBase64}
                handleExitPhotoChange={handleExitPhotoChange}
                handleConfirmCheckOut={handleConfirmCheckOut}
                exitPhotoTimeError={exitPhotoTimeError}
                gymTheatreSuccess={gymTheatreSuccess}
                gymTheatreError={gymTheatreError}
                amenityBookingSuccess={amenityBookingSuccess}
                amenityBookingError={amenityBookingError}
                fPropertyName={fPropertyName}
                setFPropertyName={setFPropertyName}
                fDateFrom={fDateFrom}
                setFDateFrom={setFDateFrom}
                fDateTo={fDateTo}
                setFDateTo={setFDateTo}
                fReason={fReason}
                setFReason={setFReason}
                fStuffNeeded={fStuffNeeded}
                setFStuffNeeded={setFStuffNeeded}
                fParkingRequest={fParkingRequest}
                setFParkingRequest={setFParkingRequest}
                activeCheckInLog={activeCheckInLog}
                role={session.role}
              />
            )}

            {activeSubSection === 'services' && (
              <LocalServicesSection
                wing={wing}
                flatNo={flatNo}
                dailyHelpers={dailyHelpers}
                handleToggleHelperMapping={handleToggleHelperMapping}
                essentialContacts={essentialContacts}
              />
            )}

            {activeSubSection === 'helpdesk' && (
              <HelpDeskSection
                wing={wing}
                flatNo={flatNo}
                complaints={complaints}
                loadingComplaints={loadingComplaints}
                financials={financials}
                loadingFinancials={loadingFinancials}
                onRefreshComplaints={fetchComplaints}
                announcements={announcements}
                viewMode="helpdesk"
                compTitle={compTitle}
                setCompTitle={setCompTitle}
                compDesc={compDesc}
                setCompDesc={setCompDesc}
                compMedia={compMedia}
                setCompMedia={setCompMedia}
                compMediaName={compMediaName}
                setCompMediaName={setCompMediaName}
                compMediaType={compMediaType}
                setCompMediaType={setCompMediaType}
                compSuccess={compSuccess}
                setCompSuccess={setCompSuccess}
                compError={compError}
                setCompError={setCompError}
                handleFileChange={handleFileChange}
              />
            )}

            {activeSubSection === 'complaints' && (
              <HelpDeskSection
                wing={wing}
                flatNo={flatNo}
                complaints={complaints}
                loadingComplaints={loadingComplaints}
                financials={financials}
                loadingFinancials={loadingFinancials}
                onRefreshComplaints={fetchComplaints}
                announcements={announcements}
                viewMode="complaints"
                compTitle={compTitle}
                setCompTitle={setCompTitle}
                compDesc={compDesc}
                setCompDesc={setCompDesc}
                compMedia={compMedia}
                setCompMedia={setCompMedia}
                compMediaName={compMediaName}
                setCompMediaName={setCompMediaName}
                compMediaType={compMediaType}
                setCompMediaType={setCompMediaType}
                compSuccess={compSuccess}
                setCompSuccess={setCompSuccess}
                compError={compError}
                setCompError={setCompError}
                handleFileChange={handleFileChange}
              />
            )}

            {activeSubSection === 'notifications' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-mono">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Society Alert Center
                  </span>
                  <span className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold">
                    14-Day Limit History
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-black text-slate-800 text-base">Alerts & Logs</h3>
                  <p className="text-[10.5px] text-slate-400 font-medium leading-normal font-sans">
                    Real-time safety broadcasts, visitor check-ins, scheduled movie reminders, and complaint updates.
                  </p>
                </div>

                {(() => {
                  const twoWeeksAgo = new Date();
                  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

                  const filteredNotifs = societyNotifications.filter((n) => {
                    const notifTime = n.timestamp ? new Date(n.timestamp).getTime() : Date.now();
                    return notifTime >= twoWeeksAgo.getTime();
                  });

                  if (filteredNotifs.length === 0) {
                    return (
                      <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 bg-slate-50/20">
                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2 animate-pulse" />
                        <p className="text-xs font-bold text-slate-500">No notifications registered in the last 14 days.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredNotifs.map((notif) => {
                        const isDismissed = dismissedNotifIds.includes(notif.id);
                        
                        // Determine background, border, text and badge colors based on notification type and status
                        let colorClasses = 'bg-slate-50/70 border-slate-200 text-slate-500';
                        let badgeText = 'Alert';
                        let badgeColor = 'bg-slate-100 text-slate-600';

                        if (!isDismissed) {
                          switch (notif.type) {
                            case 'notice':
                              colorClasses = 'bg-blue-50/40 border-blue-100 text-slate-800 ring-1 ring-blue-50/30';
                              badgeText = 'Notice';
                              badgeColor = 'bg-blue-100 text-blue-700 font-bold';
                              break;
                            case 'financial':
                              colorClasses = 'bg-emerald-50/40 border-emerald-100 text-slate-800 ring-1 ring-emerald-50/30';
                              badgeText = 'Financial';
                              badgeColor = 'bg-emerald-100 text-emerald-700 font-bold';
                              break;
                            case 'complaint':
                              colorClasses = 'bg-rose-50/40 border-rose-100 text-slate-800 ring-1 ring-rose-50/30';
                              badgeText = 'Complaint';
                              badgeColor = 'bg-rose-100 text-rose-700 font-bold';
                              break;
                            case 'movie_schedule':
                              colorClasses = 'bg-purple-50/40 border-purple-100 text-slate-800 ring-1 ring-purple-50/30';
                              badgeText = 'Theatre';
                              badgeColor = 'bg-purple-100 text-purple-700 font-bold';
                              break;
                            case 'visitor':
                              const status = notif.status || notif.metadata?.status || 'pending';
                              if (status === 'approved') {
                                colorClasses = 'bg-emerald-50/60 border-emerald-200 text-slate-800 ring-1 ring-emerald-50 shadow-xs';
                                badgeText = 'Visitor (Approved)';
                                badgeColor = 'bg-emerald-100 text-emerald-800 font-bold';
                              } else if (status === 'rejected') {
                                colorClasses = 'bg-rose-50/60 border-rose-200 text-slate-800 ring-1 ring-rose-50 shadow-xs';
                                badgeText = 'Visitor (Rejected)';
                                badgeColor = 'bg-rose-100 text-rose-800 font-bold';
                              } else {
                                colorClasses = 'bg-amber-50/60 border-amber-200 text-slate-800 ring-1 ring-amber-50 shadow-xs';
                                badgeText = 'Visitor (Pending)';
                                badgeColor = 'bg-amber-100 text-amber-800 font-bold';
                              }
                              break;
                            default:
                              colorClasses = 'bg-white border-slate-200 text-slate-800';
                              badgeText = 'System';
                              badgeColor = 'bg-slate-100 text-slate-700';
                          }
                        }

                        return (
                          <div 
                            key={notif.id} 
                            className={`p-4 rounded-2xl border transition flex items-start gap-3 justify-between ${colorClasses}`}
                          >
                            <div className="space-y-1.5 text-left min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-xs uppercase tracking-tight">
                                  {notif.title}
                                </span>
                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>
                                  {badgeText}
                                </span>
                                {!isDismissed && (
                                  <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0" />
                                )}
                              </div>
                              <p className="text-[11.5px] leading-relaxed font-medium font-sans">
                                {notif.message}
                              </p>

                              {/* Display visitor photo if present in metadata */}
                              {notif.type === 'visitor' && notif.metadata?.photoUrl && (
                                <div className="mt-2 flex items-center gap-3 bg-white/60 p-2 rounded-xl border border-slate-100 max-w-sm">
                                  <img 
                                    src={notif.metadata.photoUrl} 
                                    alt="Visitor Photo" 
                                    className="w-10 h-10 rounded-lg object-cover border bg-slate-100 shrink-0" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="text-[10px]">
                                    <p className="font-bold text-slate-800 uppercase">{notif.metadata.fullName}</p>
                                    <p className="text-slate-500 font-mono">{notif.metadata.mobileNumber} • {notif.metadata.visitorCount || 1} guest(s)</p>
                                  </div>
                                </div>
                              )}

                              <p className="text-[9px] text-slate-400 font-mono mt-1">
                                {new Date(notif.timestamp).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {notif.type === 'movie_schedule' && (
                                <button
                                  onClick={() => {
                                    setLastVisitedSubSection('amenity');
                                    setActiveSubSection('amenity');
                                    localStorage.setItem('orchid_deep_redirect', 'movies');
                                    setTimeout(() => {
                                      window.dispatchEvent(new Event('orchid_amenities_redirect'));
                                    }, 100);
                                  }}
                                  className="text-[9px] font-black uppercase tracking-tight bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-lg cursor-pointer animate-pulse"
                                >
                                  Open Movies
                                </button>
                              )}

                              {notif.type === 'complaint' && (
                                <button
                                  onClick={() => {
                                    setLastVisitedSubSection('complaints');
                                    setActiveSubSection('complaints');
                                  }}
                                  className="text-[9px] font-black uppercase tracking-tight bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-100 px-2 py-1 rounded-lg cursor-pointer"
                                >
                                  Open Ticket
                                </button>
                              )}

                              {!isDismissed ? (
                                <button
                                  onClick={() => handleDismissNotification(notif.id)}
                                  className="text-[9px] font-black uppercase tracking-tight bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              ) : (
                                <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">
                                  Archived
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )
      ) : (
        /* Master "You" Profile Section */
        <ProfileSection
          wing={wing}
          flatNo={flatNo}
          myOwnerData={myOwnerData || null}
          savingSettings={savingSettings}
          settingsSuccess={settingsSuccess}
          settingsError={settingsError}
          newMember={newMember}
          setNewMember={setNewMember}
          newMemberPhone={newMemberPhone}
          setNewMemberPhone={setNewMemberPhone}
          handleAddMember={handleAddMember}
          handleRemoveMember={handleRemoveMember}
          vType={vType}
          setVType={setVType}
          vPlate={vPlate}
          setVPlate={setVPlate}
          vModel={vModel}
          setVModel={setVModel}
          vParkingPlot={vParkingPlot}
          setVParkingPlot={setVParkingPlot}
          handleAddVehicle={handleAddVehicle}
          handleRemoveVehicle={handleRemoveVehicle}
          altContact={altContact}
          setAltContact={setAltContact}
          showPass={showPass}
          setShowPass={setShowPass}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          handleSaveGeneral={handleSaveGeneral}
          absenceLogs={absenceLogs}
          dailyHelpers={dailyHelpers}
          absDateFrom={absDateFrom}
          setAbsDateFrom={setAbsDateFrom}
          absDateTo={absDateTo}
          setAbsDateTo={setAbsDateTo}
          absMilkRedirect={absMilkRedirect}
          setAbsMilkRedirect={setAbsMilkRedirect}
          absNewspaperRedirect={absNewspaperRedirect}
          setAbsNewspaperRedirect={setAbsNewspaperRedirect}
          absParcelRedirect={absParcelRedirect}
          setAbsParcelRedirect={setAbsParcelRedirect}
          absenceSuccess={absenceSuccess}
          absenceError={absenceError}
          handleSaveAbsence={handleSaveAbsence}
          handleCancelAbsence={handleCancelAbsence}
        />
      )}

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 py-3.5 px-6 flex items-center justify-around z-40 shadow-xl max-w-md mx-auto rounded-t-3xl">
        <button
          onClick={() => {
            setActiveMainTab('community');
            setActiveSubSection(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition select-none ${
            activeMainTab === 'community' ? 'text-indigo-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="w-5.5 h-5.5" />
          <span className="text-[10px] uppercase tracking-wider font-bold">Community</span>
        </button>

        <button
          onClick={() => {
            setActiveMainTab('personal');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition select-none ${
            activeMainTab === 'personal' ? 'text-indigo-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5.5 h-5.5" />
          <span className="text-[10px] uppercase tracking-wider font-bold">You (Profile)</span>
        </button>
      </div>

      {/* Notifications Modal Center Overlay */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setIsNotificationsOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h3 className="font-sans font-black text-base text-slate-800 uppercase tracking-tight">Notification Center</h3>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of active items */}
            <div className="p-5 overflow-y-auto space-y-4">
              {activeSosAlerts.length === 0 && activePoll.length === 0 && announcements.length === 0 && activeSocietyNotifs.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">All caught up! No active alerts or notifications.</p>
                </div>
              ) : (
                <>
                  {/* Active SOS emergencies */}
                  {activeSosAlerts.map((sos) => (
                    <div key={sos.id} className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start space-x-3 text-left">
                      <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1 w-full">
                        <p className="text-xs font-black text-red-700 uppercase tracking-wider">
                          🚨 ACTIVE EMERGENCY SOS
                        </p>
                        <p className="text-xs text-slate-600 leading-normal">
                          <span className="font-bold text-red-700">{sos.triggeredBy}</span> of Flat <span className="font-mono bg-red-100 text-red-800 px-1 py-0.5 rounded text-[10px] font-bold">{sos.flatId}</span> has triggered an EMERGENCY SOS alert!
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Triggered: {new Date(sos.triggeredAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Active Gate Visitor Approval Requests */}
                  {activePoll.map((visitor) => (
                    <div key={visitor.id} className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3 text-left">
                      <Users className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-2.5 w-full">
                        <div>
                          <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
                            🚪 Gate Visitor Entry Request
                          </p>
                          <p className="text-xs text-slate-600 leading-normal mt-0.5">
                            <span className="font-bold text-slate-900">{visitor.fullName}</span> ({visitor.guestType}) is waiting at the main society gate.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            setActiveSubSection('visitors');
                          }}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-white font-sans font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition select-none"
                        >
                          Review Request Detail
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Real-time Society Notifications */}
                  {activeSocietyNotifs.map((notif) => {
                    const iconColorClass = 
                      notif.type === 'visitor' ? 'text-amber-500 bg-amber-50' :
                      notif.type === 'financial' ? 'text-emerald-500 bg-emerald-50' :
                      notif.type === 'complaint' ? 'text-rose-500 bg-rose-50' :
                      notif.type === 'amenity_request' ? 'text-purple-500 bg-purple-50' :
                      notif.type === 'movie_schedule' ? 'text-indigo-500 bg-indigo-50' :
                      'text-blue-500 bg-blue-50';
                    return (
                      <div key={notif.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start space-x-3 text-left relative group">
                        <div className="flex-1 flex items-start space-x-3">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold ${iconColorClass}`}>
                            {notif.type === 'visitor' && <Users className="w-4 h-4" />}
                            {notif.type === 'financial' && <FileText className="w-4 h-4" />}
                            {notif.type === 'complaint' && <AlertCircle className="w-4 h-4" />}
                            {notif.type === 'amenity_request' && <Calendar className="w-4 h-4" />}
                            {notif.type === 'movie_schedule' && <Film className="w-4 h-4" />}
                            {notif.type === 'notice' && <Megaphone className="w-4 h-4" />}
                          </span>
                          <div className="space-y-1 w-full pr-6">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {new Date(notif.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDismissNotification(notif.id)}
                          className="absolute top-3 right-3 p-1 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer select-none"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Recent Society Announcements */}
                  {announcements.slice(0, 5).map((notice) => {
                    const noticeTitle = notice.title || notice.text?.slice(0, 40) || 'Society Notice';
                    const noticeMessage = notice.message || notice.content || notice.text || '';
                    const noticeDate = notice.createdAt || notice.timestamp || new Date().toISOString();
                    return (
                      <div key={notice.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start space-x-3 text-left">
                        <Megaphone className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="space-y-1 w-full">
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            📢 NOTICE: {noticeTitle}
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mt-0.5 whitespace-pre-line">
                            {noticeMessage}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Posted: {new Date(noticeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-indigo-600 hover:text-indigo-700 font-sans font-extrabold text-xs uppercase tracking-wider transition cursor-pointer select-none"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
