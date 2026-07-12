import React, { useState } from 'react';
import { FileText, ClipboardList, AlertCircle, Plus, Upload, X, Download, MessageSquare, Megaphone, Bell, Calendar } from 'lucide-react';
import { api } from '../../lib/api';

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
  handleFileChange
}: HelpDeskSectionProps) {
  const [activeSub, setActiveSub] = useState<'notices' | 'complaints' | 'financials'>(
    viewMode === 'complaints' ? 'complaints' : 'notices'
  );
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
    <div className="space-y-6 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Tab Selection */}
        {viewMode !== 'complaints' && (
          <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-1.5 rounded-xl mb-6">
            <button
              onClick={() => setActiveSub('notices')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${activeSub === 'notices' ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Society Notices</span>
            </button>
            {viewMode !== 'helpdesk' && (
              <button
                onClick={() => setActiveSub('complaints')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${activeSub === 'complaints' ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Resolution Board (Tickets)</span>
              </button>
            )}
            <button
              onClick={() => setActiveSub('financials')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${activeSub === 'financials' ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <FileText className="w-4 h-4" />
              <span>Financial Ledger</span>
            </button>
          </div>
        )}

        {/* --- SubTab: Society Notices --- */}
        {activeSub === 'notices' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-600">
                Society Notice Board
              </h4>
            </div>

            {filteredNotices.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-xl bg-slate-50/20">
                <Bell className="w-8 h-8 text-slate-200 mb-2" />
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
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg shrink-0">
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

                      {/* Render all multi-file notice attachments for residents */}
                      {((notice.attachments && notice.attachments.length > 0) || notice.mediaUrl || notice.pdfUrl) && (
                        <div className="space-y-1.5 mt-2 text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments ({notice.attachments?.length || 1}):</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                            {/* Legacy mediaUrl image fallback */}
                            {notice.mediaUrl && !(notice.attachments && notice.attachments.some((a: any) => a.url === notice.mediaUrl)) && (
                              <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-200 col-span-full">
                                <img
                                  src={notice.mediaUrl}
                                  alt="Notice Attachment"
                                  className="w-full h-auto object-cover max-h-[220px]"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {/* Legacy pdfUrl fallback */}
                            {notice.pdfUrl && !(notice.attachments && notice.attachments.some((a: any) => a.url === notice.pdfUrl)) && (
                              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs col-span-full shadow-sm">
                                <div className="flex items-center space-x-2 truncate">
                                  {notice.fileType?.startsWith('image/') ? (
                                    <img src={notice.pdfUrl} className="w-10 h-10 object-cover rounded border border-slate-150" />
                                  ) : (
                                    <FileText className="w-8 h-8 text-indigo-500 shrink-0" />
                                  )}
                                  <div className="text-left truncate">
                                    <p className="font-bold text-slate-700 truncate max-w-[150px]">{notice.fileName || 'Attachment_Notice'}</p>
                                    <p className="text-[9px] text-slate-400 uppercase font-mono">{notice.fileType || 'file'}</p>
                                  </div>
                                </div>
                                <a
                                  href={notice.pdfUrl}
                                  download={notice.fileName || 'notice_attachment'}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center space-x-1 cursor-pointer transition shadow"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>
                              </div>
                            )}

                            {/* Multi attachments list */}
                            {notice.attachments && notice.attachments.map((att: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col gap-2 shadow-sm text-left">
                                {att.type?.startsWith('image/') ? (
                                  <div className="rounded border overflow-hidden max-h-[140px] bg-slate-100">
                                    <img src={att.url} className="w-full object-cover max-h-[140px]" referrerPolicy="no-referrer" />
                                  </div>
                                ) : att.type?.startsWith('video/') ? (
                                  <video src={att.url} controls className="max-h-[140px] w-full rounded border bg-black" />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="w-6 h-6 text-indigo-500 shrink-0" />
                                    <p className="font-bold text-slate-700 truncate text-[11px] max-w-[150px]">{att.name}</p>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-[10px]">
                                  {!att.type?.startsWith('image/') && !att.type?.startsWith('video/') && (
                                    <span className="text-[8px] text-slate-400 font-mono uppercase">{att.type?.split('/')[1] || 'FILE'}</span>
                                  )}
                                  <a
                                    href={att.url}
                                    download={att.name || 'Attachment'}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2.5 rounded text-[10px] flex items-center space-x-1 cursor-pointer ml-auto transition shadow-sm"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </a>
                                </div>
                              </div>
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
        )}

        {/* --- SubTab: Complaints --- */}
        {activeSub === 'complaints' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 text-left">
              <div className="flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-red-500" />
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
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Detailed Description</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide description of leakages, repairs, wiring issues, or other issues..."
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none resize-none"
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
                            <span className="truncate max-w-[80%] text-slate-600 font-medium">{att.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompAttachments(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="text-red-500 hover:text-red-700 font-bold"
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
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
                            <h5 className="font-bold text-slate-800 mt-1 uppercase">{item.title}</h5>
                          </div>

                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            item.status === 'Resolved' || item.status === 'processed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.status || 'Received'}
                          </span>
                        </div>

                        <p className="text-slate-600 leading-relaxed text-left bg-white p-2.5 rounded-lg border border-slate-200/50">
                          {item.description}
                        </p>

                        {/* Attachments rendering */}
                        {((item.attachments && item.attachments.length > 0) || item.mediaUrl) && (
                          <div className="space-y-2 text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connected Attachments:</p>
                            <div className="flex flex-wrap gap-2.5">
                              {/* Legacy single attachment fallback */}
                              {item.mediaUrl && !(item.attachments && item.attachments.some((a: any) => a.url === item.mediaUrl)) && (
                                <div className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center gap-2 max-w-xs shadow-sm">
                                  {item.mediaType?.startsWith('image/') ? (
                                    <img src={item.mediaUrl} className="w-9 h-9 object-cover rounded border border-slate-100" referrerPolicy="no-referrer" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1 text-[10px]">
                                    <p className="font-bold text-slate-700 truncate">{item.mediaName || 'Attachment'}</p>
                                    <a href={item.mediaUrl} download={item.mediaName || 'Attachment'} className="text-indigo-600 hover:underline font-extrabold">Download</a>
                                  </div>
                                </div>
                              )}

                              {/* Multi-attachments support */}
                              {item.attachments && item.attachments.map((att: any, idx: number) => (
                                <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-xl flex flex-col gap-1.5 max-w-xs shadow-sm">
                                  {att.type?.startsWith('image/') ? (
                                    <div className="relative group rounded border overflow-hidden max-h-[140px] max-w-[200px]">
                                      <img src={att.url} className="w-full object-cover max-h-[140px]" referrerPolicy="no-referrer" />
                                    </div>
                                  ) : att.type?.startsWith('video/') ? (
                                    <video src={att.url} controls className="max-h-[140px] max-w-[200px] rounded border" />
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                      <p className="font-bold text-slate-700 truncate max-w-[120px] text-[10px]">{att.name}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between text-[10px]">
                                    {!att.type?.startsWith('image/') && !att.type?.startsWith('video/') && (
                                      <span className="text-[8px] text-slate-400 font-mono uppercase">{att.type?.split('/')[1] || 'FILE'}</span>
                                    )}
                                    <a href={att.url} download={att.name || 'Attachment'} className="text-indigo-600 hover:underline font-extrabold ml-auto">Download</a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Admin Process feedback notes */}
                        {item.resolutionNotes && (
                          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-indigo-900 space-y-1">
                            <p className="font-bold uppercase tracking-wider text-[8px] text-indigo-600">Secretary / Commitee Process done updates:</p>
                            <p className="font-medium text-left">{item.resolutionNotes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- SubTab: Financial Ledger --- */}
        {activeSub === 'financials' && (
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
                      <span className="text-[9px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {report.type || 'Balance Sheet'}
                      </span>
                      <h5 className="font-bold text-xs text-slate-800 uppercase leading-snug">{report.title}</h5>
                      <p className="text-[10px] text-slate-500 font-mono">Date: {new Date(report.createdAt).toLocaleDateString('en-IN')}</p>
                      {report.notes && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 border border-slate-100 rounded leading-relaxed">{report.notes}</p>
                      )}
                    </div>

                    {/* Multi attachments list for financials */}
                    {((report.attachments && report.attachments.length > 0) || report.mediaUrl) && (
                      <div className="border-t border-slate-100 pt-3 mt-3 space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Connected Attachments ({report.attachments?.length || 1}):</p>
                        <div className="grid grid-cols-1 gap-2">
                          {/* Legacy mediaUrl fallback */}
                          {report.mediaUrl && !(report.attachments && report.attachments.some((a: any) => a.url === report.mediaUrl)) && (
                            <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between text-xs shadow-sm">
                              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">📎 {report.mediaName || 'statement'}</span>
                              <a
                                href={report.mediaUrl}
                                download={report.mediaName || 'report'}
                                className="text-indigo-600 hover:underline font-extrabold text-[10px] cursor-pointer"
                              >
                                Download
                              </a>
                            </div>
                          )}

                          {/* Multi attachments list */}
                          {report.attachments && report.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="bg-white border border-slate-200 p-2 rounded-xl flex flex-col gap-1 shadow-sm text-left">
                              {att.type?.startsWith('image/') ? (
                                <div className="rounded border overflow-hidden max-h-[80px] bg-slate-50">
                                  <img src={att.url} className="w-full object-cover max-h-[80px]" referrerPolicy="no-referrer" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <p className="font-bold text-slate-700 truncate text-[10px] max-w-[150px]">{att.name}</p>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[10px] mt-1">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
