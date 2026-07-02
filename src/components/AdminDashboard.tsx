/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, Edit3, Trash2, Database, AlertTriangle, ShieldCheck, Check, RefreshCw, X, Search, Phone } from 'lucide-react';
import { FlatOwner } from '../types';

interface AdminDashboardProps {
  owners: FlatOwner[];
  onRefreshOwners: () => void;
}

export default function AdminDashboard({ owners, onRefreshOwners }: AdminDashboardProps) {
  // Passwords Changer State
  const [selectedWing, setSelectedWing] = useState<'A' | 'B'>('A');
  const [selectedFlatNo, setSelectedFlatNo] = useState<number>(101);
  const [newPassword, setNewPassword] = useState<string>('');
  const [passSuccess, setPassSuccess] = useState<string>('');
  const [passError, setPassError] = useState<string>('');
  const [passLoading, setPassLoading] = useState<boolean>(false);

  // Database Reset State
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // Inline Owner Edit State
  const [editOwner, setEditOwner] = useState<FlatOwner | null>(null);
  const [editNameEn, setEditNameEn] = useState<string>('');
  const [editNameGu, setEditNameGu] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editSecondary, setEditSecondary] = useState<string>('');
  const [editError, setEditError] = useState<string>('');
  const [editSuccess, setEditSuccess] = useState<string>('');
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Search through all owners
  const [adminSearch, setAdminSearch] = useState<string>('');

  // Generate list of flats (101-104 up to 1201-1204)
  const flats: number[] = [];
  for (let floor = 1; floor <= 12; floor++) {
    for (let flatIndex = 1; flatIndex <= 4; flatIndex++) {
      flats.push(floor * 100 + flatIndex);
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    
    if (!newPassword.trim()) {
      setPassError('Password cannot be empty.');
      return;
    }

    setPassLoading(true);

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wing: selectedWing,
          flatNo: selectedFlatNo,
          newPassword: newPassword.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        setPassSuccess(`Password for Flat ${selectedWing}-${selectedFlatNo} updated successfully!`);
        setNewPassword('');
        onRefreshOwners();
      } else {
        setPassError(data.message || 'Failed to update password.');
      }
    } catch (error) {
      setPassError('Connection error.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleResetDb = async () => {
    setResetLoading(true);
    setResetSuccess('');
    try {
      const response = await fetch('/api/admin/reset-db', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setResetSuccess('System reset completely back to default Excel data!');
        setShowConfirmReset(false);
        onRefreshOwners();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setResetLoading(false);
    }
  };

  const handleOpenEdit = (owner: FlatOwner) => {
    setEditOwner(owner);
    setEditNameEn(owner.nameEn.toLowerCase().includes('vacant') ? '' : owner.nameEn);
    setEditNameGu(owner.nameGu.toLowerCase().includes('ખાલી') ? '' : owner.nameGu);
    setEditPhone(owner.phone);
    setEditSecondary(owner.secondaryContact || '');
    setEditError('');
    setEditSuccess('');
  };

  const handleSaveOwnerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwner) return;

    setEditError('');
    setEditSuccess('');
    setEditLoading(true);

    try {
      const response = await fetch(`/api/owners/${editOwner.wing}/${editOwner.flatNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: editNameEn.trim() || `Vacant / Owner Flat ${editOwner.wing}-${editOwner.flatNo}`,
          nameGu: editNameGu.trim() || `ખાલી ફ્લેટ ${editOwner.wing}-${editOwner.flatNo}`,
          phone: editPhone.trim(),
          secondaryContact: editSecondary.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditSuccess('Owner details saved successfully.');
        setTimeout(() => {
          setEditOwner(null);
        }, 1200);
        onRefreshOwners();
      } else {
        setEditError(data.message || 'Failed to save owner.');
      }
    } catch (error) {
      setEditError('Server connection error.');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredOwners = owners.filter((owner) => {
    const q = adminSearch.toLowerCase().trim();
    if (q === '') return true;
    return (
      `${owner.wing}-${owner.flatNo}`.toLowerCase().includes(q) ||
      owner.nameEn.toLowerCase().includes(q) ||
      owner.nameGu.toLowerCase().includes(q) ||
      owner.phone.includes(q)
    );
  });

  return (
    <div className="space-y-8 text-left">
      
      {/* Alert Panel */}
      <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl shadow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg tracking-tight">Admin Master Console</h2>
            <p className="text-xs text-slate-400 mt-1">Superuser tools for Rahul Popat (B-1104). View/modify passwords, reset directories, and override flat data.</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Forms & lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column (5 Cols) - Change Passwords & Reset system */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Form 1: Password Changer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4 text-indigo-600">
              <Key className="w-5 h-5" />
              <h3 className="font-display font-bold text-base text-slate-800">Change Flat Password</h3>
            </div>

            {passError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start space-x-1.5 mb-4">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-start space-x-1.5 mb-4">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Wing</label>
                  <select
                    value={selectedWing}
                    onChange={(e) => setSelectedWing(e.target.value as 'A' | 'B')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                  >
                    <option value="A">Wing A</option>
                    <option value="B">Wing B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Flat No</label>
                  <select
                    value={selectedFlatNo}
                    onChange={(e) => setSelectedFlatNo(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold outline-none focus:bg-white"
                  >
                    {flats.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">New Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new custom password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
              >
                {passLoading ? 'Updating...' : 'Update Password Override'}
              </button>
            </form>
          </div>

          {/* Card 2: Factory Reset System */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-orange-200 bg-orange-50/10">
            <div className="flex items-center space-x-2 border-b border-orange-100 pb-3 mb-4 text-orange-600">
              <Database className="w-5 h-5" />
              <h3 className="font-display font-bold text-base text-slate-800">Database Factory Reset</h3>
            </div>

            {resetSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs mb-3">
                {resetSuccess}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Restores all 96 flats back to their original Excel list status. This clears all added visitor logs, resets household members, and resets passwords to their default state (<span className="font-semibold text-slate-700 font-mono">admin@123</span>).
            </p>

            {showConfirmReset ? (
              <div className="space-y-3 bg-white p-4 border border-orange-200 rounded-xl">
                <p className="text-xs font-bold text-red-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1 shrink-0" />
                  Are you absolutely sure? All data is wiped!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetDb}
                    disabled={resetLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {resetLoading ? 'Resetting...' : 'Yes, Reset Now'}
                  </button>
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
              >
                Reset Database to Factory Defaults
              </button>
            )}
          </div>

        </div>

        {/* Right column (7 Cols) - Master Flat Owners list and Modal Editor */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          
          {/* Heading */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-base text-slate-800">Master Flat Directories</h3>
              <p className="text-xs text-slate-400 mt-0.5">Quickly edit details for any of our 96 apartments.</p>
            </div>
            
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Search flat/owner..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none"
              />
            </div>
          </div>

          {/* Inline Edit Modal popup structure inside bento */}
          {editOwner && (
            <div className="mb-6 bg-indigo-50/50 border border-indigo-200 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                <h4 className="font-display font-bold text-sm text-indigo-900">
                  ✏️ Editing Flat Details: {editOwner.wing}-{editOwner.flatNo}
                </h4>
                <button onClick={() => setEditOwner(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-2 rounded-lg text-xs">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-2 rounded-lg text-xs">
                  {editSuccess}
                </div>
              )}

              <form onSubmit={handleSaveOwnerEdit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-950 mb-1">Owner Name (English)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RAHUL JASHVANTRAI POPAT"
                      value={editNameEn}
                      onChange={(e) => setEditNameEn(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-semibold outline-none focus:border-indigo-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-950 mb-1">Owner Name (Gujarati)</label>
                    <input
                      type="text"
                      placeholder="e.g. રાહુલ જશવંતરાય પોપટ"
                      value={editNameGu}
                      onChange={(e) => setEditNameGu(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-950 mb-1">Primary Phone Number</label>
                    <input
                      type="tel"
                      placeholder="Primary phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-950 mb-1">Secondary Contact (Alt Phone)</label>
                    <input
                      type="tel"
                      placeholder="Alternate phone"
                      value={editSecondary}
                      onChange={(e) => setEditSecondary(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    {editLoading ? 'Saving...' : 'Save Flat Details'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOwner(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List Table */}
          <div className="max-h-[500px] overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">Flat</th>
                  <th className="py-2.5 px-3">Owner Details</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOwners.map((owner) => {
                  const isVacant = !owner.phone || owner.nameEn.toLowerCase().includes('vacant');
                  return (
                    <tr key={`${owner.wing}-${owner.flatNo}`} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                          {owner.wing}-{owner.flatNo}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {isVacant ? (
                          <span className="text-slate-400 italic text-xs">Unoccupied</span>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-800 text-xs uppercase leading-tight">{owner.nameEn}</p>
                            {owner.nameGu && <p className="text-[10px] text-indigo-600 font-semibold">{owner.nameGu}</p>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-xs">
                        {owner.phone ? `+91 ${owner.phone}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleOpenEdit(owner)}
                          className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 p-1.5 rounded-lg transition shrink-0 inline-flex items-center"
                          title="Edit details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
