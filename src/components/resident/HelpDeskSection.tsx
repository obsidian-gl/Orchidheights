import React, { useState } from 'react';
import { FileText, ClipboardList, AlertCircle, Plus, Upload, X, Download, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';

interface HelpDeskSectionProps {
  wing: string;
  flatNo: number;
  complaints: any[];
  loadingComplaints: boolean;
  financials: any[];
  loadingFinancials: boolean;
  onRefreshComplaints: () => void;

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
  const [activeSub, setActiveSub] = useState<'complaints' | 'financials'>('complaints');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
        flatNo
      };

      if (compMedia) {
        payload.mediaUrl = compMedia;
        payload.mediaName = compMediaName;
        payload.mediaType = compMediaType;
      }

      const res = await api.createComplaint(payload);
      if (res && res.id) {
        setCompSuccess('Complaint filed successfully!');
        setCompTitle('');
        setCompDesc('');
        setCompMedia('');
        setCompMediaName('');
        setCompMediaType('');
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

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Tab Selection */}
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl mb-6">
          <button
            onClick={() => setActiveSub('complaints')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${activeSub === 'complaints' ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Complaints Helpdesk</span>
          </button>
          <button
            onClick={() => setActiveSub('financials')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${activeSub === 'financials' ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <FileText className="w-4 h-4" />
            <span>Financial Statements Ledger</span>
          </button>
        </div>

        {/* --- SubTab: Complaints --- */}
        {activeSub === 'complaints' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 text-left">
              <div className="flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">File a Society Complaint</h4>
              </div>

              {compError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-100">{compError}</div>}
              {compSuccess && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-xs border border-emerald-100">{compSuccess}</div>}

              <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Complaint Title</label>
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
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Attachment (Photo, PDF, or Document)</label>
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
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                      compMedia
                        ? 'border-emerald-300 bg-emerald-50/10'
                        : isDragging
                        ? 'border-indigo-500 bg-indigo-50/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      id="comp-file-picker"
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />

                    {compMedia ? (
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-600">✓ Attachment Ready</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{compMediaName}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompMedia('');
                            setCompMediaName('');
                            setCompMediaType('');
                          }}
                          className="text-[10px] text-red-500 hover:underline font-bold"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500">
                        <Upload className="w-5 h-5 mx-auto text-slate-400" />
                        <p className="text-xs font-bold text-slate-700">Drag & Drop or Click to Upload</p>
                        <p className="text-[9px] text-slate-400">PDF, PNG, JPG, JPEG accepted</p>
                      </div>
                    )}
                  </div>
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
                My Filed Complaints Board
              </h4>

              {loadingComplaints ? (
                <div className="py-8 text-center text-slate-400">Loading tickets...</div>
              ) : complaints.filter(c => c.wing === wing && c.flatNo === flatNo).length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/20">
                  <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">You have not filed any complaints yet.</p>
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

                        {item.mediaUrl && (
                          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-150 w-fit max-w-full">
                            <span className="text-[10px] text-slate-500 truncate block max-w-[200px] font-mono">📎 {item.mediaName || 'attachment'}</span>
                            <a
                              href={item.mediaUrl}
                              download={item.mediaName || 'complaint_media'}
                              className="text-[10px] text-indigo-600 hover:underline font-bold shrink-0"
                            >
                              Download
                            </a>
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

                    {report.mediaUrl && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">📎 {report.mediaName || 'statement'}</span>
                        <a
                          href={report.mediaUrl}
                          download={report.mediaName || 'report'}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-[10px] flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download File</span>
                        </a>
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
