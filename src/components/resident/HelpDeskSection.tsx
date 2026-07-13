import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ClipboardList, 
  AlertCircle, 
  Plus, 
  Upload, 
  X, 
  Download, 
  MessageSquare, 
  Megaphone, 
  Bell, 
  Calendar,
  ChevronRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import { api } from '../../lib/api';
import ChunkedMedia from '../ChunkedMedia';

interface HelpDeskSectionProps {
  wing: string;
  flatNo: number;
  complaints: any[];
  loadingComplaints: boolean;
  financials: any[];
  loadingFinancials: boolean;
  onRefreshComplaints: () => void;
  announcements: any[];
  viewMode?: 'complaints' | 'helpdesk';

  // Form states
  compTitle: string;
  setCompTitle: (text: string) => void;
  compDesc: string;
  setCompDesc: (text: string) => void;
  compMedia: string;
  setCompMedia: (text: string) => void;
  compMediaName: string;
  setCompMediaName: (text: string) => void;
  compMediaType: string;
  setCompMediaType: (text: string) => void;
  compSuccess: string;
  setCompSuccess: (text: string) => void;
  compError: string;
  setCompError: (text: string) => void;
  handleFileChange: (file: File) => void;

  // Real-time tab override props from notifications clicks
  activeTabOverride?: 'notices' | 'complaints' | 'financials' | null;
  onClearOverride?: () => void;
}

