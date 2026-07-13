/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Key, Edit3, Trash2, Database, AlertTriangle, ShieldCheck, Check, 
  RefreshCw, X, Search, Phone, Megaphone, Plus, Smartphone, FileText, 
  ClipboardList, BookOpen, Eye, EyeOff, Upload, Download, Image, User, 
  LogOut, Mail, Clock, ShieldAlert, FileSpreadsheet, Dumbbell, Sparkles, Film, CheckSquare, Calendar
} from 'lucide-react';
import { FlatOwner, Announcement, Complaint, FinancialReport, EssentialContact, Visitor, AmenityBooking, GymTheatreLog } from '../types';
import { api } from '../lib/api';
import { db, collection, doc, query, onSnapshot, orderBy, updateDoc, deleteDoc } from '../lib/firebase';

interface AdminDashboardProps {
  owners: FlatOwner[];
  onRefreshOwners: () => void;
  onLogoutAdmin?: () => void;
}

type AdminTab = 'flats' | 'notices' | 'complaints' | 'finance' | 'address-book' | 'system' | 'amenities';

export default function AdminDashboard({ owners, onRefreshOwners, onLogoutAdmin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('flats');
  
  // Amenities Master State
  const [amenityBookings, setAmenityBookings] = useState<AmenityBooking[]>([]);
  const [gymTheatreLogs, setGymTheatreLogs] = useState<GymTheatreLog[]>([]);
  const [moviesSchedule, setMoviesSchedule] = useState<any[]>([]);

  // Listen to amenities real-time updates in admin panel
  useEffect(() => {
    const qBookings = query(collection(db, 'amenities_bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const list: AmenityBooking[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AmenityBooking);
      });
      setAmenityBookings(list);
    }, (error) => console.error('Admin listening bookings error:', error));

    const qLogs = query(collection(db, 'gym_theatre_logs'), orderBy('createdAt', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const list: GymTheatreLog[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as GymTheatreLog);
      });
      setGymTheatreLogs(list);
    }, (error) => console.error('Admin listening logs error:', error));

    const qMovies = query(collection(db, 'movies_schedule'), orderBy('createdAt', 'desc'));
    const unsubMovies = onSnapshot(qMovies, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMoviesSchedule(list);
    }, (error) => console.error('Admin listening movies error:', error));

    return () => {
      unsubBookings();
      unsubLogs();
      unsubMovies();
    };
  }, []);

  // Master lists
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [financialReports, setFinancialReports] = useState<FinancialReport[]>([]);
  const [contacts, setContacts] = useState<EssentialContact[]>([]);
  const [flatPasswords, setFlatPasswords] = useState<Record<string, string>>({});
  
  // Loading states
  const [loading, setLoading] = useState<boolean>(false);
  const [passwordsVisible, setPasswordsVisible] = useState<Record<string, boolean>>({});

  // Search through all owners
  const [adminSearch, setAdminSearch] = useState<string>('');

  // Selected Flat for detailed review
  const [selectedFlat, setSelectedFlat] = useState<FlatOwner | null>(null);
  const [selectedFlatVisitors, setSelectedFlatVisitors] = useState<Visitor[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState<boolean>(false);

  // Keep selectedFlat in sync with master owners list when it is refreshed
  useEffect(() => {
    if (selectedFlat) {
      const fresh = owners.find((o) => o.wing === selectedFlat.wing && o.flatNo === selectedFlat.flatNo);
      if (fresh) {
        setSelectedFlat(fresh);
      }
    }
  }, [owners]);

  // Admin CRUD for Members and Vehicles
  const [adminNewMember, setAdminNewMember] = useState<string>('');
  const [adminNewMemberPhone, setAdminNewMemberPhone] = useState<string>('');
  const [adminNewVehicleType, setAdminNewVehicleType] = useState<'twowheeler' | 'fourwheeler'>('fourwheeler');
  const [adminNewVehiclePlate, setAdminNewVehiclePlate] = useState<string>('');
  const [adminNewVehicleModel, setAdminNewVehicleModel] = useState<string>('');
  const [adminNewVehicleParking, setAdminNewVehicleParking] = useState<string>('');

  // --- CRUD States ---
  
  // 1. Notice / Announcement State
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showNoticeForm, setShowNoticeForm] = useState<boolean>(false);
  const [noticeTarget, setNoticeTarget] = useState<'all' | 'wing' | 'flat'>('all');
  const [noticeWing, setNoticeWing] = useState<'A' | 'B'>('A');
  const [noticeFlatNo, setNoticeFlatNo] = useState<number>(101);
  const [noticeText, setNoticeText] = useState<string>('');
  const [noticeImage, setNoticeImage] = useState<string>('');
  const [noticeVideo, setNoticeVideo] = useState<string>('');
  const [noticePdfUrl, setNoticePdfUrl] = useState<string>('');
  const [noticeFileName, setNoticeFileName] = useState<string>('');
  const [noticeFileType, setNoticeFileType] = useState<string>('');
  const [noticeAttachments, setNoticeAttachments] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [isDraggingNotice, setIsDraggingNotice] = useState<boolean>(false);
  const [noticeSuccess, setNoticeSuccess] = useState<string>('');

  // 2. Complaint State
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [complaintSuccess, setComplaintSuccess] = useState<string>('');

  // 3. Financial Ledger State
  const [showFinanceForm, setShowFinanceForm] = useState<boolean>(false);
  const [editingFinance, setEditingFinance] = useState<FinancialReport | null>(null);
  const [finMonth, setFinMonth] = useState<string>('July');
  const [finYear, setFinYear] = useState<number>(2026);
  const [finTitle, setFinTitle] = useState<string>('');
  const [finDesc, setFinDesc] = useState<string>('');
  const [finPdfUrl, setFinPdfUrl] = useState<string>('');
  const [finFileName, setFinFileName] = useState<string>('');
  const [finFileType, setFinFileType] = useState<string>('');
  const [finAttachments, setFinAttachments] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [finExpense, setFinExpense] = useState<string>('');
  const [finSuccess, setFinSuccess] = useState<string>('');
  const [finType, setFinType] = useState<'expense' | 'welfare' | 'statement' | 'other'>('expense');
  const [isDraggingFin, setIsDraggingFin] = useState<boolean>(false);
  
  // CSV Import State
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [csvError, setCsvError] = useState<string>('');
  const [csvImportedCount, setCsvImportedCount] = useState<number>(0);

  // 4. Address Book Contact State
  const [editingContact, setEditingContact] = useState<EssentialContact | null>(null);
  const [showContactForm, setShowContactForm] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('');
  const [contactCategory, setContactCategory] = useState<'Plumber' | 'Electrician' | 'Security' | 'Manager' | 'Gardener' | 'Other'>('Plumber');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactAltPhone, setContactAltPhone] = useState<string>('');
  const [contactSuccess, setContactSuccess] = useState<string>('');

  // 5. System Utilities State
  const [selectedWing, setSelectedWing] = useState<'A' | 'B'>('A');
  const [selectedFlatNo, setSelectedFlatNo] = useState<number>(101);
  const [newPassword, setNewPassword] = useState<string>('');
  const [passSuccess, setPassSuccess] = useState<string>('');
  const [passError, setPassError] = useState<string>('');
  const [passLoading, setPassLoading] = useState<boolean>(false);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // Inline Owner Edit State
  const [editOwner, setEditOwner] = useState<FlatOwner | null>(null);
  const [editNameEn, setEditNameEn] = useState<string>('');
  const [editNameGu, setEditNameGu] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editSecondary, setEditSecondary] = useState<string>('');
  const [editNotificationsEnabled, setEditNotificationsEnabled] = useState<boolean>(true);
  const [editError, setEditError] = useState<string>('');
  const [editSuccess, setEditSuccess] = useState<string>('');
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Load Admin Data on tab changes or updates
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [annList, compList, finList, contList, passMap] = await Promise.all([
        api.getAllAnnouncements(),
        api.getComplaints(),
        api.getFinancialReports(),
        api.getEssentialContacts(),
        api.getFlatPasswords()
      ]);
      
      if (Array.isArray(annList)) setAnnouncements(annList);
      if (Array.isArray(compList)) setComplaints(compList);
      if (Array.isArray(finList)) setFinancialReports(finList);
      if (Array.isArray(contList)) setContacts(contList);
      if (passMap) setFlatPasswords(passMap);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Fetch detailed visitor history for a flat (including resident-deleted logs)
  const viewFlatDetails = async (owner: FlatOwner) => {
    setSelectedFlat(owner);
    setLoadingVisitors(true);
    try {
      const list = await api.getVisitors({
        wing: owner.wing,
        flatNo: owner.flatNo,
        includeDeleted: true
      });
      setSelectedFlatVisitors(list);
    } catch (e) {
      console.error('Error fetching flat visitor history:', e);
    } finally {
      setLoadingVisitors(false);
    }
  };

  // Generate lists of flats sequentially
  const flats: number[] = [];
  for (let floor = 1; floor <= 12; floor++) {
    for (let flatIndex = 1; flatIndex <= 4; flatIndex++) {
      flats.push(floor * 100 + flatIndex);
    }
  }

  // Password Modification for Flat
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (!newPassword.trim()) {
      setPassError('Password cannot be empty.');
      return;
    }
    setPassLoading(true);
    try {
      const data = await api.changePassword({
        wing: selectedWing,
        flatNo: selectedFlatNo,
        newPassword: newPassword.trim()
      });
      if (data.success) {
        setPassSuccess(`Password for Flat ${selectedWing}-${selectedFlatNo} updated to "${newPassword.trim()}"!`);
        setNewPassword('');
        loadAdminData();
      } else {
        setPassError(data.message || 'Failed to update password.');
      }
    } catch (error) {
      setPassError('Connection error.');
    } finally {
      setPassLoading(false);
    }
  };

  // Factory Database Reset
  const handleResetDb = async () => {
    setResetLoading(true);
    setResetSuccess('');
    try {
      const data = await api.resetDb();
      if (data.success) {
        setResetSuccess('System reset completely back to default Excel dataset!');
        setShowConfirmReset(false);
        onRefreshOwners();
        loadAdminData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setResetLoading(false);
    }
  };

  // Inline edit flat owner details
  const handleOpenEditOwner = (owner: FlatOwner) => {
    setEditOwner(owner);
    setEditNameEn(owner.nameEn.toLowerCase().includes('vacant') ? '' : owner.nameEn);
    setEditNameGu(owner.nameGu.toLowerCase().includes('ખાલી') ? '' : owner.nameGu);
    setEditPhone(owner.phone || '');
    setEditSecondary(owner.secondaryContact || '');
    setEditNotificationsEnabled(owner.notificationsEnabled !== false);
    setEditError('');
    setEditSuccess('');
  };

  const handleSaveOwnerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwner) return;
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);
    try {
      const data = await api.updateOwner(editOwner.wing, editOwner.flatNo, {
        nameEn: editNameEn.trim() || `Vacant / Owner Flat ${editOwner.wing}-${editOwner.flatNo}`,
        nameGu: editNameGu.trim() || `ખાલી ફ્લેટ ${editOwner.wing}-${editOwner.flatNo}`,
        phone: editPhone.trim(),
        secondaryContact: editSecondary.trim(),
        notificationsEnabled: editNotificationsEnabled
      });

      if (data.success) {
        setEditSuccess('Flat details saved successfully.');
        setTimeout(() => {
          setEditOwner(null);
        }, 1200);
        onRefreshOwners();
        loadAdminData();
      } else {
        setEditError(data.message || 'Failed to save owner.');
      }
    } catch (error) {
      setEditError('Server connection error.');
    } finally {
      setEditLoading(false);
    }
  };

  // Log out a specific device remotely
  const handleRemoteLogout = async (wing: string, flatNo: number, deviceId: string) => {
    if (!window.confirm(`Deregister and log out device ${deviceId} from Flat ${wing}-${flatNo}?`)) return;
    try {
      const res = await api.deregisterDevice(wing, flatNo, deviceId);
      if (res.success) {
        alert('Device logged out successfully.');
        onRefreshOwners();
        if (selectedFlat && selectedFlat.wing === wing && selectedFlat.flatNo === flatNo) {
          const updatedOwner = owners.find((o) => o.wing === wing && o.flatNo === flatNo);
          if (updatedOwner) {
            setSelectedFlat(updatedOwner);
          }
        }
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Admin-side CRUD for household members
  const handleAddMemberToFlat = async (wing: string, flatNo: number) => {
    if (!adminNewMember.trim()) return;
    const freshOwner = owners.find((o) => o.wing === wing && o.flatNo === flatNo);
    if (!freshOwner) return;

    const memberStr = adminNewMemberPhone.trim()
      ? `${adminNewMember.trim()} (${adminNewMemberPhone.trim()})`
      : adminNewMember.trim();

    const updatedMembers = [...(freshOwner.members || []), memberStr];
    
    try {
      const res = await api.updateOwner(wing, flatNo, { members: updatedMembers });
      if (res.success) {
        setAdminNewMember('');
        setAdminNewMemberPhone('');
        onRefreshOwners();
      } else {
        alert(res.message || 'Failed to add co-resident.');
      }
    } catch (e) {
      alert('Error updating co-residents.');
    }
  };

  const handleDeleteMemberFromFlat = async (wing: string, flatNo: number, indexToDelete: number) => {
    if (!window.confirm('Are you sure you want to delete this family member?')) return;
    const freshOwner = owners.find((o) => o.wing === wing && o.flatNo === flatNo);
    if (!freshOwner) return;

    const updatedMembers = (freshOwner.members || []).filter((_, idx) => idx !== indexToDelete);

    try {
      const res = await api.updateOwner(wing, flatNo, { members: updatedMembers });
      if (res.success) {
        onRefreshOwners();
      } else {
        alert(res.message || 'Failed to remove co-resident.');
      }
    } catch (e) {
      alert('Error deleting co-resident.');
    }
  };

  // Admin-side CRUD for vehicles
  const handleAddVehicleToFlat = async (wing: string, flatNo: number) => {
    if (!adminNewVehiclePlate.trim() || !adminNewVehicleModel.trim()) return;
    const freshOwner = owners.find((o) => o.wing === wing && o.flatNo === flatNo);
    if (!freshOwner) return;

    const newV = {
      id: Math.random().toString(36).substring(2, 9),
      type: adminNewVehicleType,
      plateNumber: adminNewVehiclePlate.trim().toUpperCase(),
      brandModel: adminNewVehicleModel.trim(),
      parkingPlot: adminNewVehicleParking.trim() || undefined
    };

    const updatedVehicles = [...(freshOwner.vehicles || []), newV];

    try {
      const res = await api.updateOwner(wing, flatNo, { vehicles: updatedVehicles });
      if (res.success) {
        setAdminNewVehiclePlate('');
        setAdminNewVehicleModel('');
        setAdminNewVehicleParking('');
        onRefreshOwners();
      } else {
        alert(res.message || 'Failed to add vehicle.');
      }
    } catch (e) {
      alert('Error adding vehicle.');
    }
  };

  const handleDeleteVehicleFromFlat = async (wing: string, flatNo: number, vehicleIdToDelete: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    const freshOwner = owners.find((o) => o.wing === wing && o.flatNo === flatNo);
    if (!freshOwner) return;

    const updatedVehicles = (freshOwner.vehicles || []).filter((v) => v.id !== vehicleIdToDelete);

    try {
      const res = await api.updateOwner(wing, flatNo, { vehicles: updatedVehicles });
      if (res.success) {
        onRefreshOwners();
      } else {
        alert(res.message || 'Failed to remove vehicle.');
      }
    } catch (e) {
      alert('Error deleting vehicle.');
    }
  };

  // Admin override functions for amenities bookings and check-in logs
  const handleAdminApproveAmenityBooking = async (id: string) => {
    const votes = Array.from({ length: 50 }, (_, i) => `A-${101 + i}`);
    try {
      const bookingRef = doc(db, 'amenities_bookings', id);
      await updateDoc(bookingRef, { approvedFlats: votes });
      alert('Booking approved and cleared successfully by Administrator override.');
    } catch (err) {
      alert('Error force-approving booking.');
    }
  };

  const handleAdminDeleteAmenityBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel and delete this function booking?')) return;
    try {
      const bookingRef = doc(db, 'amenities_bookings', id);
      await deleteDoc(bookingRef);
      alert('Booking deleted successfully.');
    } catch (err) {
      alert('Error deleting booking.');
    }
  };

  const handleAdminCheckOutLog = async (logId: string) => {
    if (!window.confirm('Force check-out this resident from the amenity?')) return;
    try {
      const logRef = doc(db, 'gym_theatre_logs', logId);
      const now = new Date().toISOString();
      await updateDoc(logRef, {
        checkOutTime: now,
        durationMinutes: 30,
        exitPhotoUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=150&q=80'
      });
      alert('Resident checked out successfully.');
    } catch (err) {
      alert('Error checking out resident.');
    }
  };

  const handleDownloadGymTheatreLogsCSV = () => {
    if (gymTheatreLogs.length === 0) {
      alert('No gym or movie theatre logs to export.');
      return;
    }
    let csvContent = `Orchid Heights - Gym & Movie Theatre Logs Report\r\n`;
    csvContent += `Generated On,${new Date().toLocaleString('en-IN')}\r\n\r\n`;
    csvContent += `"Flat ID","Amenity","Check-In Time","Check-Out Time","Duration (Mins)","Exit Photo Verification Status"\r\n`;

    gymTheatreLogs.forEach((log) => {
      const inTime = new Date(log.checkInTime).toLocaleString('en-IN');
      const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleString('en-IN') : 'ACTIVE SESSION';
      const duration = log.durationMinutes || 'N/A';
      const photoStatus = log.exitPhotoUrl ? 'Verified' : 'No Photo';
      csvContent += `"${log.flatId}","${log.amenity}","${inTime}","${outTime}","${duration}","${photoStatus}"\r\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Gym_Theatre_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Notice Board: Create or Save notice
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeSuccess('');
    if (!noticeText.trim()) return;

    const annId = editingAnnouncement ? editingAnnouncement.id : 'ann_' + Math.random().toString(36).substring(2, 11);
    const annPayload: Announcement = {
      id: annId,
      target: noticeTarget,
      text: noticeText.trim(),
      timestamp: editingAnnouncement ? editingAnnouncement.timestamp : new Date().toISOString(),
      sender: 'Orchid Heights Administration',
      imageUrl: noticeImage.trim(),
      videoUrl: noticeVideo.trim(),
      pdfUrl: noticePdfUrl,
      fileName: noticeFileName,
      fileType: noticeFileType,
      attachments: noticeAttachments
    };

    if (noticeTarget !== 'all') {
      annPayload.wing = noticeWing;
      if (noticeTarget === 'flat') {
        annPayload.flatNo = noticeFlatNo;
      }
    }

    const success = await api.saveAnnouncement(annPayload);
    if (success) {
      if (!editingAnnouncement) {
        await api.createSocietyNotification({
          type: 'notice',
          title: '📢 New Society Notice Posted',
          message: noticeText.trim().substring(0, 80) + (noticeText.trim().length > 80 ? '...' : ''),
          wing: noticeTarget !== 'all' ? noticeWing : undefined,
          flatNo: noticeTarget === 'flat' ? noticeFlatNo : undefined,
          metadata: { announcementId: annId }
        });
      }
      setNoticeSuccess(editingAnnouncement ? 'Notice updated successfully!' : 'Notice published and broadcasted successfully!');
      setNoticeText('');
      setNoticeImage('');
      setNoticeVideo('');
      setNoticePdfUrl('');
      setNoticeFileName('');
      setNoticeFileType('');
      setNoticeAttachments([]);
      setEditingAnnouncement(null);
      setShowNoticeForm(false);
      loadAdminData();
      setTimeout(() => setNoticeSuccess(''), 3000);
    } else {
      alert('Failed to publish notice.');
    }
  };

  const handleEditNotice = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setNoticeTarget(ann.target);
    setNoticeWing(ann.wing || 'A');
    setNoticeFlatNo(ann.flatNo || 101);
    setNoticeText(ann.text);
    setNoticeImage(ann.imageUrl || '');
    setNoticeVideo(ann.videoUrl || '');
    setNoticePdfUrl(ann.pdfUrl || '');
    setNoticeFileName(ann.fileName || '');
    setNoticeFileType(ann.fileType || '');
    const initialAttachments = [...(ann.attachments || [])];
    if (ann.pdfUrl && !initialAttachments.some(att => att.url === ann.pdfUrl)) {
      initialAttachments.push({ url: ann.pdfUrl, name: ann.fileName || 'Attachment.pdf', type: ann.fileType || 'application/pdf' });
    }
    setNoticeAttachments(initialAttachments);
    setShowNoticeForm(true);
  };

  const addNoticeAttachment = (file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('File too large (max 15MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setNoticeAttachments(prev => [
          ...prev,
          {
            url: e.target!.result as string,
            name: file.name,
            type: file.type
          }
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  const addFinAttachment = (file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('File too large (max 15MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFinAttachments(prev => [
          ...prev,
          {
            url: e.target!.result as string,
            name: file.name,
            type: file.type
          }
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement? This deletes it for everyone.')) return;
    const success = await api.deleteAnnouncement(id);
    if (success) {
      loadAdminData();
    }
  };

  // Resolution Board: Save Complaint Edits
  const handleSaveComplaintEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComplaint) return;
    setComplaintSuccess('');
    try {
      await api.createComplaint({
        id: editingComplaint.id,
        flatId: editingComplaint.flatId,
        title: editingComplaint.title,
        description: editingComplaint.description,
        mediaUrl: editingComplaint.mediaUrl || '',
        mediaName: editingComplaint.mediaName || '',
        mediaType: editingComplaint.mediaType || '',
        status: editingComplaint.status,
        createdAt: editingComplaint.createdAt,
        resolvedAt: editingComplaint.status === 'resolved' ? (editingComplaint.resolvedAt || new Date().toISOString()) : null,
        resolvedBy: editingComplaint.status === 'resolved' ? (editingComplaint.resolvedBy || 'Secretary Rahul Popat') : null,
        processNotes: editingComplaint.processNotes || ''
      });

      if (editingComplaint.status === 'resolved') {
        const parts = (editingComplaint.flatId || '').split('-');
        const wingPart = parts[0] || '';
        const flatPart = Number(parts[1]) || 0;
        await api.createSocietyNotification({
          type: 'complaint',
          title: `✓ Ticket Resolved: ${editingComplaint.title}`,
          message: `Your ticket has been marked resolved. Action Notes: ${editingComplaint.processNotes || 'None'}`,
          wing: wingPart,
          flatNo: flatPart,
          metadata: { complaintId: editingComplaint.id }
        });
      }

      setComplaintSuccess('Complaint updated successfully.');
      setTimeout(() => {
        setEditingComplaint(null);
        loadAdminData();
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    const success = await api.deleteComplaint(id);
    if (success) {
      loadAdminData();
    }
  };

  // Financial Ledger: Create/Update Report & CSV Importer
  const handleSaveFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinSuccess('');
    if (!finTitle.trim()) return;

    try {
      const finId = editingFinance ? editingFinance.id : 'fin_' + Math.random().toString(36).substring(2, 11);
      await api.createFinancialReport({
        id: finId,
        month: finMonth,
        year: finYear,
        title: finTitle.trim(),
        description: finDesc.trim(),
        pdfUrl: finPdfUrl,
        fileName: finFileName,
        fileType: finFileType,
        totalExpense: parseFloat(finExpense) || 0,
        uploadedBy: 'Orchid Heights Admin',
        reportType: finType,
        createdAt: editingFinance ? editingFinance.createdAt : new Date().toISOString(),
        attachments: finAttachments
      });

      if (!editingFinance) {
        await api.createSocietyNotification({
          type: 'financial',
          title: `💰 New Financial Ledger: ${finTitle.trim()}`,
          message: `The administration has uploaded the ${finMonth} ${finYear} financial ledger/report.`,
          metadata: { reportId: finId }
        });
      }

      setFinSuccess(editingFinance ? 'Ledger entry updated successfully.' : 'Ledger entry added successfully.');
      setFinTitle('');
      setFinDesc('');
      setFinPdfUrl('');
      setFinFileName('');
      setFinFileType('');
      setFinAttachments([]);
      setFinExpense('');
      setFinType('expense');
      setEditingFinance(null);
      setShowFinanceForm(false);
      loadAdminData();
      setTimeout(() => setFinSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditFinance = (report: FinancialReport) => {
    setEditingFinance(report);
    setFinMonth(report.month);
    setFinYear(report.year);
    setFinTitle(report.title);
    setFinDesc(report.description);
    setFinPdfUrl(report.pdfUrl || '');
    setFinFileName(report.fileName || '');
    setFinFileType(report.fileType || '');
    const initialAttachments = [...(report.attachments || [])];
    if (report.pdfUrl && !initialAttachments.some(att => att.url === report.pdfUrl)) {
      initialAttachments.push({ url: report.pdfUrl, name: report.fileName || 'Attachment.pdf', type: report.fileType || 'application/pdf' });
    }
    setFinAttachments(initialAttachments);
    setFinExpense(report.totalExpense.toString());
    setFinType(report.reportType || 'expense');
    setShowFinanceForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportCsv = () => {
    setCsvError('');
    setCsvImportedCount(0);
    if (!rawCsvText.trim()) {
      setCsvError('Please paste or upload some CSV content.');
      return;
    }

    try {
      const lines = rawCsvText.split('\n');
      let count = 0;
      let totalAmount = 0;
      const parsedItems: string[] = [];

      // Skip header row if exists
      const startIdx = lines[0].toLowerCase().includes('category') || lines[0].toLowerCase().includes('amount') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple comma splitting handling optional quotes
        const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (columns.length >= 2) {
          const cat = columns[0].replace(/"/g, '').trim();
          const desc = columns[1].replace(/"/g, '').trim();
          const amount = parseFloat(columns[2]?.replace(/"/g, '').replace(/[^0-9.]/g, '') || '0');
          
          if (cat && amount > 0) {
            totalAmount += amount;
            count++;
            parsedItems.push(`• [${cat}] ${desc}: ₹${amount.toLocaleString('en-IN')}`);
          }
        }
      }

      if (count === 0) {
        setCsvError('No valid rows found. Format: Category, Description, Amount');
        return;
      }

      // Generate a detailed description from the imported rows
      const combinedDesc = `Imported Ledger Summary:\n${parsedItems.join('\n')}\n\nTotal Sum: ₹${totalAmount.toLocaleString('en-IN')}`;
      
      setFinTitle(`CSV Import: ${count} Ledger Records`);
      setFinDesc(combinedDesc);
      setFinExpense(totalAmount.toString());
      setCsvImportedCount(count);
      setRawCsvText('');
    } catch (e) {
      setCsvError('Failed to parse CSV. Check formatting.');
    }
  };

  const handleDeleteFinance = async (id: string) => {
    if (!window.confirm('Delete this ledger record?')) return;
    const success = await api.deleteFinancialReport(id);
    if (success) {
      loadAdminData();
    }
  };

  // Address Book: Save Contact
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess('');
    if (!contactName.trim() || !contactPhone.trim()) return;

    const contactId = editingContact ? editingContact.id : 'ec_' + Math.random().toString(36).substring(2, 11);
    const contactPayload: EssentialContact = {
      id: contactId,
      name: contactName.trim(),
      category: contactCategory,
      phone: contactPhone.trim(),
      alternatePhone: contactAltPhone.trim() || undefined,
      active: true
    };

    const success = await api.saveEssentialContact(contactPayload);
    if (success) {
      setContactSuccess(editingContact ? 'Contact updated successfully!' : 'Contact added successfully!');
      setContactName('');
      setContactPhone('');
      setContactAltPhone('');
      setEditingContact(null);
      setShowContactForm(false);
      loadAdminData();
      setTimeout(() => setContactSuccess(''), 3000);
    } else {
      alert('Failed to save contact.');
    }
  };

  const handleEditContact = (c: EssentialContact) => {
    setEditingContact(c);
    setContactName(c.name);
    setContactCategory(c.category);
    setContactPhone(c.phone);
    setContactAltPhone(c.alternatePhone || '');
    setShowContactForm(true);
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Delete this contact from address book?')) return;
    const success = await api.deleteEssentialContact(id);
    if (success) {
      loadAdminData();
    }
  };

  // Download 3 Months Visitor Data as Excel-compatible CSV file
  const handleDownload3MonthsReport = (owner: FlatOwner, visitorList: Visitor[]) => {
    const wingAndFlat = `${owner.wing}-${owner.flatNo}`;
    
    // Filter visitors for the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const filtered = visitorList.filter((v) => new Date(v.requestTime) >= threeMonthsAgo);

    if (filtered.length === 0) {
      alert(`No visitor logs found for Flat ${wingAndFlat} in the past 3 months.`);
      return;
    }

    // Build CSV Content
    let csvContent = `Orchid Heights Gatekeeper - 3-Month Visitor Report\r\n`;
    csvContent += `Flat,${wingAndFlat}\r\n`;
    csvContent += `Owner,"${owner.nameEn.toUpperCase()}"\r\n`;
    csvContent += `Generated On,${new Date().toLocaleString('en-IN')}\r\n\r\n`;
    csvContent += `"Visitor Name","Mobile Number","Email","Category/Type","Purpose of Visit","Entry Time","Status","Approved By","Status Flag"\r\n`;

    filtered.forEach((v) => {
      const entryTime = new Date(v.requestTime).toLocaleString('en-IN');
      const deletedTag = v.deletedByResident ? 'Deleted by Resident' : 'Active Log';
      csvContent += `"${v.fullName.replace(/"/g, '""')}","${v.mobileNumber}","${(v.email || '').replace(/"/g, '""')}","${v.guestType}","${v.reason.replace(/"/g, '""')}","${entryTime}","${v.status.toUpperCase()}","${(v.respondedBy || '').replace(/"/g, '""')}","${deletedTag}"\r\n`;
    });

    // Download Blob
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Visitor_Report_${wingAndFlat}_3_Months.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter flats list based on search query
  const filteredOwners = owners.filter((owner) => {
    const q = adminSearch.toLowerCase().trim();
    if (q === '') return true;
    return (
      `${owner.wing}-${owner.flatNo}`.toLowerCase().includes(q) ||
      owner.nameEn.toLowerCase().includes(q) ||
      owner.nameGu.toLowerCase().includes(q) ||
      owner.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6 text-left pb-16">
      
      {/* Admin Panel Header Banner */}
      <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shrink-0 bg-white border border-slate-700 flex items-center justify-center p-1">
            <img 
              src="https://i.ibb.co/zT5tpcdY/1000296229-1.png" 
              alt="Orchid Heights Logo" 
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="font-display font-black text-xl tracking-tight">Orchid Heights Admin Suite</h2>
            <p className="text-xs text-slate-400 mt-1">
              Private administrative master panel. Add notices, review all complaints, audit devices, view deleted visitor data, and download reports.
            </p>
          </div>
        </div>
        {onLogoutAdmin && (
          <button
            onClick={onLogoutAdmin}
            className="bg-red-600/25 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start md:self-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        )}
      </div>

      {/* Responsive Navigation Tab Buttons */}
      <div className="flex overflow-x-auto no-scrollbar bg-white border border-slate-200 p-1 rounded-xl shadow-sm gap-1 scroll-smooth">
        {(
          [
            { id: 'flats', label: 'Flats Directory', icon: Smartphone },
            { id: 'notices', label: 'Society Notices', icon: Megaphone },
            { id: 'complaints', label: 'Complaints', icon: ClipboardList },
            { id: 'finance', label: 'Financial Ledger', icon: FileSpreadsheet },
            { id: 'address-book', label: 'Address Book', icon: BookOpen },
            { id: 'amenities', label: 'Amenities', icon: Sparkles },
            { id: 'system', label: 'System Utils', icon: Database }
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedFlat(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading bar indicators */}
      {loading && (
        <div className="w-full bg-slate-100 h-1 overflow-hidden rounded-full">
          <div className="bg-indigo-600 h-full animate-pulse w-1/2 rounded-full"></div>
        </div>
      )}

      {/* TAB CONTENT GRID */}
      <div>

        {/* 1. FLATS & DEVICES DIRECTORY TAB */}
        {activeTab === 'flats' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Flat List Panel */}
            <div className={`bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm ${selectedFlat ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-800">Flat Registers & Credentials</h3>
                  <p className="text-xs text-slate-400">Total 96 Apartments. Audit device logouts and retrieve flatowner passwords.</p>
                </div>
                
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search flat, occupant name, phone..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-1.5 pl-8 pr-3 text-xs outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Inline Owner Editor Dialog (inside directory) */}
              {editOwner && (
                <div className="mb-6 bg-indigo-50/50 border border-indigo-200 p-4 md:p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                    <h4 className="font-display font-bold text-sm text-indigo-900">
                      ✏️ Edit Owner details: {editOwner.wing}-{editOwner.flatNo}
                    </h4>
                    <button onClick={() => setEditOwner(null)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {editError && <p className="bg-red-50 text-red-700 p-2 rounded text-xs">{editError}</p>}
                  {editSuccess && <p className="bg-emerald-50 text-emerald-700 p-2 rounded text-xs">{editSuccess}</p>}

                  <form onSubmit={handleSaveOwnerEdit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Name (English)</label>
                        <input
                          type="text" required placeholder="Owner English Name"
                          value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none font-semibold focus:border-indigo-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Name (Gujarati)</label>
                        <input
                          type="text" placeholder="નામ ગુજરાતીમાં"
                          value={editNameGu} onChange={(e) => setEditNameGu(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none font-semibold focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Primary Phone</label>
                        <input
                          type="tel" placeholder="10-digit primary"
                          value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none font-semibold focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Alt Contact</label>
                        <input
                          type="tel" placeholder="Alternate phone"
                          value={editSecondary} onChange={(e) => setEditSecondary(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none font-semibold focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button type="submit" disabled={editLoading} className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer">
                        {editLoading ? 'Saving...' : 'Save Owner'}
                      </button>
                      <button type="button" onClick={() => setEditOwner(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs cursor-pointer">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Master directory table */}
              <div className="max-h-[600px] overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                      <th className="py-2.5 px-3">Flat</th>
                      <th className="py-2.5 px-3">Occupant / Phone</th>
                      <th className="py-2.5 px-3 text-center">Devices</th>
                      <th className="py-2.5 px-3 text-center">Password</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredOwners.map((owner) => {
                      const flatKey = `${owner.wing}-${owner.flatNo}`;
                      const password = flatPasswords[flatKey] || 'admin@123';
                      const isPassVisible = passwordsVisible[flatKey] || false;
                      const hasDevices = owner.devices && owner.devices.length > 0;
                      
                      return (
                        <tr key={flatKey} className={`hover:bg-slate-50/50 transition cursor-pointer ${selectedFlat?.wing === owner.wing && selectedFlat?.flatNo === owner.flatNo ? 'bg-indigo-50/40' : ''}`} onClick={() => viewFlatDetails(owner)}>
                          <td className="py-3 px-3">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded text-[11px]">
                              {owner.wing}-{owner.flatNo}
                            </span>
                          </td>
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <p className="font-bold text-slate-800 text-xs uppercase leading-tight truncate max-w-[150px]">{owner.nameEn}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{owner.phone ? `+91 ${owner.phone}` : 'No primary phone'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {hasDevices ? (
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                                {owner.devices!.length} Active
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center space-x-1.5 font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <span>{isPassVisible ? password : '••••••••'}</span>
                              <button
                                onClick={() => setPasswordsVisible((prev) => ({ ...prev, [flatKey]: !isPassVisible }))}
                                className="text-slate-400 hover:text-slate-600 transition p-0.5"
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditOwner(owner)}
                                className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 p-1.5 rounded-lg transition"
                                title="Edit details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => viewFlatDetails(owner)}
                                className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 py-1 rounded-lg text-[10px] font-bold"
                              >
                                Review Flat
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Flat Inspection Sub-Panel */}
            {selectedFlat && (
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-6">
                
                {/* Selected Title */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div className="text-left">
                    <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">Inspecting Flat</span>
                    <h3 className="font-display font-black text-lg text-slate-800 mt-1">{selectedFlat.wing}-{selectedFlat.flatNo}</h3>
                    <p className="text-xs text-slate-400 font-medium">Full registered device logs, household members, and visitor logs override.</p>
                    
                    {/* Flat occupant overview */}
                    <div className="mt-2.5 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-slate-850 uppercase">Owner: {selectedFlat.nameEn} {selectedFlat.nameGu ? `(${selectedFlat.nameGu})` : ''}</p>
                      <p className="text-slate-600 font-mono">📞 Primary: {selectedFlat.phone ? `+91 ${selectedFlat.phone}` : 'No phone'}</p>
                      {selectedFlat.secondaryContact && (
                        <p className="text-slate-600 font-mono">📞 Alternate: +91 {selectedFlat.secondaryContact}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedFlat(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-xl transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-section 1: Household Members & Vehicles */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  
                  {/* Household Members with admin CRUD */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-1.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Household Members</h4>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                        {selectedFlat.members?.length || 0}
                      </span>
                    </div>

                    {selectedFlat.members && selectedFlat.members.length > 0 ? (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                        {selectedFlat.members.map((m, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg text-xs font-semibold uppercase text-slate-800">
                            <span>👤 {m}</span>
                            <button
                              onClick={() => handleDeleteMemberFromFlat(selectedFlat.wing, selectedFlat.flatNo, idx)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition cursor-pointer"
                              title="Delete Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No co-residents registered.</p>
                    )}

                    {/* Admin Add Member Form */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Add Co-resident</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-medium">
                        <input
                          type="text"
                          placeholder="Name (e.g. Amit Patel)"
                          value={adminNewMember}
                          onChange={(e) => setAdminNewMember(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded p-1.5 uppercase outline-none focus:border-indigo-500 text-[11px]"
                        />
                        <input
                          type="tel"
                          placeholder="Phone (Optional)"
                          value={adminNewMemberPhone}
                          onChange={(e) => setAdminNewMemberPhone(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:border-indigo-500 text-[11px]"
                        />
                      </div>
                      <button
                        onClick={() => handleAddMemberToFlat(selectedFlat.wing, selectedFlat.flatNo)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded text-[10px] uppercase cursor-pointer"
                      >
                        Add Member
                      </button>
                    </div>
                  </div>

                  {/* Registered Vehicles with admin CRUD */}
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-1.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vehicles Registered</h4>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                        {selectedFlat.vehicles?.length || 0}
                      </span>
                    </div>

                    {selectedFlat.vehicles && selectedFlat.vehicles.length > 0 ? (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                        {selectedFlat.vehicles.map((v) => (
                          <div key={v.id} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-800">
                            <div className="flex flex-col text-left">
                              <span className="font-bold uppercase">{v.type === 'twowheeler' ? '🏍️' : '🚗'} {v.brandModel}</span>
                              <span className="font-mono text-[10px] text-slate-500 font-bold">{v.plateNumber}</span>
                              {v.parkingPlot && (
                                <span className="text-[9px] text-indigo-600 font-bold">🅿️ Plot: {v.parkingPlot}</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteVehicleFromFlat(selectedFlat.wing, selectedFlat.flatNo, v.id)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition cursor-pointer"
                              title="Delete Vehicle"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No vehicles registered.</p>
                    )}

                    {/* Admin Add Vehicle Form */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Register Vehicle</p>
                      
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAdminNewVehicleType('twowheeler')}
                          className={`flex-1 py-1 rounded text-[9px] font-bold border transition cursor-pointer ${
                            adminNewVehicleType === 'twowheeler' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          🏍️ 2W
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminNewVehicleType('fourwheeler')}
                          className={`flex-1 py-1 rounded text-[9px] font-bold border transition cursor-pointer ${
                            adminNewVehicleType === 'fourwheeler' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          🚗 4W
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
                        <input
                          type="text"
                          placeholder="PLATE (GJ01AB1234)"
                          value={adminNewVehiclePlate}
                          onChange={(e) => setAdminNewVehiclePlate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded p-1.5 uppercase outline-none focus:border-indigo-500 text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="MODEL (e.g. Swift)"
                          value={adminNewVehicleModel}
                          onChange={(e) => setAdminNewVehicleModel(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:border-indigo-500 text-[11px]"
                        />
                      </div>

                      <input
                        type="text"
                        placeholder="Parking Plot (e.g. B-1 Basement)"
                        value={adminNewVehicleParking}
                        onChange={(e) => setAdminNewVehicleParking(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:border-indigo-500 text-[11px] font-medium"
                      />

                      <button
                        onClick={() => handleAddVehicleToFlat(selectedFlat.wing, selectedFlat.flatNo)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded text-[10px] uppercase cursor-pointer"
                      >
                        Register Vehicle
                      </button>
                    </div>

                  </div>
                </div>

                {/* Sub-section 2: Logged in Devices Audit with Remote Logout */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Logged in Devices ({selectedFlat.devices?.length || 0})</span>
                  </h4>
                  {selectedFlat.devices && selectedFlat.devices.length > 0 ? (
                    <div className="space-y-2">
                      {selectedFlat.devices.map((device, index) => (
                        <div key={device.deviceId || index} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex justify-between items-start gap-4">
                          <div className="text-xs text-slate-600 space-y-1 font-medium">
                            <p className="font-bold text-slate-800 flex items-center">
                              <span className="text-base mr-1">{device.os === 'Android' || device.os === 'iOS' ? '📱' : '💻'}</span>
                              <span>{device.os} • {device.browser}</span>
                            </p>
                            <p className="font-mono text-[10px]"><span className="text-slate-400">IMEI:</span> {device.imei}</p>
                            <p className="font-mono text-[10px]"><span className="text-slate-400">IP:</span> {device.ipAddress}</p>
                            <p className="text-[10px] text-slate-400">Login: {new Date(device.lastLogin).toLocaleString('en-IN')}</p>
                          </div>
                          <button
                            onClick={() => handleRemoteLogout(selectedFlat.wing, selectedFlat.flatNo, device.deviceId)}
                            className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Log Out</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                      <p className="text-xs">No active devices registered for this flat.</p>
                    </div>
                  )}
                </div>

                {/* Sub-section 3: Visitor logs OVERRIDE (Includes Deleted!) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Flat Visitor Logs Override</span>
                    </h4>
                    <button
                      onClick={() => handleDownload3MonthsReport(selectedFlat, selectedFlatVisitors)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download 3-Month Report</span>
                    </button>
                  </div>

                  {loadingVisitors ? (
                    <div className="text-center py-10 space-y-2">
                      <div className="inline-block border-2 border-indigo-600 border-t-transparent rounded-full w-6 h-6 animate-spin"></div>
                      <p className="text-[10px] text-slate-400">Fetching comprehensive logs...</p>
                    </div>
                  ) : selectedFlatVisitors.length > 0 ? (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {selectedFlatVisitors.map((visitor) => (
                        <div key={visitor.id} className={`border p-3 rounded-xl text-xs space-y-2 font-medium relative ${visitor.deletedByResident ? 'border-red-200 bg-red-50/15' : 'border-slate-200 bg-slate-50/30'}`}>
                          {visitor.deletedByResident && (
                            <span className="absolute top-3 right-3 text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 uppercase flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              <span>Deleted by Owner</span>
                            </span>
                          )}
                          <div className="flex gap-3 items-start text-left">
                            {visitor.photoUrl ? (
                              <div className="w-12 h-12 bg-slate-100 border rounded-lg overflow-hidden shrink-0 shadow-sm">
                                <img src={visitor.photoUrl} alt="Visitor" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border text-base">👤</div>
                            )}
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <p className="font-bold text-slate-800 text-sm leading-tight truncate uppercase">{visitor.fullName}</p>
                              <p className="text-slate-500 font-semibold">{visitor.mobileNumber} • {visitor.guestType}</p>
                              <p className="text-slate-400 text-[10px]">Reason: {visitor.reason}</p>
                              <p className="text-slate-400 text-[10px] flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{new Date(visitor.requestTime).toLocaleString('en-IN')}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 text-[10px]">
                            <span className="font-bold">
                              Status: <span className={`uppercase font-extrabold ${visitor.status === 'approved' ? 'text-emerald-600' : visitor.status === 'rejected' ? 'text-red-600' : 'text-slate-500'}`}>{visitor.status}</span>
                            </span>
                            {visitor.respondedBy && <span className="text-slate-400">Responded By: {visitor.respondedBy}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                      No visitor records recorded for this apartment.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* 2. SOCIETY NOTICES MANAGEMENT TAB */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            
            {/* Notices Header Actions */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-display font-bold text-base text-slate-800">Notice Board Publisher</h3>
                <p className="text-xs text-slate-400">Add, edit or delete targeted society notices. Residents get push alerts instantly.</p>
              </div>
              <button
                onClick={() => {
                  setEditingAnnouncement(null);
                  setNoticeTarget('all');
                  setNoticeText('');
                  setNoticeImage('');
                  setNoticeVideo('');
                  setShowNoticeForm(!showNoticeForm);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                {showNoticeForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showNoticeForm ? 'Cancel Form' : 'Publish New Notice'}</span>
              </button>
            </div>

            {noticeSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{noticeSuccess}</span>
              </div>
            )}

            {/* Notice Creation / Editing Form */}
            {showNoticeForm && (
              <form onSubmit={handleSaveNotice} className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
                  {editingAnnouncement ? '✏️ Edit Notice Details' : '📢 Compose New Announcement'}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Target Audience</label>
                    <select
                      value={noticeTarget}
                      onChange={(e) => setNoticeTarget(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                    >
                      <option value="all">Orchid Heights (All Flats)</option>
                      <option value="wing">Specific Wing (A or B)</option>
                      <option value="flat">Specific Apartment (e.g. B-1104)</option>
                    </select>
                  </div>

                  {noticeTarget !== 'all' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Select Wing</label>
                      <select
                        value={noticeWing}
                        onChange={(e) => setNoticeWing(e.target.value as 'A' | 'B')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                      >
                        <option value="A">Wing A</option>
                        <option value="B">Wing B</option>
                      </select>
                    </div>
                  )}

                  {noticeTarget === 'flat' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Flat Number</label>
                      <select
                        value={noticeFlatNo}
                        onChange={(e) => setNoticeFlatNo(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                      >
                        {flats.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Notice Message Content</label>
                  <textarea
                    required rows={4}
                    placeholder="Type official circular, celebration detail, water supply alert, etc..."
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-medium resize-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                    Connect Files / Documents / Media (PDFs, Images, Videos, spreadsheets etc.)
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingNotice(true);
                    }}
                    onDragLeave={() => setIsDraggingNotice(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingNotice(false);
                      if (e.dataTransfer.files) {
                        for (let i = 0; i < e.dataTransfer.files.length; i++) {
                          addNoticeAttachment(e.dataTransfer.files[i]);
                        }
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${
                      isDraggingNotice
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                    onClick={() => document.getElementById('notice-file-input')?.click()}
                  >
                    <input
                      id="notice-file-input"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.mp4,.mov,.avi,.csv,.xlsx,.xls,image/*,video/*,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          for (let i = 0; i < e.target.files.length; i++) {
                            addNoticeAttachment(e.target.files[i]);
                          }
                        }
                      }}
                    />
                    
                    <div className="space-y-1.5 py-1">
                      <div className="mx-auto w-8 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Drag & Drop files or click to select multiple</p>
                      <p className="text-[9px] text-slate-400">Supports PDF, MP4, CSV, Excel sheets, PNG, JPG (Max 15MB each)</p>
                    </div>
                  </div>

                  {/* Multiple Attachments Selected Preview */}
                  {noticeAttachments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ready Attachments ({noticeAttachments.length}):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                        {noticeAttachments.map((att, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5 text-xs shadow-sm">
                            <div className="flex items-center space-x-2 truncate">
                              {att.type?.startsWith('image/') ? (
                                <img src={att.url} className="w-8 h-8 object-cover rounded border border-slate-100" />
                              ) : att.type?.startsWith('video/') ? (
                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded flex items-center justify-center text-[10px]">📹</div>
                              ) : (
                                <FileText className="w-6 h-6 text-indigo-500 shrink-0" />
                              )}
                              <div className="text-left truncate">
                                <p className="font-bold text-slate-700 truncate max-w-[120px]">{att.name}</p>
                                <p className="text-[8px] text-slate-400 uppercase font-mono">{att.type?.split('/')[1] || 'FILE'}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNoticeAttachments(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Alternative Attachment Image Link (Optional)</label>
                    <input
                      type="url" placeholder="https://example.com/image.jpg"
                      value={noticeImage} onChange={(e) => setNoticeImage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Alternative Attachment Video Link (Optional)</label>
                    <input
                      type="url" placeholder="https://example.com/video.mp4"
                      value={noticeVideo} onChange={(e) => setNoticeVideo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow transition"
                  >
                    {editingAnnouncement ? 'Save Notice Edits' : 'Broadcast Notice Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAnnouncement(null);
                      setShowNoticeForm(false);
                    }}
                    className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* List of Published Notices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between text-left">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Audience: {ann.target} {ann.target === 'wing' ? `(${ann.wing})` : ann.target === 'flat' ? `(${ann.wing}-${ann.flatNo})` : ''}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditNotice(ann)}
                          className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg border border-indigo-100 transition"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNotice(ann.id)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg border border-red-100 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 font-mono">Notice ID: {ann.id}</p>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-line">{ann.text}</p>
                    
                    {/* Render announcement attachments */}
                    {((ann.attachments && ann.attachments.length > 0) || ann.pdfUrl || ann.imageUrl) && (
                      <div className="space-y-1.5 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Legacy image url fallback */}
                          {ann.imageUrl && !(ann.attachments && ann.attachments.some((a: any) => a.url === ann.imageUrl)) && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative group max-h-[140px]">
                              <img src={ann.imageUrl} alt="Attached legacy image" className="w-full h-full object-cover max-h-[140px]" />
                            </div>
                          )}

                          {/* Legacy PDF/document URL fallback */}
                          {ann.pdfUrl && !(ann.attachments && ann.attachments.some((a: any) => a.url === ann.pdfUrl)) && (
                            <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-between text-xs col-span-full">
                              <div className="flex items-center space-x-2 truncate">
                                <FileText className="w-6 h-6 text-indigo-500 shrink-0" />
                                <span className="font-bold text-slate-700 truncate max-w-[150px] text-[10px]">{ann.fileName || 'document.pdf'}</span>
                              </div>
                              <a href={ann.pdfUrl} download={ann.fileName || 'document.pdf'} className="text-indigo-600 hover:underline font-extrabold text-[10px]">Download</a>
                            </div>
                          )}

                          {/* Multi attachments list */}
                          {ann.attachments && ann.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col gap-1.5 shadow-sm">
                              {att.type?.startsWith('image/') ? (
                                <div className="rounded border overflow-hidden max-h-[100px] bg-slate-100">
                                  <img src={att.url} className="w-full object-cover max-h-[100px]" referrerPolicy="no-referrer" />
                                </div>
                              ) : att.type?.startsWith('video/') ? (
                                <video src={att.url} controls className="max-h-[100px] w-full rounded border bg-black" />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                  <p className="font-bold text-slate-700 truncate text-[10px] max-w-[120px]">{att.name}</p>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[10px]">
                                {!att.type?.startsWith('image/') && !att.type?.startsWith('video/') && (
                                  <span className="text-[8px] text-slate-400 font-mono uppercase">{att.type?.split('/')[1] || 'FILE'}</span>
                                )}
                                <a href={att.url} download={att.name || 'Attachment'} className="text-indigo-600 hover:underline font-extrabold text-[10px] ml-auto">Download</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Sender: <strong>{ann.sender}</strong></span>
                    <span>{new Date(ann.timestamp).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}

              {announcements.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold">No Published Notices</p>
                  <p className="text-xs text-slate-400">Notices published will show up here for residents.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. RESOLUTION BOARD (COMPLAINTS) TAB */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-left">
              <h3 className="font-display font-bold text-base text-slate-800">Resolution Board Reviewer</h3>
              <p className="text-xs text-slate-400">Review, update, change status, modify descriptions or delete complaints across all flats.</p>
            </div>

            {complaintSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{complaintSuccess}</span>
              </div>
            )}

            {/* Editing Complaint Modal overlay or drawer */}
            {editingComplaint && (
              <form onSubmit={handleSaveComplaintEdit} className="bg-indigo-50/40 border border-indigo-200 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                  <h4 className="font-display font-bold text-sm text-indigo-900">✏️ Edit Complaint Details: {editingComplaint.id}</h4>
                  <button type="button" onClick={() => setEditingComplaint(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Complaint Title</label>
                    <input
                      type="text" required
                      value={editingComplaint.title}
                      onChange={(e) => setEditingComplaint({ ...editingComplaint, title: e.target.value })}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Resolution Status</label>
                    <select
                      value={editingComplaint.status}
                      onChange={(e) => setEditingComplaint({ ...editingComplaint, status: e.target.value as any })}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="open">Open (Unresolved)</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved (Completed)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Detailed Description</label>
                  <textarea
                    required rows={3}
                    value={editingComplaint.description}
                    onChange={(e) => setEditingComplaint({ ...editingComplaint, description: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Attached Media Info / Download Link</label>
                  {editingComplaint.mediaUrl ? (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between text-xs">
                      <span className="truncate max-w-[200px] font-mono text-[10px] text-slate-600">
                        📎 {editingComplaint.mediaName || 'Attached_Device_Upload.file'} ({editingComplaint.mediaType || 'unknown'})
                      </span>
                      <a
                        href={editingComplaint.mediaUrl}
                        download={editingComplaint.mediaName || 'attachment'}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2.5 rounded text-[10px] flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No media attached by resident.</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Secretary Review / Process Done Notes</label>
                  <textarea
                    rows={3}
                    value={editingComplaint.processNotes || ''}
                    onChange={(e) => setEditingComplaint({ ...editingComplaint, processNotes: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 resize-none"
                    placeholder="Provide updates, actions taken, or resolution remarks..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="submit" className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer">Save Complaint</button>
                  <button type="button" onClick={() => setEditingComplaint(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs cursor-pointer">Cancel</button>
                </div>
              </form>
            )}

            {/* List of complaints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {complaints.map((comp) => (
                <div key={comp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between text-left">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-black font-mono">Flat {comp.flatId}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingComplaint(comp)}
                          className="text-indigo-600 hover:bg-indigo-50 border border-indigo-100 p-1 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteComplaint(comp.id)}
                          className="text-red-600 hover:bg-red-50 border border-red-100 p-1 rounded-lg cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight uppercase">{comp.title}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Complaint ID: {comp.id}</p>
                    </div>

                    <p className="text-xs text-slate-600 font-semibold leading-snug">{comp.description}</p>
                    
                    {/* Render complaint multiple attachments */}
                    {((comp.attachments && comp.attachments.length > 0) || comp.mediaUrl) && (
                      <div className="space-y-1.5 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments ({comp.attachments?.length || 1}):</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Legacy mediaUrl fallback */}
                          {comp.mediaUrl && !(comp.attachments && comp.attachments.some((a: any) => a.url === comp.mediaUrl)) && (
                            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs col-span-full shadow-sm">
                              <div className="flex items-center space-x-2 truncate">
                                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                <span className="font-bold text-slate-700 truncate max-w-[150px] text-[10px]">{comp.mediaName || 'Attachment'}</span>
                              </div>
                              <a href={comp.mediaUrl} download={comp.mediaName || 'Attachment'} className="text-indigo-600 hover:underline font-extrabold text-[10px]">Download</a>
                            </div>
                          )}

                          {/* Multi attachments */}
                          {comp.attachments && comp.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col gap-1.5 shadow-sm">
                              {att.type?.startsWith('image/') ? (
                                <div className="rounded border overflow-hidden max-h-[100px] bg-slate-100">
                                  <img src={att.url} className="w-full object-cover max-h-[100px]" referrerPolicy="no-referrer" />
                                </div>
                              ) : att.type?.startsWith('video/') ? (
                                <video src={att.url} controls className="max-h-[100px] w-full rounded border bg-black" />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                  <p className="font-bold text-slate-700 truncate text-[10px] max-w-[120px]">{att.name}</p>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[10px]">
                                {!att.type?.startsWith('image/') && !att.type?.startsWith('video/') && (
                                  <span className="text-[8px] text-slate-400 font-mono uppercase">{att.type?.split('/')[1] || 'FILE'}</span>
                                )}
                                <a href={att.url} download={att.name || 'Attachment'} className="text-indigo-600 hover:underline font-extrabold text-[10px] ml-auto">Download</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {comp.processNotes && (
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-[10px] text-slate-600 leading-normal">
                        <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-0.5">Secretary Review & Actions Done:</p>
                        <p className="font-medium whitespace-pre-line text-slate-700">{comp.processNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className={`uppercase font-black border px-2 py-0.5 rounded-full ${
                      comp.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      comp.status === 'in-progress' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {comp.status}
                    </span>
                    <span>Created: {new Date(comp.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}

              {complaints.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold">No complaints registered</p>
                  <p className="text-xs text-slate-400">Active complaints will appear here.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 4. FINANCIAL LEDGER TAB & CSV IMPORTER */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-display font-bold text-base text-slate-800">Financial Reports & Ledger</h3>
                <p className="text-xs text-slate-400">Upload reports, input expenses, and parse custom CSV tables directly into the ledger.</p>
              </div>
              <button
                onClick={() => setShowFinanceForm(!showFinanceForm)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                {showFinanceForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showFinanceForm ? 'Cancel Ledger Form' : 'Add Ledger Entry'}</span>
              </button>
            </div>

            {finSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{finSuccess}</span>
              </div>
            )}

            {/* Financial form + CSV Importer Panel */}
            {showFinanceForm && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm">
                
                {/* Regular Form Input */}
                <form onSubmit={handleSaveFinance} className="lg:col-span-6 space-y-4 text-left">
                  <h4 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">💰 Ledger Entry Details</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Month</label>
                      <select
                        value={finMonth}
                        onChange={(e) => setFinMonth(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Year</label>
                      <input
                        type="number" required
                        value={finYear}
                        onChange={(e) => setFinYear(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Report/Ledger Title</label>
                    <input
                      type="text" required placeholder="e.g. June Maintenance Ledger"
                      value={finTitle}
                      onChange={(e) => setFinTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Total Expenses (₹)</label>
                    <input
                      type="number" required placeholder="Amount in Rs"
                      value={finExpense}
                      onChange={(e) => setFinExpense(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Ledger Statement Type</label>
                    <select
                      value={finType}
                      onChange={(e) => setFinType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                    >
                      <option value="expense">Expense Ledger / Society Maintenance Outlay</option>
                      <option value="welfare">Welfare Funds Collection Ledger</option>
                      <option value="statement">Financial & Audit Statement</option>
                      <option value="other">General Financial Record</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                      Connect Files / Statements / Documents (PDF, Excel, Images, CSV, etc.)
                    </label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFin(true);
                      }}
                      onDragLeave={() => setIsDraggingFin(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFin(false);
                        if (e.dataTransfer.files) {
                          for (let i = 0; i < e.dataTransfer.files.length; i++) {
                            addFinAttachment(e.dataTransfer.files[i]);
                          }
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${
                        isDraggingFin
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-50/80 hover:border-slate-300'
                      }`}
                      onClick={() => document.getElementById('fin-file-input')?.click()}
                    >
                      <input
                        id="fin-file-input"
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls,image/*,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            for (let i = 0; i < e.target.files.length; i++) {
                              addFinAttachment(e.target.files[i]);
                            }
                          }
                        }}
                      />
                      
                      <div className="space-y-1.5 py-1">
                        <div className="mx-auto w-8 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Drag & Drop files or click to select multiple</p>
                        <p className="text-[9px] text-slate-400">Supports PDF, CSV, Excel sheets, PNG, JPG (Max 15MB each)</p>
                      </div>
                    </div>

                    {/* Multiple Financial Attachments Selected Preview */}
                    {finAttachments.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ready Attachments ({finAttachments.length}):</p>
                        <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto">
                          {finAttachments.map((att, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5 text-xs shadow-sm">
                              <div className="flex items-center space-x-2 truncate">
                                {att.type?.startsWith('image/') ? (
                                  <img src={att.url} className="w-8 h-8 object-cover rounded border border-slate-100" />
                                ) : (
                                  <FileText className="w-6 h-6 text-indigo-500 shrink-0" />
                                )}
                                <div className="text-left truncate">
                                  <p className="font-bold text-slate-700 truncate max-w-[150px]">{att.name}</p>
                                  <p className="text-[8px] text-slate-400 uppercase font-mono">{att.type?.split('/')[1] || 'FILE'}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFinAttachments(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Description / Details Summary</label>
                    <textarea
                      rows={5} placeholder="Brief details about where the expense occurred..."
                      value={finDesc}
                      onChange={(e) => setFinDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-medium resize-none focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer">
                      {editingFinance ? '✓ Update Ledger Entry' : 'Publish Ledger Entry'}
                    </button>
                    {editingFinance && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFinance(null);
                          setFinTitle('');
                          setFinDesc('');
                          setFinPdfUrl('');
                          setFinFileName('');
                          setFinFileType('');
                          setFinExpense('');
                          setFinType('expense');
                          setShowFinanceForm(false);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>

                {/* CSV Importer Panel */}
                <div className="lg:col-span-6 space-y-4 bg-slate-50 p-4 md:p-5 border border-slate-200 rounded-2xl text-left">
                  <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                    <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>CSV Data Importer</span>
                    </h4>
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 uppercase">Optional Tool</span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Paste raw spreadsheet lines (CSV formatted) to populate details. Format: <code className="bg-slate-200 px-1 rounded font-mono font-bold text-[10px]">Category, Description, Amount</code>.
                  </p>

                  {csvError && <p className="bg-red-50 text-red-700 p-2 rounded text-[10px]">{csvError}</p>}
                  {csvImportedCount > 0 && (
                    <p className="bg-emerald-50 text-emerald-700 p-2 rounded text-[10px] font-bold">
                      ✓ Parsed {csvImportedCount} rows successfully! Loaded into form.
                    </p>
                  )}

                  <textarea
                    rows={6}
                    placeholder={`Plumbing,Fixed main pipeline in wing B,4500\nGardening,Added urea and plant seeds,1200\nSecurity,Monthly guards uniforms,8000`}
                    value={rawCsvText}
                    onChange={(e) => setRawCsvText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-mono resize-none"
                  />

                  <button
                    type="button"
                    onClick={handleImportCsv}
                    className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs shadow transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Parse & Populate Form</span>
                  </button>
                </div>

              </div>
            )}

            {/* List of Ledger Records */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {financialReports.map((report) => (
                <div key={report.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between text-left relative overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-black font-mono w-max">
                          {report.month} {report.year}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase w-max border ${
                          report.reportType === 'welfare' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          report.reportType === 'statement' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          report.reportType === 'other' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {report.reportType === 'welfare' ? 'Welfare Funds' :
                           report.reportType === 'statement' ? 'Audit Statement' :
                           report.reportType === 'other' ? 'Other Record' :
                           'Expenses'}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditFinance(report)}
                          className="text-indigo-600 hover:bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFinance(report.id)}
                          className="text-red-600 hover:bg-red-50 border border-red-100 p-1.5 rounded-lg transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight uppercase">{report.title}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Record ID: {report.id}</p>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-line">{report.description}</p>
                    
                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Expense / Ledger Amount:</span>
                      <span className="text-sm font-black text-slate-900 font-mono">₹{report.totalExpense.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Render financial report multiple attachments */}
                  {((report.attachments && report.attachments.length > 0) || report.pdfUrl) && (
                    <div className="border-t border-slate-150 pt-3 mt-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connected Attachments ({report.attachments?.length || 1}):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        {/* Legacy pdfUrl fallback */}
                        {report.pdfUrl && !(report.attachments && report.attachments.some((a: any) => a.url === report.pdfUrl)) && (
                          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-between text-xs col-span-full shadow-sm">
                            <div className="flex items-center space-x-2 truncate">
                              <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                              <span className="font-bold text-slate-700 truncate max-w-[150px] text-[10px]">{report.fileName || 'document.pdf'}</span>
                            </div>
                            <a href={report.pdfUrl} download={report.fileName || 'document.pdf'} className="text-indigo-600 hover:underline font-extrabold text-[10px]">Download</a>
                          </div>
                        )}

                        {/* Multi attachments list */}
                        {report.attachments && report.attachments.map((att: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col gap-1.5 shadow-sm text-left">
                            {att.type?.startsWith('image/') ? (
                              <div className="rounded border overflow-hidden max-h-[100px] bg-slate-100">
                                <img src={att.url} className="w-full object-cover max-h-[100px]" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                <p className="font-bold text-slate-700 truncate text-[10px] max-w-[120px]">{att.name}</p>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[10px]">
                              {!att.type?.startsWith('image/') && (
                                <span className="text-[8px] text-slate-400 font-mono uppercase">{att.type?.split('/')[1] || 'FILE'}</span>
                              )}
                              <a href={att.url} download={att.name || 'Attachment'} className="text-indigo-600 hover:underline font-extrabold text-[10px] ml-auto">Download</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Month: {report.month} {report.year}</span>
                    <span>Uploaded: {new Date(report.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}

              {financialReports.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold">No financial logs recorded</p>
                  <p className="text-xs text-slate-400">Ledger entries and imports will appear here.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 5. ADDRESS BOOK (ESSENTIAL CONTACTS) TAB */}
        {activeTab === 'address-book' && (
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
              <div>
                <h3 className="font-display font-bold text-base text-slate-800">Essential Contacts Suite</h3>
                <p className="text-xs text-slate-400">Add, edit, or delete plumbers, electricians, security desks, gardeners and society staff.</p>
              </div>
              <button
                onClick={() => {
                  setEditingContact(null);
                  setContactName('');
                  setContactPhone('');
                  setContactAltPhone('');
                  setShowContactForm(!showContactForm);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                {showContactForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showContactForm ? 'Cancel Form' : 'Add New Contact'}</span>
              </button>
            </div>

            {contactSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{contactSuccess}</span>
              </div>
            )}

            {/* Address Book Add / Edit Form */}
            {showContactForm && (
              <form onSubmit={handleSaveContact} className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4 text-left">
                <h4 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
                  {editingContact ? '✏️ Edit Contact details' : '📞 Register New Staff Contact'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Staff Name</label>
                    <input
                      type="text" required placeholder="e.g. Ramesh Patel"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-semibold focus:bg-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Service Category</label>
                    <select
                      value={contactCategory}
                      onChange={(e) => setContactCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                    >
                      <option value="Plumber">Plumber</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Security">Security / Gate Duty</option>
                      <option value="Manager">Society Manager</option>
                      <option value="Gardener">Gardener</option>
                      <option value="Other">Other Helper</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Primary Mobile Number</label>
                    <input
                      type="tel" required placeholder="10-digit number"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-semibold focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Alternate Number (Optional)</label>
                  <input
                    type="tel" placeholder="Alt phone number"
                    value={contactAltPhone}
                    onChange={(e) => setContactAltPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none font-semibold focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="submit" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow">
                    {editingContact ? 'Save Changes' : 'Register Contact'}
                  </button>
                  <button type="button" onClick={() => setShowContactForm(false)} className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                </div>
              </form>
            )}

            {/* Grid of Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {contacts.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {c.category}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight uppercase">{c.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-1 font-semibold flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>+91 {c.phone}</span>
                      </p>
                      {c.alternatePhone && (
                        <p className="text-[10px] text-slate-400 font-mono font-medium ml-4">Alt: +91 {c.alternatePhone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditContact(c)}
                      className="text-indigo-600 hover:bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="text-red-600 hover:bg-red-50 border border-red-100 p-1.5 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* AMENITIES & BOOKINGS OVERRIDE TAB */}
        {activeTab === 'amenities' && (
          <div className="space-y-6 text-left">
            
            {/* Header / Summary stats */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-left">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-800">Amenities & Bookings Master Auditor</h3>
                  <p className="text-xs text-slate-400">Force approve function halls, audit live Gym / Theatre entries, and download audit sheets.</p>
                </div>
              </div>

              <button
                onClick={handleDownloadGymTheatreLogsCSV}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition cursor-pointer self-start md:self-auto shrink-0 animate-fadeIn"
              >
                <Download className="w-4 h-4" />
                <span>Export Gym & Theatre Logs (CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Function Bookings (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Function Hall Requests ({amenityBookings.length})</span>
                  </h4>
                </div>

                {amenityBookings.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    <p className="text-xs">No function bookings logged in the system.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {amenityBookings.map((booking) => {
                      const totalVotes = booking.approvedFlats?.length || 0;
                      const isCleared = totalVotes >= 49;

                      return (
                        <div key={booking.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition text-left space-y-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="bg-indigo-100 text-indigo-800 font-mono text-[9px] font-black px-2.5 py-0.5 rounded uppercase">
                                Flat {booking.flatId}
                              </span>
                              <h5 className="font-bold text-xs text-slate-800 mt-1 uppercase">
                                {booking.propertyName}
                              </h5>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                              isCleared 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isCleared ? '✅ Cleared' : 'Pending approvals'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-600 pt-2 border-t border-slate-100">
                            <p><span className="text-slate-400 font-bold uppercase text-[9px]">From:</span> {new Date(booking.dateFrom).toLocaleString('en-IN')}</p>
                            <p><span className="text-slate-400 font-bold uppercase text-[9px]">To:</span> {new Date(booking.dateTo).toLocaleString('en-IN')}</p>
                            <p><span className="text-slate-400 font-bold uppercase text-[9px]">Purpose:</span> {booking.reason}</p>
                            <p><span className="text-slate-400 font-bold uppercase text-[9px]">Stuff needed:</span> {booking.stuffNeeded}</p>
                            {booking.parkingRequest && <p><span className="text-slate-400 font-bold uppercase text-[9px]">Parking:</span> {booking.parkingRequest}</p>}
                            <p><span className="text-slate-400 font-bold uppercase text-[9px]">Votes:</span> {totalVotes} / 49</p>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            {!isCleared && (
                              <button
                                onClick={() => handleAdminApproveAmenityBooking(booking.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase transition cursor-pointer"
                              >
                                Force Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleAdminDeleteAmenityBooking(booking.id)}
                              className="bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase transition cursor-pointer"
                            >
                              Delete Request
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Gym & Theatre Logging (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. Active Check-ins */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-1.5">
                    <Clock className="text-indigo-600 w-4 h-4" />
                    <span>Active Sessions</span>
                  </h4>

                  {gymTheatreLogs.filter(l => !l.checkOutTime).length === 0 ? (
                    <div className="py-8 text-center text-slate-400 italic text-xs font-semibold">
                      No residents currently active inside Gym or Theatre.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gymTheatreLogs.filter(l => !l.checkOutTime).map((log) => (
                        <div key={log.id} className="bg-indigo-50/40 border border-indigo-100 p-3.5 rounded-xl flex justify-between items-center text-xs gap-3">
                          <div className="text-left space-y-1">
                            <p className="font-bold text-indigo-900 uppercase">
                              {log.amenity === 'Gym' ? '🏋️ Gym' : '🎬 Theatre'}
                            </p>
                            <p className="font-semibold text-slate-700">Flat: {log.flatId}</p>
                            <p className="text-[10px] text-slate-400 font-mono">In: {new Date(log.checkInTime).toLocaleTimeString('en-IN')}</p>
                          </div>
                          <button
                            onClick={() => handleAdminCheckOutLog(log.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-[9px] uppercase transition cursor-pointer shadow-sm"
                          >
                            Checkout
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Log History */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-1.5">
                    <Dumbbell className="text-indigo-600 w-4 h-4" />
                    <span>Log History</span>
                  </h4>

                  {gymTheatreLogs.filter(l => l.checkOutTime).length === 0 ? (
                    <div className="py-8 text-center text-slate-400 italic text-xs font-semibold">
                      No historical logs checked in.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {gymTheatreLogs.filter(l => l.checkOutTime).map((log) => (
                        <div key={log.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between text-xs gap-3 font-medium">
                          <div className="text-left space-y-1">
                            <p className="font-bold text-slate-800 uppercase">
                              {log.amenity === 'Gym' ? '🏋️ Gym' : '🎬 Theatre'} ({log.flatId})
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono">
                              In: {new Date(log.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • Out: {new Date(log.checkOutTime!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className="inline-block text-[8px] bg-slate-250 text-slate-800 border border-slate-350 px-1.5 py-0.5 rounded font-mono font-bold uppercase leading-none">
                              {log.durationMinutes} Mins
                            </span>
                          </div>

                          {log.exitPhotoUrl && (
                            <img
                              src={log.exitPhotoUrl}
                              alt="exit verification"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm cursor-zoom-in shrink-0"
                              onClick={() => window.open(log.exitPhotoUrl, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Movie Theatre Postings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="text-indigo-600 w-4 h-4" />
                      <span>Movie Postings ({moviesSchedule.length})</span>
                    </h4>
                    <button
                      onClick={() => {
                        if (moviesSchedule.length === 0) {
                          alert('No movies posted.');
                          return;
                        }
                        let csvContent = `Orchid Heights - Movie Screenings Report\r\n`;
                        csvContent += `Generated On,${new Date().toLocaleString('en-IN')}\r\n\r\n`;
                        csvContent += `"Movie Name","Date","Day","Timing","Length","Trailer Link"\r\n`;
                        moviesSchedule.forEach((movie) => {
                          csvContent += `"${movie.title}","${movie.date}","${movie.day}","${movie.timing}","${movie.length || 'N/A'}","${movie.trailerUrl || 'N/A'}"\r\n`;
                        });
                        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.setAttribute('href', url);
                        link.setAttribute('download', `Movie_Schedule_${new Date().toISOString().slice(0,10)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  {moviesSchedule.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 italic text-xs font-semibold">
                      No movies currently scheduled.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {moviesSchedule.map((movie) => (
                        <div key={movie.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between text-xs gap-3 font-medium">
                          <div className="text-left space-y-1">
                            <h5 className="font-bold text-slate-800 uppercase">{movie.title}</h5>
                            <p className="text-[10px] text-slate-500 font-medium">Day: {movie.day} • {movie.date}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Time: {movie.timing} • Length: {movie.length}</p>
                            {movie.trailerUrl && (
                              <a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-500 underline font-semibold">
                                Watch Trailer
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {movie.posterUrl && (
                              <img
                                src={movie.posterUrl}
                                alt="poster"
                                className="w-12 h-16 object-contain rounded border border-slate-200 bg-slate-900"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete "${movie.title}" screening?`)) {
                                  try {
                                    await deleteDoc(doc(db, 'movies_schedule', movie.id));
                                  } catch (e) {
                                    alert('Failed to delete movie.');
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700 p-1 font-bold cursor-pointer"
                              title="Delete Screening"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* 6. SYSTEM UTILITIES TAB */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Form 1: Password Changer */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4 text-indigo-600">
                <Key className="w-5 h-5" />
                <h3 className="font-display font-bold text-base text-slate-800">Admin Password Override</h3>
              </div>

              {passError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start space-x-1.5 mb-4">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-start space-x-1.5 mb-4">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Wing</label>
                    <select
                      value={selectedWing}
                      onChange={(e) => setSelectedWing(e.target.value as 'A' | 'B')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                    >
                      <option value="A">Wing A</option>
                      <option value="B">Wing B</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Flat No</label>
                    <select
                      value={selectedFlatNo}
                      onChange={(e) => setSelectedFlatNo(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                    >
                      {flats.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">New Password</label>
                  <input
                    type="text" required
                    placeholder="Enter new custom password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none focus:bg-white"
                  />
                </div>

                <button
                  type="submit" disabled={passLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
                >
                  {passLoading ? 'Updating...' : 'Update Password Override'}
                </button>
              </form>
            </div>

            {/* Factory Reset */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-orange-200 bg-orange-50/10">
              <div className="flex items-center space-x-2 border-b border-orange-100 pb-3 mb-4 text-orange-600">
                <Database className="w-5 h-5" />
                <h3 className="font-display font-bold text-base text-slate-800">Database Factory Reset</h3>
              </div>

              {resetSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs mb-3">
                  {resetSuccess}
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Restores all 96 flats back to their original Excel list status. This clears all added visitor logs, resets household members, and resets passwords to their default state (<span className="font-semibold text-slate-700 font-mono">admin@123</span>).
              </p>

              {showConfirmReset ? (
                <div className="space-y-3 bg-white p-4 border border-orange-200 rounded-xl">
                  <p className="text-xs font-bold text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1 shrink-0" />
                    Are you absolutely sure? All data is wiped!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetDb} disabled={resetLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {resetLoading ? 'Resetting...' : 'Yes, Reset Now'}
                    </button>
                    <button
                      onClick={() => setShowConfirmReset(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
                >
                  Reset Database to Factory Defaults
                </button>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
