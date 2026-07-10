import React from 'react';
import { Megaphone, Calendar, Clock, Bell } from 'lucide-react';

interface NoticeSectionProps {
  wing: string;
  flatNo: number;
  announcements: any[];
}

export default function NoticeSection({
  wing,
  flatNo,
  announcements
}: NoticeSectionProps) {
  // Filter announcements matching wing & flatNo target criteria
  const filteredNotices = announcements.filter(item => {
    // If target type is all, everyone sees it
    if (item.targetType === 'all') return true;
    
    // If target type is wing, match current wing
    if (item.targetType === 'wing') {
      return item.targetWing?.toLowerCase() === wing.toLowerCase();
    }

    // If target type is flat, match current wing & flatNo
    if (item.targetType === 'flat') {
      return item.targetWing?.toLowerCase() === wing.toLowerCase() && Number(item.targetFlat) === Number(flatNo);
    }

    return true;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 pb-3">
          <Megaphone className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-display font-bold text-base text-slate-800">Orchid Heights Society Announcements</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Important updates from society Secretary Rahul Popat</p>
          </div>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-xl">
            <Bell className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-xs font-semibold">No active notices for Wing {wing} Flat {flatNo}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotices.map((notice) => (
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
                        {notice.title}
                      </h4>
                      <p className="text-[9px] text-slate-400 font-mono flex items-center mt-0.5">
                        <Calendar className="w-3.5 h-3.5 mr-1" /> Posted on {new Date(notice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-150 px-2.5 py-0.5 rounded-full uppercase self-start sm:self-center">
                    {notice.targetType === 'all' ? 'All Residents' : notice.targetType === 'wing' ? `Wing ${notice.targetWing} Only` : `Flat ${notice.targetWing}-${notice.targetFlat}`}
                  </span>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed text-left bg-white p-4 border border-slate-150 rounded-xl">
                  <p className="whitespace-pre-line">{notice.content}</p>
                </div>

                {notice.mediaUrl && (
                  <div className="border border-slate-150 rounded-xl overflow-hidden max-w-lg bg-slate-200">
                    <img
                      src={notice.mediaUrl}
                      alt="Notice Attachment"
                      className="w-full h-auto object-cover max-h-[300px]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
