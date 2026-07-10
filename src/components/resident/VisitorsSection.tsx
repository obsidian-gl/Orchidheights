import React from 'react';
import { Bell, ShieldAlert, Check, X, ClipboardList, Clock, Trash2, Download } from 'lucide-react';
import { Visitor } from '../../types';

interface VisitorsSectionProps {
  wing: string;
  flatNo: number;
  activePoll: Visitor[];
  guestHistory: Visitor[];
  loadingHistory: boolean;
  rejectingId: string | null;
  setRejectingId: (id: string | null) => void;
  rejectReasonText: string;
  setRejectReasonText: (text: string) => void;
  handleRespond: (id: string, status: 'approved' | 'rejected', customReason?: string) => void;
  handleDeleteHistoryRecord: (id: string, name: string) => void;
  handleDownloadVisitorReport: () => void;
  isAlarmActive: boolean;
  stopAlarm: () => void;
}

export default function VisitorsSection({
  wing,
  flatNo,
  activePoll,
  guestHistory,
  loadingHistory,
  rejectingId,
  setRejectingId,
  rejectReasonText,
  setRejectReasonText,
  handleRespond,
  handleDeleteHistoryRecord,
  handleDownloadVisitorReport,
  isAlarmActive,
  stopAlarm
}: VisitorsSectionProps) {
  return (
    <div className="space-y-6 text-left">
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
            onClick={stopAlarm}
            className="w-full sm:w-auto bg-white text-red-600 hover:bg-red-50 text-xs font-extrabold uppercase px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Silence Alarm
          </button>
        </div>
      )}

      {/* Active Pending Approvals alerts */}
      {activePoll.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-amber-600 rounded-3xl p-6 text-white shadow-2xl border-2 border-amber-400 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Bell className="w-40 h-40" />
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-300 animate-bounce" />
            <span className="font-display font-bold text-xs uppercase tracking-widest text-amber-200">
              Visitor Waiting At Gate! (ઓર્કીડ સેક્યુરીટી ગેટ)
            </span>
          </div>

          <div className="space-y-4">
            {activePoll.map((visitor) => (
              <div
                key={visitor.id}
                className="bg-slate-900/90 border border-white/20 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-6 text-left"
              >
                <div className="w-28 h-28 bg-slate-800 rounded-xl overflow-hidden border-2 border-white/40 shadow-inner shrink-0">
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
                    Awaiting approval since {new Date(visitor.requestTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
        </div>
      )}

      {/* Guest History & Reports log */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <h3 className="font-display font-bold text-base text-slate-800">Guest History & Reports</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Logs populate as soon as visitors register at the security gate.</p>
          </div>
          <button
            onClick={handleDownloadVisitorReport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer select-none"
          >
            <Download className="w-4 h-4" />
            <span>Download 3-Month Report</span>
          </button>
        </div>

        {loadingHistory && guestHistory.length === 0 ? (
          <div className="py-12 flex items-center justify-center">
            <span className="inline-block border-2 border-indigo-600 border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
          </div>
        ) : guestHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 py-12 border-2 border-dashed border-slate-150 rounded-xl">
            <ClipboardList className="w-10 h-10 text-slate-200 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No Visitor Logs Available</p>
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
                      <span className="text-xs font-bold text-slate-800 truncate uppercase block">{log.fullName}</span>
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
                    {new Date(log.requestTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(log.requestTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
    </div>
  );
}
