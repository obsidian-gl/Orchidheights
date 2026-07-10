import React, { useState } from 'react';
import { User, Users, Car, Phone, Lock, Eye, EyeOff, Calendar, AlertCircle, Trash2, Plus, ShieldCheck, HelpCircle } from 'lucide-react';
import { FlatOwner, Vehicle, AbsenceLog, DailyHelper } from '../../types';

interface ProfileSectionProps {
  wing: string;
  flatNo: number;
  myOwnerData: FlatOwner | null;
  savingSettings: boolean;
  settingsSuccess: string;
  settingsError: string;

  // Family members state
  newMember: string;
  setNewMember: (text: string) => void;
  handleAddMember: (e: React.FormEvent) => void;
  handleRemoveMember: (idx: number) => void;

  // Vehicles state
  vType: 'twowheeler' | 'fourwheeler';
  setVType: (type: 'twowheeler' | 'fourwheeler') => void;
  vPlate: string;
  setVPlate: (text: string) => void;
  vModel: string;
  setVModel: (text: string) => void;
  handleAddVehicle: (e: React.FormEvent) => void;
  handleRemoveVehicle: (id: string) => void;

  // Security alternate contact & Password state
  altContact: string;
  setAltContact: (text: string) => void;
  showPass: boolean;
  setShowPass: (show: boolean) => void;
  newPassword: string;
  setNewPassword: (text: string) => void;
  handleSaveGeneral: (e: React.FormEvent) => void;

  // Absence/Redirection state
  absenceLogs: AbsenceLog[];
  dailyHelpers: DailyHelper[];
  absDateFrom: string;
  setAbsDateFrom: (text: string) => void;
  absDateTo: string;
  setAbsDateTo: (text: string) => void;
  absMilkRedirect: string;
  setAbsMilkRedirect: (text: string) => void;
  absNewspaperRedirect: string;
  setAbsNewspaperRedirect: (text: string) => void;
  absParcelRedirect: string;
  setAbsParcelRedirect: (text: string) => void;
  absenceSuccess: string;
  absenceError: string;
  handleSaveAbsence: (e: React.FormEvent) => void;
  handleCancelAbsence: () => void;
}