export default function HelpDeskSection({
  wing,
  flatNo,
  complaints,
  loadingComplaints,
  financials,
  loadingFinancials,
  onRefreshComplaints,
  announcements,
  viewMode,
  compTitle,
  setCompTitle,
  compDesc,
  setCompDesc,
  compMedia,
  setCompMedia,
  compMediaName,
  setCompMediaName,
  compMediaType,
  setCompMediaType,
  compSuccess,
  setCompSuccess,
  compError,
  setCompError,
  handleFileChange,
  activeTabOverride,
  onClearOverride
}: HelpDeskSectionProps) {
  
  // Set initial screen
  const [activeSub, setActiveSub] = useState<'menu' | 'notices' | 'complaints' | 'financials'>(() => {
    if (viewMode === 'complaints') return 'complaints';
    const path = window.location.pathname;
    if (path.includes('/notices')) return 'notices';
    if (path.includes('/financials')) return 'financials';
    if (path.includes('/complaints')) return 'complaints';
    return 'menu';
  });

  // Monitor notification redirects
  useEffect(() => {
    if (activeTabOverride) {
      setActiveSub(activeTabOverride);
      if (onClearOverride) onClearOverride();
    }
  }, [activeTabOverride]);

  // Sync activeSub state changes with URL pathnames
  useEffect(() => {
    if (activeSub === 'menu') {
      if (window.location.pathname !== '/helpdesk') {
        window.history.pushState({ sub: 'helpdesk' }, '', '/helpdesk');
      }
    } else {
      const path = `/helpdesk/${activeSub}`;
      if (window.location.pathname !== path) {
        window.history.pushState({ sub: 'helpdesk' }, '', path);
      }
    }
  }, [activeSub]);

  // Sync pathname changes back to activeSub state
  useEffect(() => {
    const handleLocationSync = () => {
      const path = window.location.pathname;
      if (path.includes('/notices')) {
        setActiveSub('notices');
      } else if (path.includes('/financials')) {
        setActiveSub('financials');
      } else if (path.includes('/complaints')) {
        setActiveSub('complaints');
      } else if (path === '/helpdesk') {
        setActiveSub('menu');
      }
    };
    window.addEventListener('popstate', handleLocationSync);
    return () => window.removeEventListener('popstate', handleLocationSync);
  }, []);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [compAttachments, setCompAttachments] = useState<Array<{ url: string; name: string; type: string }>>([]);

  const addCompAttachment = (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setCompError('File is too large. Max size allowed is 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCompAttachments(prev => [
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

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTitle.trim() || !compDesc.trim()) {
      setCompError('Title and description are required.');
      return;
    }

    setCompError('');
    setCompSuccess('');
    setSubmitting(true);

    try {
      const payload: any = {
        title: compTitle.trim(),
        description: compDesc.trim(),
        wing,
        flatNo,
        attachments: compAttachments
      };

      if (compMedia) {
        payload.mediaUrl = compMedia;
        payload.mediaName = compMediaName;
        payload.mediaType = compMediaType;
      }

      const res = await api.createComplaint(payload);
      if (res && res.id) {
        // Dispatch general notification to society_notifications collection
        await api.createSocietyNotification({
          type: 'complaint',
          title: `📝 Ticket Raised: Flat ${wing}-${flatNo}`,
          message: `New ticket: "${compTitle.trim()}". Description: ${compDesc.trim().substring(0, 80)}`,
          metadata: { complaintId: res.id }
        });

        setCompSuccess('Complaint filed successfully!');
        setCompTitle('');
        setCompDesc('');
        setCompMedia('');
        setCompMediaName('');
        setCompMediaType('');
        setCompAttachments([]);
        onRefreshComplaints();
      } else {
        setCompError('Failed to file complaint.');
      }
    } catch (err: any) {
      setCompError('Connection error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter announcements matching wing & flatNo target criteria
  const filteredNotices = (announcements || []).filter(item => {
    const targetType = item.targetType || item.target || 'all';
    const targetWing = item.targetWing || item.wing || '';
    const targetFlat = item.targetFlat || item.flatNo || '';

    if (targetType === 'all') return true;
    if (targetType === 'wing') {
      return targetWing.toLowerCase() === wing.toLowerCase();
    }
    if (targetType === 'flat') {
      return targetWing.toLowerCase() === wing.toLowerCase() && Number(targetFlat) === Number(flatNo);
    }
    return true;
  });

  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [selectedFinancialId, setSelectedFinancialId] = useState<string | null>(null);
  const [mobileExpandedNoticeId, setMobileExpandedNoticeId] = useState<string | null>(null);
  const [mobileExpandedFinancialId, setMobileExpandedFinancialId] = useState<string | null>(null);

  // Auto-select first item when notices tab loads
  useEffect(() => {
    if (filteredNotices.length > 0 && !selectedNoticeId) {
      setSelectedNoticeId(filteredNotices[0].id);
    }
  }, [filteredNotices, selectedNoticeId]);

  // Auto-select first item when financials list loads
  useEffect(() => {
    if (financials.length > 0 && !selectedFinancialId) {
      setSelectedFinancialId(financials[0].id);
    }
  }, [financials, selectedFinancialId]);

  // Support Deep-linking query params (e.g. ?noticeId=123, ?complaintId=456, ?ledgerId=789)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noticeId = params.get('noticeId');
    const complaintId = params.get('complaintId');
    const ledgerId = params.get('ledgerId');

    if (noticeId && filteredNotices.length > 0) {
      const found = filteredNotices.find(n => n.id === noticeId);
      if (found) {
        setActiveSub('notices');
        setSelectedNoticeId(noticeId);
        setMobileExpandedNoticeId(noticeId);
      }
    }
    if (ledgerId && financials.length > 0) {
      const found = financials.find(f => f.id === ledgerId);
      if (found) {
        setActiveSub('financials');
        setSelectedFinancialId(ledgerId);
        setMobileExpandedFinancialId(ledgerId);
      }
    }
    if (complaintId && complaints.length > 0) {
      setActiveSub('complaints');
      setTimeout(() => {
        const element = document.getElementById(`complaint-${complaintId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'animate-pulse');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'animate-pulse');
          }, 4000);
        }
      }, 500);
    }
  }, [filteredNotices.length, financials.length, complaints.length]);

  return (
    <div className="space-y-4 text-left">
      {/* ==================== VIEW 1: SUB-BLOCKS MENU ==================== */}
      {activeSub === 'menu' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-600">
              Helpdesk, Notices & Ledger
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sub-Block 1: Society Notices */}
            <div
              onClick={() => setActiveSub('notices')}
              className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-slate-300 shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Megaphone className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
              </div>
              <div className="mt-4">
                <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                  Society Notices
                </h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                  View Announcements & Letters
                </p>
              </div>
            </div>

            {/* Sub-Block 2: Financial Ledger */}
            <div
              onClick={() => setActiveSub('financials')}
              className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-slate-300 shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
              </div>
              <div className="mt-4">
                <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                  Financial Ledger
                </h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                  Monthly Statement Audit Ledgers
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCREEN: SOCIETY NOTICES ==================== */}
      {activeSub === 'notices' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveSub('menu')}
              className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition select-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Notices ({filteredNotices.length})
            </span>
          </div>

          {filteredNotices.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-2xl bg-slate-50/20">
              <Bell className="w-8 h-8 text-slate-200 mb-2 animate-bounce" />
              <p className="text-xs font-semibold">No active notices for Wing {wing} Flat {flatNo}.</p>
            </div>
          ) : (
            /* Split layout container */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[420px]">
              
              {/* Left Column: Master List of Compact Notices (Supports Mobile Expandable Accordions) */}
              <div className="md:col-span-5 border-r border-slate-100 pr-0 md:pr-4 space-y-2 max-h-[480px] overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notice Directory</p>
                {filteredNotices.map((notice) => {
                  const isSelected = selectedNoticeId === notice.id;
                  const isMobileExpanded = mobileExpandedNoticeId === notice.id;
                  const noticeTitle = notice.title || notice.text?.slice(0, 30) || 'Society Announcement';
                  const noticeCreatedAt = notice.createdAt || notice.timestamp || new Date().toISOString();
                  const targetType = notice.targetType || notice.target || 'all';

                  return (
                    <div id={`notice-${notice.id}`} key={notice.id} className="space-y-1">
                      <button
                        onClick={() => {
                          setSelectedNoticeId(notice.id);
                          setMobileExpandedNoticeId(isMobileExpanded ? null : notice.id);
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition border flex items-center space-x-3 cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-50' 
                            : 'bg-slate-50/40 border-slate-150 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`p-2 rounded-xl text-sm shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          📢
                        </span>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-slate-800 truncate leading-snug">
                            {noticeTitle}
                          </h5>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] text-slate-400 font-medium">
                              {new Date(noticeCreatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              targetType === 'all' 
                                ? 'bg-slate-100 text-slate-600' 
                                : targetType === 'wing' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {targetType === 'all' ? 'All' : targetType === 'wing' ? `Wing ${notice.targetWing || notice.wing}` : 'Flat'}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Mobile Expandable Detailed Content Inline Accordion */}
                      {isMobileExpanded && (
                        <div className="block md:hidden bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-3 mt-1.5 animate-in slide-in-from-top-2 duration-100 text-left">
                          <div className="text-xs text-slate-600 leading-relaxed bg-white p-3 border border-slate-150 rounded-xl shadow-2xs">
                            <p className="whitespace-pre-line text-[11px] font-medium text-slate-700">
                              {notice.content || notice.text}
                            </p>
                          </div>

                          {/* Connected Attachments Rendering inside Mobile Accordion */}
                          {((notice.attachments && notice.attachments.length > 0) || notice.mediaUrl || notice.pdfUrl) && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                Connected Attachments:
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {notice.mediaUrl && !(notice.attachments && notice.attachments.some((a: any) => a.url === notice.mediaUrl)) && (
                                  <ChunkedMedia
                                    fileId={notice.mediaUrl}
                                    type={notice.fileType || notice.mediaType || 'application/pdf'}
                                    fallbackName={notice.mediaName || 'Notice_Attachment'}
                                  />
                                )}
                                {notice.attachments && notice.attachments.map((att: any, idx: number) => (
                                  <ChunkedMedia
                                    key={idx}
                                    fileId={att.url}
                                    type={att.type}
                                    fallbackName={att.name || 'Notice_File'}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Detailed Notice Viewer (Desktop Only) */}
              <div className="hidden md:flex md:col-span-7 bg-slate-50/30 border border-slate-150 rounded-2xl p-5 flex-col justify-between max-h-[480px] overflow-y-auto">
                {(() => {
                  const notice = filteredNotices.find(n => n.id === selectedNoticeId) || filteredNotices[0];
                  if (!notice) return null;

                  const noticeTitle = notice.title || notice.text?.slice(0, 40) || 'Society Announcement';
                  const noticeContent = notice.content || notice.text || '';
                  const noticeCreatedAt = notice.createdAt || notice.timestamp || new Date().toISOString();
                  const targetType = notice.targetType || notice.target || 'all';

                  return (
                    <div className="space-y-4 text-left h-full flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200/60">
                          <div className="flex items-center space-x-2">
                            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl shrink-0 text-sm">
                              🔔
                            </span>
                            <div>
                              <h4 className="font-display font-black text-sm text-slate-800 uppercase tracking-tight">
                                {noticeTitle}
                              </h4>
                              <p className="text-[9px] text-slate-400 font-mono flex items-center mt-0.5">
                                <Calendar className="w-3.5 h-3.5 mr-1" /> Posted on {new Date(noticeCreatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-150 px-2.5 py-0.5 rounded-full uppercase">
                            {targetType === 'all' ? 'All Residents' : targetType === 'wing' ? `Wing ${notice.targetWing || notice.wing} Only` : `Flat ${notice.targetWing || notice.wing}-${notice.targetFlat || notice.flatNo}`}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 leading-relaxed bg-white p-4 border border-slate-150 rounded-xl shadow-2xs overflow-y-auto max-h-[200px]">
                          <p className="whitespace-pre-line">{noticeContent}</p>
                        </div>
                      </div>

                      {/* Attachments rendering */}
                      {((notice.attachments && notice.attachments.length > 0) || notice.mediaUrl || notice.pdfUrl) && (
                        <div className="space-y-2 mt-4 pt-3 border-t border-slate-200/50">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Attachments ({notice.attachments?.length || 1}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {notice.mediaUrl && !(notice.attachments && notice.attachments.some((a: any) => a.url === notice.mediaUrl)) && (
                              <ChunkedMedia
                                fileId={notice.mediaUrl}
                                type={notice.fileType || 'image/jpeg'}
                                fallbackName={notice.fileName || 'Notice_Attachment'}
                              />
                            )}
                            {notice.pdfUrl && !(notice.attachments && notice.attachments.some((a: any) => a.url === notice.pdfUrl)) && (
                              <ChunkedMedia
                                fileId={notice.pdfUrl}
                                type={notice.fileType || 'application/pdf'}
                                fallbackName={notice.fileName || 'Document_Notice'}
                              />
                            )}
                            {notice.attachments && notice.attachments.map((att: any, idx: number) => (
                              <ChunkedMedia
                                key={idx}
                                fileId={att.url}
                                type={att.type}
                                fallbackName={att.name || 'Notice_File'}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ==================== SCREEN: RESOLUTION TICKET BOARD ==================== */}
      {activeSub === 'complaints' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          {viewMode !== 'complaints' && (
            <div className="border-b border-slate-100 pb-3">
              <button
                onClick={() => setActiveSub('menu')}
                className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition select-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Menu</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 text-left">
              <div className="flex items-center space-x-1.5">
                <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">File a Society Ticket</h4>
              </div>

              {compError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-100">{compError}</div>}
              {compSuccess && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-xs border border-emerald-100">{compSuccess}</div>}

              <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Ticket Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lift not working in Wing B"
                    value={compTitle}
                    onChange={(e) => setCompTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Detailed Description</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide description of leakages, repairs, wiring issues..."
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none resize-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Drag and Drop Upload Box */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                    Connect Files (Photos, Videos, PDFs, etc.)
                  </label>
                  <div
                    onClick={() => document.getElementById('comp-file-picker')?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files) {
                        for (let i = 0; i < e.dataTransfer.files.length; i++) {
                          addCompAttachment(e.dataTransfer.files[i]);
                        }
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      id="comp-file-picker"
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf,text/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          for (let i = 0; i < e.target.files.length; i++) {
                            addCompAttachment(e.target.files[i]);
                          }
                        }
                      }}
                    />

                    <div className="space-y-1 text-slate-500">
                      <Upload className="w-5 h-5 mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">Drag & Drop or Click to Upload Multiple</p>
                      <p className="text-[9px] text-slate-400">PDF, PNG, JPG, MP4, JPEG accepted</p>
                    </div>
                  </div>

                  {/* Multiple Attachments Preview List */}
                  {compAttachments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Selected Attachments ({compAttachments.length}):</p>
                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                        {compAttachments.map((att, index) => (
                          <div key={index} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-sans">
                            <span className="truncate max-w-[80%] text-slate-600 font-semibold">{att.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompAttachments(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm select-none"
                >
                  {submitting ? 'Filing Complaint...' : 'Submit Ticket to Admin'}
                </button>
              </form>
            </div>

            {/* Complaints Board */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2.5">
                Resolution Board
              </h4>

              {loadingComplaints ? (
                <div className="py-8 text-center text-slate-400">Loading tickets...</div>
              ) : complaints.filter(c => c.wing === wing && c.flatNo === flatNo).length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/20">
                  <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">You have not filed any tickets yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
                  {complaints
                    .filter((c) => c.wing === wing && c.flatNo === flatNo)
                    .map((item) => (
                      <div id={`complaint-${item.id}`} key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                              Ticket #{item.id?.substring(0, 5) || 'COMP'}
                            </span>
                            <h5 className="font-bold text-slate-800 mt-1 uppercase leading-snug">{item.title}</h5>
                          </div>

                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            item.status === 'Resolved' || item.status === 'processed' || item.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.status || 'Received'}
                          </span>
                        </div>

                        <p className="text-slate-600 leading-relaxed text-left bg-white p-2.5 rounded-lg border border-slate-200/50">
                          {item.description}
                        </p>

                        {/* Chunked Attachments rendering */}
                        {((item.attachments && item.attachments.length > 0) || item.mediaUrl) && (
                          <div className="space-y-2 text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connected Attachments:</p>
                            <div className="grid grid-cols-1 gap-2.5 max-w-lg">
                              {item.mediaUrl && !(item.attachments && item.attachments.some((a: any) => a.url === item.mediaUrl)) && (
                                <ChunkedMedia
                                  fileId={item.mediaUrl}
                                  type={item.mediaType || 'image/jpeg'}
                                  fallbackName={item.mediaName || 'Ticket_Attachment'}
                                />
                              )}

                              {item.attachments && item.attachments.map((att: any, idx: number) => (
                                <ChunkedMedia
                                  key={idx}
                                  fileId={att.url}
                                  type={att.type}
                                  fallbackName={att.name || 'Connected_File'}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Process feedback notes */}
                        {item.resolutionNotes && (
                          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-indigo-900 space-y-1">
                            <p className="font-bold uppercase tracking-wider text-[8px] text-indigo-600">Secretary Update:</p>
                            <p className="font-medium text-left">{item.resolutionNotes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCREEN: FINANCIAL STATEMENT LEDGER ==================== */}
      {activeSub === 'financials' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveSub('menu')}
              className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition select-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Ledger Statements ({financials.length})
            </span>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2.5 text-left">
              Quarterly Financial Statements & Maintenance Audit Ledgers
            </h4>

            {loadingFinancials ? (
              <div className="py-8 text-center text-slate-400">Loading financial list...</div>
            ) : financials.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/20">
                <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs">No ledger statements uploaded by secretary yet.</p>
              </div>
            ) : (
              /* Split layout container */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[420px]">
                
                {/* Left Column: Master List of Compact Financial Statements (Supports Mobile Expandable Accordions) */}
                <div className="md:col-span-5 border-r border-slate-100 pr-0 md:pr-4 space-y-2 max-h-[480px] overflow-y-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Statement History</p>
                  {financials.map((report) => {
                    const isSelected = selectedFinancialId === report.id;
                    const isMobileExpanded = mobileExpandedFinancialId === report.id;
                    const reportTitle = report.title || 'Ledger Report';
                    const reportDate = report.createdAt || new Date().toISOString();
                    const reportType = report.reportType || report.type || 'Balance Sheet';
                    const amount = report.totalExpense || 0;

                    return (
                      <div id={`ledger-${report.id}`} key={report.id} className="space-y-1">
                        <button
                          onClick={() => {
                            setSelectedFinancialId(report.id);
                            setMobileExpandedFinancialId(isMobileExpanded ? null : report.id);
                          }}
                          className={`w-full text-left p-3 rounded-2xl transition border flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-50' 
                              : 'bg-slate-50/40 border-slate-150 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                            <span className={`p-2 rounded-xl text-sm shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                              💰
                            </span>
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs text-slate-800 truncate leading-snug">
                                {reportTitle}
                              </h5>
                              <div className="flex items-center space-x-1.5 mt-1">
                                <span className="text-[8px] font-semibold text-slate-400 font-mono">
                                  {new Date(reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full uppercase">
                                  {reportType}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-black text-indigo-700 font-mono shrink-0">
                            ₹{amount.toLocaleString('en-IN')}
                          </span>
                        </button>

                        {/* Mobile Expandable Detailed Content Inline Accordion */}
                        {isMobileExpanded && (
                          <div className="block md:hidden bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-3 mt-1.5 animate-in slide-in-from-top-2 duration-100 text-left">
                            {/* Beautiful Mobile Receipt Outlay Board */}
                            <div className="bg-white p-3.5 border border-slate-150 rounded-xl shadow-2xs space-y-2.5 text-left">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Expense:</span>
                                <span className="text-xs font-black text-emerald-600 font-mono">
                                  ₹ {amount.toLocaleString('en-IN')}
                                </span>
                              </div>
                              {report.description && (
                                <div className="space-y-1">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Statement Description:</span>
                                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium whitespace-pre-line max-h-[140px] overflow-y-auto">
                                    {report.description}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Connected Attachments Rendering inside Mobile Accordion */}
                            {((report.attachments && report.attachments.length > 0) || report.mediaUrl) && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                  Connected Attachments:
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                  {report.mediaUrl && !(report.attachments && report.attachments.some((a: any) => a.url === report.mediaUrl)) && (
                                    <ChunkedMedia
                                      fileId={report.mediaUrl}
                                      type={report.fileType || 'application/pdf'}
                                      fallbackName={report.mediaName || 'Statement_Report'}
                                    />
                                  )}
                                  {report.attachments && report.attachments.map((att: any, idx: number) => (
                                    <ChunkedMedia
                                      key={idx}
                                      fileId={att.url}
                                      type={att.type}
                                      fallbackName={att.name || 'Statement_File'}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Detailed Statement Audit Receipt (Desktop Only) */}
                <div className="hidden md:flex md:col-span-7 bg-slate-50/30 border border-slate-150 rounded-2xl p-5 flex-col justify-between max-h-[480px] overflow-y-auto">
                  {(() => {
                    const report = financials.find(r => r.id === selectedFinancialId) || financials[0];
                    if (!report) return null;

                    const reportTitle = report.title || 'Ledger Report';
                    const reportDate = report.createdAt || new Date().toISOString();
                    const reportType = report.reportType || report.type || 'Balance Sheet';
                    const amount = report.totalExpense || 0;

                    return (
                      <div className="space-y-4 text-left h-full flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl shrink-0 text-sm">
                                📑
                              </span>
                              <div>
                                <h4 className="font-display font-black text-sm text-slate-800 uppercase tracking-tight">
                                  {reportTitle}
                                </h4>
                                <p className="text-[9px] text-slate-400 font-mono flex items-center mt-0.5">
                                  <Calendar className="w-3.5 h-3.5 mr-1" /> Audited on {new Date(reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-150 px-2.5 py-0.5 rounded-full uppercase">
                              {reportType}
                            </span>
                          </div>

                          {/* Beautiful Receipt Outlay Board */}
                          <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statement Outlay:</span>
                              <span className="text-sm font-black text-emerald-600 font-mono">
                                ₹ {amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {report.description && (
                              <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Description & Notes:</span>
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line max-h-[180px] overflow-y-auto">
                                  {report.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Attachments rendering */}
                        {((report.attachments && report.attachments.length > 0) || report.mediaUrl) && (
                          <div className="space-y-2 mt-4 pt-3 border-t border-slate-200/50">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Statements & Receipts ({report.attachments?.length || 1}):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {report.mediaUrl && !(report.attachments && report.attachments.some((a: any) => a.url === report.mediaUrl)) && (
                                <ChunkedMedia
                                  fileId={report.mediaUrl}
                                  type={report.fileType || 'application/pdf'}
                                  fallbackName={report.mediaName || 'Statement_Report'}
                                />
                              )}
                              {report.attachments && report.attachments.map((att: any, idx: number) => (
                                <ChunkedMedia
                                  key={idx}
                                  fileId={att.url}
                                  type={att.type}
                                  fallbackName={att.name || 'Statement_File'}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
