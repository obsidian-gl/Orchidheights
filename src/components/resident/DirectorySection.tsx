import React from 'react';
import { Search, Users, Car, Phone, BookOpen, AlertCircle } from 'lucide-react';
import { FlatOwner, DailyHelper, AbsenceLog } from '../../types';

interface DirectorySectionProps {
  owners: FlatOwner[];
  directorySearch: string;
  setDirectorySearch: (text: string) => void;
  dailyHelpers: DailyHelper[];
  absenceLogs: AbsenceLog[];
}

export default function DirectorySection({
  owners,
  directorySearch,
  setDirectorySearch,
  dailyHelpers,
  absenceLogs
}: DirectorySectionProps) {
  // Filter owners
  const term = directorySearch.toLowerCase().trim();
  const filteredOwners = owners.filter((o) => {
    if (!term) return true;
    const matchName = o.nameEn.toLowerCase().includes(term) || (o.nameGu && o.nameGu.toLowerCase().includes(term));
    const matchFlat = `${o.wing}-${o.flatNo}`.toLowerCase().includes(term);
    const matchVehicles = o.vehicles.some(
      (v) => v.plateNumber.toLowerCase().includes(term) || v.brandModel.toLowerCase().includes(term)
    );
    const matchMembers = o.members.some((m) => m.toLowerCase().includes(term));
    return matchName || matchFlat || matchVehicles || matchMembers;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 pb-3">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h3 className="font-display font-bold text-base text-slate-800">Orchid Heights Resident Directory</h3>
        </div>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Search building neighbours, register plate plots, household members, and review active service helper mappings.
        </p>

        {/* Search Input bar */}
        <div className="relative mb-6">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search neighbour name, flat number (e.g. B-1104), family member, or vehicle plate..."
            value={directorySearch}
            onChange={(e) => setDirectorySearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-xs font-medium transition outline-none"
          />
        </div>

        {/* Results grid */}
        {filteredOwners.length === 0 ? (
          <div className="py-16 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-xs font-semibold">No Neighbours Match Your Search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-1">
            {filteredOwners.map((owner) => {
              const flatId = `${owner.wing}-${owner.flatNo}`;
              
              // Find active helper mappings for this flat
              const flatHelpers = dailyHelpers.filter((h) => h.flats.includes(flatId));
              
              // Check if currently away (has active absence log)
              const activeAbsence = absenceLogs.find((a) => a.flatId === flatId);

              return (
                <div
                  key={flatId}
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all duration-150 relative space-y-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-indigo-100 text-indigo-800 font-mono text-[9px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                        Flat {flatId}
                      </span>
                      <h4 className="font-display font-bold text-sm text-slate-800 uppercase mt-1">
                        {owner.nameEn}
                      </h4>
                      {owner.nameGu && (
                        <p className="text-xs text-slate-500 font-medium">{owner.nameGu}</p>
                      )}
                    </div>

                    {activeAbsence ? (
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <span>✈️ AWAY</span>
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">
                        Active Resident
                      </span>
                    )}
                  </div>

                  {/* Phone & contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-600 border-t border-slate-100 pt-2.5">
                    <p className="flex items-center">
                      <Phone className="w-3 h-3 text-slate-400 mr-1.5" />
                      <span>Phone: {owner.phone}</span>
                    </p>
                    {owner.secondaryContact && (
                      <p className="flex items-center">
                        <Phone className="w-3 h-3 text-slate-400 mr-1.5" />
                        <span>Alt: {owner.secondaryContact}</span>
                      </p>
                    )}
                  </div>

                  {/* Family members */}
                  {owner.members && owner.members.length > 0 && (
                    <div className="text-[10px] text-slate-500 bg-white border border-slate-200/50 p-2 rounded-lg">
                      <p className="font-bold text-[8px] text-slate-400 uppercase tracking-widest mb-1">
                        Household Members:
                      </p>
                      <p className="font-semibold text-slate-700 uppercase">
                        {owner.members.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Vehicles */}
                  {owner.vehicles && owner.vehicles.length > 0 && (
                    <div className="text-[10px] text-slate-500 space-y-1">
                      <p className="font-bold text-[8px] text-slate-400 uppercase tracking-widest">
                        Vehicles ({owner.vehicles.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {owner.vehicles.map((v) => (
                          <span
                            key={v.id}
                            className="inline-flex items-center bg-indigo-50/50 border border-indigo-100/50 text-indigo-800 px-2 py-0.5 rounded font-mono text-[9px] font-bold"
                          >
                            <span className="mr-1">{v.type === 'fourwheeler' ? '🚗' : '🏍️'}</span>
                            <span>{v.plateNumber} ({v.brandModel})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assigned Daily Helpers */}
                  {flatHelpers.length > 0 && (
                    <div className="text-[10px] text-slate-500">
                      <p className="font-bold text-[8px] text-slate-400 uppercase tracking-widest mb-1">
                        Assigned Helpers:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {flatHelpers.map((h) => (
                          <span
                            key={h.id}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-medium"
                          >
                            👤 {h.name} ({h.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Redirect Services alerts if Away */}
                  {activeAbsence && (
                    <div className="bg-amber-50/40 border border-amber-200/50 p-2.5 rounded-xl text-[10px] text-amber-800 space-y-1.5">
                      <p className="font-bold uppercase tracking-wider text-[8px] text-amber-600 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> Redirection Active (Away {new Date(activeAbsence.dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to {new Date(activeAbsence.dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}):
                      </p>
                      <div className="grid grid-cols-3 gap-2 font-semibold">
                        {activeAbsence.milkRedirectFlat && (
                          <p>🥛 Milk ➔ Flat {activeAbsence.milkRedirectFlat}</p>
                        )}
                        {activeAbsence.newspaperRedirectFlat && (
                          <p>📰 News ➔ Flat {activeAbsence.newspaperRedirectFlat}</p>
                        )}
                        {activeAbsence.parcelRedirectFlat && (
                          <p>📦 Parcel ➔ Flat {activeAbsence.parcelRedirectFlat}</p>
                        )}
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
  );
}