export default function ProfileSection({
  wing,
  flatNo,
  myOwnerData,
  savingSettings,
  settingsSuccess,
  settingsError,
  newMember,
  setNewMember,
  handleAddMember,
  handleRemoveMember,
  vType,
  setVType,
  vPlate,
  setVPlate,
  vModel,
  setVModel,
  handleAddVehicle,
  handleRemoveVehicle,
  altContact,
  setAltContact,
  showPass,
  setShowPass,
  newPassword,
  setNewPassword,
  handleSaveGeneral,
  absenceLogs,
  dailyHelpers,
  absDateFrom,
  setAbsDateFrom,
  absDateTo,
  setAbsDateTo,
  absMilkRedirect,
  setAbsMilkRedirect,
  absNewspaperRedirect,
  setAbsNewspaperRedirect,
  absParcelRedirect,
  setAbsParcelRedirect,
  absenceSuccess,
  absenceError,
  handleSaveAbsence,
  handleCancelAbsence
}: ProfileSectionProps) {
  const flatId = `${wing}-${flatNo}`;
  
  // Find active absence for this flat
  const activeAbsence = absenceLogs.find((a) => a.flatId === flatId);
  
  // Find active helpers mapped to this flat
  const activeHelpers = dailyHelpers.filter((h) => h.flats.includes(flatId));

  return (
    <div className="space-y-8 text-left">
      {/* Alert banners */}
      {settingsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
          {settingsError}
        </div>
      )}

      {settingsSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-bold">
          {settingsSuccess}
        </div>
      )}

      {/* Profile Header card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-850">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <User className="w-44 h-44" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-16 h-16 bg-white/10 backdrop-blur border border-white/20 rounded-full flex items-center justify-center font-display font-black text-2xl uppercase select-none shadow-md shrink-0">
            {myOwnerData?.nameEn?.substring(0, 2) || 'OH'}
          </div>
          <div className="text-center sm:text-left">
            <span className="font-mono bg-indigo-500/30 border border-indigo-400/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              Flat {wing}-{flatNo} Resident Owner
            </span>
            <h3 className="font-display font-black text-2xl mt-1.5 uppercase leading-none tracking-tight">
              {myOwnerData?.nameEn || 'Resident Name'}
            </h3>
            {myOwnerData?.nameGu && (
              <p className="text-xs text-indigo-200 font-medium mt-1">{myOwnerData.nameGu}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* --- Column 1: Family & Vehicles --- */}
        <div className="space-y-6">
          {/* Box 1: Household Family Members */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
              <Users className="w-4.5 h-4.5 text-indigo-600" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                Household Family Members
              </h4>
            </div>

            <p className="text-[11px] text-slate-400">
              Register family members (Max 2) residing in this apartment for emergency gatekeeper verification and safety.
            </p>

            {myOwnerData?.members && myOwnerData.members.length > 0 ? (
              <div className="space-y-2">
                {myOwnerData.members.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-semibold uppercase text-slate-800"
                  >
                    <span>👤 {member}</span>
                    <button
                      onClick={() => handleRemoveMember(idx)}
                      disabled={savingSettings}
                      title="Remove member"
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 border border-dashed rounded-lg text-[11px]">
                No other family members registered. Add them below!
              </div>
            )}

            {/* Form to add family member */}
            {(!myOwnerData?.members || myOwnerData.members.length < 2) && (
              <form onSubmit={handleAddMember} className="flex gap-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul popat"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs font-medium outline-none transition"
                />
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-lg flex items-center space-x-1 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </form>
            )}
          </div>

          {/* Box 2: Registered Vehicles */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
              <Car className="w-4.5 h-4.5 text-indigo-600" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                Registered Vehicles
              </h4>
            </div>

            <p className="text-[11px] text-slate-400">
              Register vehicles to assign designated parking areas and enable automated gate scans on entries.
            </p>

            {myOwnerData?.vehicles && myOwnerData.vehicles.length > 0 ? (
              <div className="space-y-2">
                {myOwnerData.vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs"
                  >
                    <div className="flex items-center space-x-2 font-mono font-bold text-slate-800">
                      <span>{v.type === 'fourwheeler' ? '🚗' : '🏍️'}</span>
                      <span>{v.plateNumber}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({v.brandModel})</span>
                    </div>
                    <button
                      onClick={() => handleRemoveVehicle(v.id)}
                      disabled={savingSettings}
                      title="Unregister vehicle"
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 border border-dashed rounded-lg text-[11px]">
                No vehicles registered.
              </div>
            )}

            {/* Form to add vehicle */}
            <form onSubmit={handleAddVehicle} className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVType('twowheeler')}
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                    vType === 'twowheeler' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  🏍️ Two Wheeler
                </button>
                <button
                  type="button"
                  onClick={() => setVType('fourwheeler')}
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                    vType === 'fourwheeler' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  🚗 Four Wheeler
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="PLATE (e.g. GJ01AB1234)"
                  value={vPlate}
                  onChange={(e) => setVPlate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 uppercase outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="MODEL (e.g. Activa / Swift)"
                  value={vModel}
                  onChange={(e) => setVModel(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-[10px] transition cursor-pointer uppercase tracking-wider"
              >
                Register Vehicle
              </button>
            </form>
          </div>
        </div>

        {/* --- Column 2: Security & Service Redirection --- */}
        <div className="space-y-6">
          {/* Box 3: Alternate Contact & Password Security */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
              <Lock className="w-4.5 h-4.5 text-indigo-600" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                Security & Alternate Contact
              </h4>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alternate Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={altContact}
                  onChange={(e) => setAltContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg p-2.5 text-xs outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Change Log-In Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter new account password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg p-2.5 text-xs outline-none transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <VisualEyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition cursor-pointer"
              >
                {savingSettings ? 'Saving...' : 'Save Contact & Password'}
              </button>
            </form>
          </div>

          {/* Box 4: Absence & Delivery Redirection Management */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
              <Calendar className="w-4.5 h-4.5 text-indigo-600" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                Absence & Delivery Redirection
              </h4>
            </div>

            <p className="text-[11px] text-slate-400">
              When traveling, register your absence to redirect daily milk packets, newspaper deliveries, or parcel packets to another neighbour flat.
            </p>

            {absenceError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-[10px]">
                {absenceError}
              </div>
            )}

            {absenceSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-lg text-[10px] font-semibold">
                {absenceSuccess}
              </div>
            )}

            {activeAbsence ? (
              <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-xl text-amber-900 space-y-3">
                <div className="flex items-start space-x-1.5 text-xs text-amber-800">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-wider">Absence Redirection Active!</p>
                    <p className="text-[10px] mt-0.5">
                      Services are redirected from{' '}
                      <span className="font-bold">{new Date(activeAbsence.dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>{' '}
                      to{' '}
                      <span className="font-bold">{new Date(activeAbsence.dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>.
                    </p>
                  </div>
                </div>

                <div className="text-[10px] space-y-1 bg-white border border-amber-100 p-2.5 rounded-lg text-slate-700 leading-relaxed font-semibold">
                  {activeAbsence.milkRedirectFlat && (
                    <p>🥛 Milk ➔ Redirection to Flat {activeAbsence.milkRedirectFlat}</p>
                  )}
                  {activeAbsence.newspaperRedirectFlat && (
                    <p>📰 Newspaper ➔ Redirection to Flat {activeAbsence.newspaperRedirectFlat}</p>
                  )}
                  {activeAbsence.parcelRedirectFlat && (
                    <p>📦 Courier Parcel ➔ Redirection to Flat {activeAbsence.parcelRedirectFlat}</p>
                  )}
                </div>

                <button
                  onClick={handleCancelAbsence}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-[10px] shadow cursor-pointer transition"
                >
                  Cancel Absence (I'm Back)
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveAbsence} className="space-y-3 text-xs font-medium">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Date From</label>
                    <input
                      type="date"
                      required
                      value={absDateFrom}
                      onChange={(e) => setAbsDateFrom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Date To</label>
                    <input
                      type="date"
                      required
                      value={absDateTo}
                      onChange={(e) => setAbsDateTo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Redirect Milk packets to Flat</label>
                  <input
                    type="text"
                    placeholder="e.g. A-102"
                    value={absMilkRedirect}
                    onChange={(e) => setAbsMilkRedirect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Redirect Newspaper to Flat</label>
                  <input
                    type="text"
                    placeholder="e.g. B-1104"
                    value={absNewspaperRedirect}
                    onChange={(e) => setAbsNewspaperRedirect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Redirect Parcels / Couriers to Flat</label>
                  <input
                    type="text"
                    placeholder="e.g. A-102"
                    value={absParcelRedirect}
                    onChange={(e) => setAbsParcelRedirect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs shadow transition cursor-pointer"
                >
                  Register Absence Redirection
                </button>
              </form>
            )}
          </div>

          {/* Box 5: Mapped Daily helpers list */}
          {activeHelpers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800">
                  My Assigned Helpers
                </h4>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeHelpers.map((h) => (
                  <span
                    key={h.id}
                    className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full py-1 px-3 text-[10px] font-bold uppercase flex items-center"
                  >
                    👤 {h.name} ({h.role})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Help sub components
function VisualEyeIcon() {
  return <Eye className="w-4 h-4" />;
}
