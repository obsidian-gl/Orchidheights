import React from 'react';
import { Wrench, Plus, Trash2, ShieldCheck, Users } from 'lucide-react';
import { DailyHelper } from '../../types';

interface LocalServicesSectionProps {
  wing: string;
  flatNo: number;
  dailyHelpers: DailyHelper[];
  handleToggleHelperMapping: (id: string) => void;
}

export default function LocalServicesSection({
  wing,
  flatNo,
  dailyHelpers,
  handleToggleHelperMapping
}: LocalServicesSectionProps) {
  const myFlatId = `${wing}-${flatNo}`;

  return (
    <div className="space-y-4 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center space-x-2.5 mb-3 border-b border-slate-100 pb-2.5">
          <Wrench className="w-4.5 h-4.5 text-indigo-600" />
          <div>
            <h3 className="font-display font-bold text-sm text-slate-800">Orchid Heights Local Services</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Manage recurring household help mapped to your flat</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mb-4 leading-normal">
          Assign helpers to your flat. Mapped helpers bypass gatekeeper approval alerts automatically.
        </p>

        {dailyHelpers.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs font-semibold">No local services registered in the society.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {dailyHelpers.map((helper) => {
              const isAssigned = helper.flats?.includes(myFlatId) || false;
              // Clean up any parenthetical duplicate name
              const cleanName = helper.name.replace(/\s*\([^)]*\)\s*/gi, '').trim();

              return (
                <div
                  key={helper.id}
                  className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center space-x-2.5 text-left min-w-0 flex-1">
                    <span className="text-xl bg-white border border-slate-100 p-1.5 rounded-lg shrink-0 shadow-xs">
                      {helper.role === 'Maid' ? '🧹' : helper.role === 'Milkman' ? '🥛' : helper.role === 'Car Cleaner' ? '🧽' : '🔧'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[120px]" title={cleanName}>
                          {cleanName}
                        </span>
                        {isAssigned && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase flex items-center font-mono tracking-wider">
                            <ShieldCheck className="w-2 h-2 mr-0.5" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">Role: {helper.role} • {helper.phone}</p>
                      
                      {helper.flats && helper.flats.length > 0 && (
                        <div className="mt-1 text-[8px] text-slate-500 flex items-center gap-1">
                          <span className="font-bold uppercase tracking-wide text-slate-400">Working in:</span>{' '}
                          <span className="font-mono font-bold bg-white px-1 border rounded text-[8px] max-w-[100px] truncate">
                            {helper.flats.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleHelperMapping(helper.id)}
                    className={`py-1 px-2.5 rounded-lg text-[9px] font-extrabold uppercase transition-all duration-150 cursor-pointer shadow-xs select-none shrink-0 ${
                      isAssigned
                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isAssigned ? 'Remove' : 'Assign'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
