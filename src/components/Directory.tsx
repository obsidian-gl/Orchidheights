/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Building, Phone, User, Car, Shield, Languages, HelpCircle, Smartphone } from 'lucide-react';
import { FlatOwner, UserSession } from '../types';

interface DirectoryProps {
  owners: FlatOwner[];
  session: UserSession;
  onEditTrigger?: (owner: FlatOwner) => void;
}

export default function Directory({ owners, session, onEditTrigger }: DirectoryProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWing, setSelectedWing] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');

  // Filter owners based on search query and filters
  const filteredOwners = owners.filter((owner) => {
    // 1. Filter by Wing
    if (selectedWing !== 'ALL' && owner.wing !== selectedWing) return false;

    // 2. Filter by Floor
    if (selectedFloor !== 'ALL') {
      const floorNum = parseInt(selectedFloor, 10);
      const ownerFloor = Math.floor(owner.flatNo / 100);
      if (ownerFloor !== floorNum) return false;
    }

    // 3. Filter by search query (Name English, Gujarati, Flat Number, Phone, or Vehicle Plate)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const matchFlat = `${owner.wing}-${owner.flatNo}`.toLowerCase().includes(query) || owner.flatNo.toString().includes(query);
      const matchNameEn = owner.nameEn.toLowerCase().includes(query);
      const matchNameGu = owner.nameGu.toLowerCase().includes(query);
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

  // Calculate some stats for metadata/bento display
  const totalOccupied = owners.filter((o) => o.phone && !o.nameEn.toLowerCase().includes('vacant')).length;
  const totalVehicles = owners.reduce((acc, curr) => acc + curr.vehicles.length, 0);

  return (
    <div className="space-y-6">
      
      {/* Bento Meta Header Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-tr from-indigo-50 to-indigo-100 border border-indigo-200/50 p-5 rounded-2xl flex items-center space-x-4 shadow-sm">
          <div className="bg-indigo-600 text-white p-3 rounded-xl shadow-md">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-indigo-500 uppercase tracking-wider font-semibold">Total Building Capacity</p>
            <p className="text-2xl font-display font-bold text-slate-800">96 Flats <span className="text-xs font-normal text-slate-500">(2 Wings)</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-tr from-emerald-50 to-emerald-100 border border-emerald-200/50 p-5 rounded-2xl flex items-center space-x-4 shadow-sm">
          <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold">Registered Households</p>
            <p className="text-2xl font-display font-bold text-slate-800">{totalOccupied} Occupied <span className="text-xs font-normal text-slate-500">({96 - totalOccupied} vacant)</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-tr from-amber-50 to-amber-100 border border-amber-200/50 p-5 rounded-2xl flex items-center space-x-4 shadow-sm">
          <div className="bg-amber-600 text-white p-3 rounded-xl shadow-md">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold">Tracked Vehicles</p>
            <p className="text-2xl font-display font-bold text-slate-800">{totalVehicles} Registered</p>
          </div>
        </div>
      </div>

      {/* Directory Filters & Search Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name, flat (A-202), phone, or plate #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium transition outline-none"
            />
          </div>

          {/* Quick Filter Controls */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            {/* Wing Selection */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSelectedWing('ALL')}
                className={`px-3 py-1.5 rounded-md transition ${selectedWing === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All Wings
              </button>
              <button
                onClick={() => setSelectedWing('A')}
                className={`px-3 py-1.5 rounded-md transition ${selectedWing === 'A' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Wing A
              </button>
              <button
                onClick={() => setSelectedWing('B')}
                className={`px-3 py-1.5 rounded-md transition ${selectedWing === 'B' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Wing B
              </button>
            </div>

            {/* Floor Selection */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-medium rounded-lg px-3 py-1.5 outline-none transition"
            >
              <option value="ALL">All Floors</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Directory Grid */}
      {filteredOwners.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No matching flats found</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the search filters or typing different keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwners.map((owner) => {
            const isVacant = owner.nameEn.toLowerCase().includes('vacant');
            const isAdminEdit = session.role === 'admin' && onEditTrigger;

            return (
              <div
                key={`${owner.wing}-${owner.flatNo}`}
                className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition relative flex flex-col justify-between ${
                  isVacant ? 'bg-slate-50/50 opacity-75' : ''
                }`}
              >
                {/* Flat Banner */}
                <div className={`p-4 flex justify-between items-center border-b ${isVacant ? 'bg-slate-100/50 border-slate-100' : 'bg-indigo-50/40 border-indigo-100'}`}>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      {owner.wing}-{owner.flatNo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Floor {Math.floor(owner.flatNo / 100)}
                    </span>
                  </div>

                  {/* Actions (Admin trigger) */}
                  {isAdminEdit && (
                    <button
                      onClick={() => onEditTrigger!(owner)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 hover:border-indigo-200 transition shadow-sm cursor-pointer"
                    >
                      Edit Owner
                    </button>
                  )}
                </div>

                {/* Flat Body */}
                <div className="p-5 flex-1 space-y-4 text-left">
                  {/* Name section */}
                  <div>
                    {isVacant ? (
                      <div>
                        <p className="font-semibold text-slate-500 italic text-sm">Vacant Apartment</p>
                        <p className="text-xs text-slate-400 mt-1">No registered details yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-start space-x-1.5">
                          <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <p className="font-bold text-slate-800 text-sm leading-tight uppercase">{owner.nameEn}</p>
                        </div>
                        {owner.nameGu && (
                          <div className="flex items-center space-x-1.5">
                            <Languages className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <p className="text-xs font-semibold text-indigo-700 font-sans">{owner.nameGu}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contact details */}
                  {!isVacant && (
                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {owner.phone ? (
                          <a
                            href={`tel:+91${owner.phone}`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline font-mono transition"
                            title={`Click to call ${owner.nameEn}`}
                          >
                            +91 {owner.phone}
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 font-mono">No phone listed</span>
                        )}
                      </div>
                      
                      {/* Secondary Contact (Only residents can see secondary contact info, security can't as per rules) */}
                      {session.role !== 'security' && owner.secondaryContact && (
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          <a
                            href={`tel:+91${owner.secondaryContact}`}
                            className="text-xs text-slate-500 hover:text-indigo-600 hover:underline font-mono italic transition"
                            title={`Click to call alternate contact`}
                          >
                            Alt: +91 {owner.secondaryContact}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Registered Members List (Only visible to residents/admins, security can just see name & vehicles & phone) */}
                  {session.role !== 'security' && owner.members && owner.members.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 text-xs">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Family Members:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {owner.members.map((member, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Vehicles */}
                  {owner.vehicles && owner.vehicles.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5">Vehicles:</span>
                      <div className="space-y-1.5">
                        {owner.vehicles.map((v) => (
                          <div key={v.id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200/50 p-1.5 rounded-lg">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-base">{v.type === 'fourwheeler' ? '🚗' : '🏍️'}</span>
                              <span className="font-semibold text-slate-700 capitalize text-[11px]">{v.brandModel || 'Vehicle'}</span>
                            </div>
                            <span className="font-mono font-bold bg-white text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] uppercase">
                              {v.plateNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Devices Audit Log (Secretary / Admin ONLY) */}
                  {session.role === 'admin' && owner.devices && owner.devices.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5 flex items-center">
                        <Smartphone className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                        <span>Registered Devices ({owner.devices.length}):</span>
                      </span>
                      <div className="space-y-2">
                        {owner.devices.map((dev, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200/60 p-2 rounded-xl text-[10px] text-slate-500 font-medium space-y-1">
                            <div className="flex items-center justify-between text-slate-700">
                              <span className="font-bold flex items-center">
                                <span className="mr-1">{dev.os === 'Android' || dev.os === 'iOS' ? '📱' : '💻'}</span>
                                {dev.os} • {dev.browser}
                              </span>
                              <span className="font-mono text-slate-400 text-[9px] uppercase">Logged In</span>
                            </div>
                            <p className="font-mono"><span className="text-slate-400">IMEI:</span> {dev.imei || 'Simulated'}</p>
                            <p className="font-mono flex items-center justify-between">
                              <span><span className="text-slate-400">IP:</span> {dev.ipAddress}</span>
                              <span className="text-[9px] text-slate-400 bg-white border border-slate-200/50 px-1 py-0.5 rounded font-sans">
                                {new Date(dev.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
