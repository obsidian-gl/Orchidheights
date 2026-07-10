import React, { useState } from 'react';
import { Search, Users, Car, Phone, BookOpen, AlertCircle, Building, User, HelpCircle, Languages, Smartphone } from 'lucide-react';
import { FlatOwner, DailyHelper, AbsenceLog, UserSession } from '../../types';

interface DirectorySectionProps {
  owners: FlatOwner[];
  session: UserSession;
  directorySearch: string;
  setDirectorySearch: (text: string) => void;
  dailyHelpers: DailyHelper[];
  absenceLogs: AbsenceLog[];
  onEditTrigger?: (owner: FlatOwner) => void;
}

export default function DirectorySection({
  owners,
  session,
  directorySearch,
  setDirectorySearch,
  dailyHelpers,
  absenceLogs,
  onEditTrigger
}: DirectorySectionProps) {
  const [selectedWing, setSelectedWing] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');

  // Filter owners based on search query and wing/floor filters
  const filteredOwners = owners.filter((owner) => {
    // 1. Filter by Wing
    if (selectedWing !== 'ALL' && owner.wing !== selectedWing) return false;

    // 2. Filter by Floor
    if (selectedFloor !== 'ALL') {
      const floorNum = parseInt(selectedFloor, 10);
      const ownerFloor = Math.floor(owner.flatNo / 100);
      if (ownerFloor !== floorNum) return false;
    }

    // 3. Filter by search query
    if (directorySearch.trim() !== '') {
      const query = directorySearch.toLowerCase().trim();
      const matchFlat = `${owner.wing}-${owner.flatNo}`.toLowerCase().includes(query) || owner.flatNo.toString().includes(query);
      const matchNameEn = owner.nameEn.toLowerCase().includes(query);
      const matchNameGu = owner.nameGu && owner.nameGu.toLowerCase().includes(query);
      const matchPhone = owner.phone.includes(query);
      const matchSecondary = owner.secondaryContact?.includes(query);
      
      const matchVehicle = owner.vehicles.some(
        (v) => v.plateNumber.toLowerCase().includes(query) || v.brandModel.toLowerCase().includes(query)
      );
      
      const matchMembers = owner.members.some((m) => m.toLowerCase().includes(query));

      return matchFlat || matchNameEn || matchNameGu || matchPhone || matchSecondary || matchVehicle || matchMembers;
    }

    return true;
  });

  // Calculate meta stats
  const totalOccupied = owners.filter((o) => o.phone && !o.nameEn.toLowerCase().includes('vacant')).length;
  const totalVehicles = owners.reduce((acc, curr) => acc + curr.vehicles.length, 0);

  return (
    <div className="space-y-6 text-left">
      {/* Meta Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-tr from-indigo-50/50 to-indigo-100/50 border border-indigo-100 p-4.5 rounded-2xl flex items-center space-x-3.5 shadow-sm">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-sm">
            <Building className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[9px] text-indigo-500 uppercase tracking-wider font-extrabold">Building Capacity</p>
            <p className="text-lg font-display font-black text-slate-800 leading-tight">96 Flats <span className="text-[10px] font-normal text-slate-500">A & B Wings</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-tr from-emerald-50/50 to-emerald-100/50 border border-emerald-100 p-4.5 rounded-2xl flex items-center space-x-3.5 shadow-sm">
          <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-sm">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[9px] text-emerald-500 uppercase tracking-wider font-extrabold">Households</p>
            <p className="text-lg font-display font-black text-slate-800 leading-tight">{totalOccupied} Occupied <span className="text-[10px] font-normal text-slate-400">({96 - totalOccupied} vacant)</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-tr from-amber-50/50 to-amber-100/50 border border-amber-100 p-4.5 rounded-2xl flex items-center space-x-3.5 shadow-sm">
          <div className="bg-amber-600 text-white p-2.5 rounded-xl shadow-sm">
            <Car className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[9px] text-amber-500 uppercase tracking-wider font-extrabold">Vehicles Tracked</p>
            <p className="text-lg font-display font-black text-slate-800 leading-tight">{totalVehicles} Active</p>
          </div>
        </div>
      </div>

      {/* Directory Main Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-display font-black text-base text-slate-800 uppercase tracking-tight">Orchid Heights Directory</h3>
              <p className="text-[10px] text-slate-400 font-medium">Verify neighbours, vehicles, and daily helper associations</p>
            </div>
          </div>
        </div>

        {/* Filters and Search Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name, flat (B-1104), phone, helper or plate #..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold transition outline-none"
            />
          </div>

          {/* Quick Filter Controls */}
          <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
            {/* Wing Selection */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl text-[10px] font-extrabold uppercase">
              <button
                onClick={() => setSelectedWing('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${selectedWing === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedWing('A')}
                className={`px-3 py-1.5 rounded-lg transition ${selectedWing === 'A' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Wing A
              </button>
              <button
                onClick={() => setSelectedWing('B')}
                className={`px-3 py-1.5 rounded-lg transition ${selectedWing === 'B' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Wing B
              </button>
            </div>

            {/* Floor Selection */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-white border border-slate-200 hover:border-slate-300 text-[10px] font-extrabold uppercase rounded-xl px-3 py-1.5 outline-none transition cursor-pointer"
            >
              <option value="ALL">All Floors</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid of Cards */}
        {filteredOwners.length === 0 ? (
          <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-xs font-black text-slate-600">No matching flats found</p>
            <p className="text-[10px] text-slate-400 mt-1">Try resetting the search query or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredOwners.map((owner) => {
              const flatId = `${owner.wing}-${owner.flatNo}`;
              const isVacant = owner.nameEn.toLowerCase().includes('vacant');
              const flatHelpers = dailyHelpers.filter((h) => h.flats.includes(flatId));
              const activeAbsence = absenceLogs.find((a) => a.flatId === flatId);
              const isAdminEdit = session.role === 'admin' && onEditTrigger;

              return (
                <div
                  key={flatId}
                  className={`bg-slate-50/40 hover:bg-slate-50 border border-slate-200 rounded-2xl p-4.5 transition relative space-y-4 shadow-sm flex flex-col justify-between ${isVacant ? 'opacity-65' : ''}`}
                >
                  <div className="space-y-3 text-left">
                    {/* Top Row: Flat # & Badge */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className="bg-indigo-600 text-white font-mono text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                          Flat {flatId}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          Floor {Math.floor(owner.flatNo / 100)}
                        </span>
                      </div>

                      {activeAbsence ? (
                        <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                          <span>✈️ Away</span>
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">
                          {isVacant ? 'Vacant' : 'Resident'}
                        </span>
                      )}
                    </div>

                    {/* Owner Name */}
                    <div>
                      {isVacant ? (
                        <div>
                          <p className="font-bold text-slate-500 italic text-sm">Vacant Apartment</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">No registered details yet.</p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="font-display font-black text-sm text-slate-800 uppercase leading-snug">
                            {owner.nameEn}
                          </h4>
                          {owner.nameGu && (
                            <p className="text-xs text-indigo-700 font-bold font-sans mt-0.5">{owner.nameGu}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Contact Phone (Residents only) */}
                    {!isVacant && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-600 border-t border-slate-100 pt-3">
                        <p className="flex items-center font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                          {owner.phone ? (
                            <a href={`tel:+91${owner.phone}`} className="text-indigo-600 hover:underline font-mono">+91 {owner.phone}</a>
                          ) : (
                            <span className="text-slate-400">No phone listed</span>
                          )}
                        </p>
                        {owner.secondaryContact && (
                          <p className="flex items-center font-medium italic text-slate-500">
                            <Phone className="w-3 h-3 text-slate-300 mr-1.5 shrink-0" />
                            <a href={`tel:+91${owner.secondaryContact}`} className="hover:underline font-mono">Alt: +91 {owner.secondaryContact}</a>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Family Members */}
                    {owner.members && owner.members.length > 0 && (
                      <div className="text-[10px] text-slate-500 bg-white border border-slate-150 p-2.5 rounded-xl space-y-1">
                        <p className="font-bold text-[8px] text-slate-400 uppercase tracking-wider">
                          Household Members:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {owner.members.map((member, idx) => (
                            <span key={idx} className="bg-slate-50 text-slate-700 border border-slate-150 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase">
                              {member}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vehicles */}
                    {owner.vehicles && owner.vehicles.length > 0 && (
                      <div className="text-[10px] text-slate-500 space-y-1 border-t border-slate-100 pt-2.5">
                        <p className="font-bold text-[8px] text-slate-400 uppercase tracking-wider">
                          Registered Vehicles ({owner.vehicles.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {owner.vehicles.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center bg-indigo-50/50 border border-indigo-100/50 text-indigo-800 px-2 py-1 rounded-lg font-mono text-[9px] font-black text-left"
                            >
                              <span className="mr-1">{v.type === 'fourwheeler' ? '🚗' : '🏍️'}</span>
                              <span>{v.plateNumber}</span>
                              {v.parkingPlot && <span className="text-[8px] text-indigo-500 ml-1.5 font-bold">🅿️ Plot: {v.parkingPlot}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assigned Helpers */}
                    {flatHelpers.length > 0 && (
                      <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2.5">
                        <p className="font-bold text-[8px] text-slate-400 uppercase tracking-wider mb-1">
                          Assigned Helpers:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {flatHelpers.map((h) => (
                            <span
                              key={h.id}
                              className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold"
                            >
                              👤 {h.name} ({h.role})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Redirection */}
                    {activeAbsence && (
                      <div className="bg-amber-50/40 border border-amber-200/50 p-2.5 rounded-xl text-[10px] text-amber-800 space-y-1.5">
                        <p className="font-bold uppercase tracking-wider text-[8px] text-amber-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> Redirection Active:
                        </p>
                        <div className="grid grid-cols-3 gap-2 font-black text-[9px]">
                          {activeAbsence.milkRedirectFlat && <p>🥛 Milk ➔ {activeAbsence.milkRedirectFlat}</p>}
                          {activeAbsence.newspaperRedirectFlat && <p>📰 News ➔ {activeAbsence.newspaperRedirectFlat}</p>}
                          {activeAbsence.parcelRedirectFlat && <p>📦 Parcel ➔ {activeAbsence.parcelRedirectFlat}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Edit Trigger */}
                  {isAdminEdit && (
                    <div className="border-t border-slate-100 pt-3 flex justify-end">
                      <button
                        onClick={() => onEditTrigger!(owner)}
                        className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 rounded-lg px-3 py-1 hover:border-indigo-200 transition shadow-sm cursor-pointer"
                      >
                        Edit Owner Profile
                      </button>
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
