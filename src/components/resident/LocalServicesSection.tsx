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
    <div className="space-y-6 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 pb-3">
          <Wrench className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-display font-bold text-base text-slate-800">Orchid Heights Local Services Directory</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Recurring daily maids, milkmen, and cleaners</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Manage recurring household helpers mapped to your flat. First-time registrations require approvals, but 
          <span className="font-bold text-indigo-600"> subsequent visits bypass gatekeeper alerts automatically</span> when mapped here.
        </p>

        {dailyHelpers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-xs font-semibold">No local services registered in the society.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyHelpers.map((helper) => {
              const isAssigned = helper.flats?.includes(myFlatId) || false;

              return (
                <div
                  key={helper.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden transition hover:border-slate-300"
                >
                  <div className="flex items-center space-x-3 text-left w-full sm:w-auto">
                    <span className="text-2xl bg-white border p-2 rounded-xl shrink-0 shadow-inner">
                      {helper.role === 'Maid' ? '🧹' : helper.role === 'Milkman' ? '🥛' : helper.role === 'Car Cleaner' ? '🧽' : '🔧'}
                    </span>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-slate-800 uppercase block">{helper.name}</span>
                        {isAssigned && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center font-mono">
                            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Assigned
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono font-medium text-slate-400 mt-0.5">Phone: {helper.phone} • Role: {helper.role}</p>
                      
                      {/* List flats mapped */}
                      {helper.flats && helper.flats.length > 0 && (
                        <div className="mt-2 text-[9px] text-slate-500">
                          <span className="font-bold uppercase text-[8px] tracking-wide text-slate-400">Works in flats:</span>{' '}
                          <span className="font-mono font-bold bg-white px-1.5 py-0.5 border rounded">
                            {helper.flats.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleHelperMapping(helper.id)}
                    className={`w-full sm:w-auto py-1.5 px-3 rounded-lg text-[10px] font-extrabold uppercase transition-all duration-150 transform hover:scale-[1.02] cursor-pointer shadow-sm select-none ${
                      isAssigned
                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isAssigned ? 'Remove Helper' : 'Assign to Flat'}
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
