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
  const [activeSub, setActiveSub] = useState<'menu' | 'notices' | 'complaints' | 'financials'>(
    viewMode === 'complaints' ? 'complaints' : 'menu'
  );

  // Monitor notification redirects
  useEffect(() => {
    if (activeTabOverride) {
      setActiveSub(activeTabOverride);
      if (onClearOverride) onClearOverride();
    }
  }, [activeTabOverride]);

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
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
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

          <div className="space-y-4">
            {filteredNotices.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-2xl bg-slate-50/20">
                <Bell className="w-8 h-8 text-slate-200 mb-2 animate-bounce" />
                <p className="text-xs font-semibold">No active notices for Wing {wing} Flat {flatNo}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotices.map((notice) => {
                  const noticeTitle = notice.title || notice.text?.slice(0, 40) || 'Society Announcement';
                  const noticeContent = notice.content || notice.text || '';
                  const noticeCreatedAt = notice.createdAt || notice.timestamp || new Date().toISOString();
                  const targetType = notice.targetType || notice.target || 'all';
                  const targetWing = notice.targetWing || notice.wing || '';
                  const targetFlat = notice.targetFlat || notice.flatNo || '';

                  return (
                    <div
                      key={notice.id}
                      className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="p-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl shrink-0 text-lg">
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

                        <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-150 px-2.5 py-0.5 rounded-full uppercase self-start sm:self-center">
                          {targetType === 'all' ? 'All Residents' : targetType === 'wing' ? `Wing ${targetWing} Only` : `Flat ${targetWing}-${targetFlat}`}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 leading-relaxed text-left bg-white p-4 border border-slate-150 rounded-xl">
                        <p className="whitespace-pre-line">{noticeContent}</p>
                      </div>

                      {/* Dynamic Chunked Attachments rendering */}
                      {((notice.attachments && notice.attachments.length > 0) || notice.mediaUrl || notice.pdfUrl) && (
                        <div className="space-y-2 mt-2 text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Attachments ({notice.attachments?.length || 1}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                            {/* Legacy fallbacks mapped into ChunkedMedia seamlessly */}
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

                            {/* Multiple chunked attachments */}
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
                })}
              </div>
            )}
          </div>
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
                      <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
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
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {financials.map((report) => (
                  <div key={report.id} className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 flex flex-col justify-between hover:border-slate-300 transition shadow-sm text-left">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {report.reportType || report.type || 'Balance Sheet'}
                        </span>
                        <span className="text-xs font-black text-indigo-700 font-mono">
                          ₹ {report.totalExpense?.toLocaleString('en-IN') || 0}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-800 uppercase leading-snug">{report.title}</h5>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Date: {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {report.description && (
                        <p className="text-[11px] text-slate-600 bg-white p-2.5 border border-slate-150 rounded leading-relaxed whitespace-pre-line">
                          {report.description}
                        </p>
                      )}
                    </div>

                    {/* Dynamic Chunked Attachments rendering for financials */}
                    {((report.attachments && report.attachments.length > 0) || report.mediaUrl) && (
                      <div className="border-t border-slate-200/60 pt-3 mt-3 space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Connected Attachments ({report.attachments?.length || 1}):
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
