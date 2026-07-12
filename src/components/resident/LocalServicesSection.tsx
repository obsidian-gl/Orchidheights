import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft, 
  Edit3, 
  UserPlus, 
  Phone,
  Check,
  User,
  X,
  AlertCircle
} from 'lucide-react';
import { DailyHelper, EssentialContact } from '../../types';
import { db, setDoc, doc, deleteDoc, updateDoc } from '../../lib/firebase';
import BuildingServicesSection from './BuildingServicesSection';

interface LocalServicesSectionProps {
  wing: string;
  flatNo: number;
  dailyHelpers: DailyHelper[];
  handleToggleHelperMapping: (id: string) => void;
  essentialContacts: EssentialContact[];
}

export default function LocalServicesSection({
  wing,
  flatNo,
  dailyHelpers,
  handleToggleHelperMapping,
  essentialContacts
}: LocalServicesSectionProps) {
  const myFlatId = `${wing}-${flatNo}`;
  const [activeSub, setActiveSub] = useState<'menu' | 'local_helpers' | 'building_services'>('menu');

  // Add & Edit State variables
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHelperId, setEditingHelperId] = useState<string | null>(null);

  const [helperName, setHelperName] = useState('');
  const [helperPhone, setHelperPhone] = useState('');
  const [helperRole, setHelperRole] = useState<'Maid' | 'Milkman' | 'Car Cleaner' | 'Newspaper Guy' | 'Other'>('Maid');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleOpenAdd = () => {
    setHelperName('');
    setHelperPhone('');
    setHelperRole('Maid');
    setFormError('');
    setFormSuccess('');
    setEditingHelperId(null);
    setShowAddForm(true);
  };

  const handleOpenEdit = (helper: DailyHelper) => {
    setHelperName(helper.name);
    setHelperPhone(helper.phone);
    setHelperRole(helper.role as any);
    setFormError('');
    setFormSuccess('');
    setEditingHelperId(helper.id);
    setShowAddForm(true);
  };

  const handleSaveHelper = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!helperName.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!helperPhone.trim()) {
      setFormError('Phone number is required.');
      return;
    }

    try {
      if (editingHelperId) {
        // Edit flow
        const ref = doc(db, 'daily_helpers', editingHelperId);
        await updateDoc(ref, {
          name: helperName.trim(),
          phone: helperPhone.trim(),
          role: helperRole
        });
        setFormSuccess('Helper details updated successfully!');
      } else {
        // Add flow
        const newId = 'helper_' + Math.random().toString(36).substring(2, 11);
        const newHelper: DailyHelper = {
          id: newId,
          name: helperName.trim(),
          phone: helperPhone.trim(),
          role: helperRole,
          flats: [myFlatId] // Auto-map to the creator flat!
        };
        await setDoc(doc(db, 'daily_helpers', newId), newHelper);
        setFormSuccess('New helper registered and mapped to your flat!');
      }

      // Reset
      setTimeout(() => {
        setShowAddForm(false);
        setEditingHelperId(null);
        setHelperName('');
        setHelperPhone('');
      }, 1000);

    } catch (err: any) {
      setFormError(err.message || 'Failed to save helper.');
    }
  };

  const handleDeleteHelper = async (id: string) => {
    if (!confirm('Are you sure you want to remove this service provider completely from the society records?')) return;
    try {
      await deleteDoc(doc(db, 'daily_helpers', id));
    } catch (err: any) {
      alert('Failed to delete helper: ' + err.message);
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* ==================== VIEW 1: MENU OF SUB-BLOCKS ==================== */}
      {activeSub === 'menu' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-2">
            <Wrench className="w-4 h-4 text-indigo-600" />
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-600">
              Local Directory & Handymen
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sub-Block 1: Orchid Heights Local Services */}
            <div
              onClick={() => setActiveSub('local_helpers')}
              className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-slate-300 shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
              </div>
              <div className="mt-4">
                <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                  Orchid Heights Local Services
                </h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                  Maid, Cook, Milkman, Newspaper Guy
                </p>
              </div>
            </div>

            {/* Sub-Block 2: Building Services & Contacts */}
            <div
              onClick={() => setActiveSub('building_services')}
              className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-slate-300 shadow-sm flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition cursor-pointer relative group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Wrench className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
              </div>
              <div className="mt-4">
                <h4 className="font-display font-black text-slate-800 text-sm tracking-tight leading-snug">
                  Building Services & Contacts
                </h4>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                  Society Electricians, Plumbers, Security
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: LOCAL HELPERS (CRUD) ==================== */}
      {activeSub === 'local_helpers' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <button
              onClick={() => {
                setActiveSub('menu');
                setShowAddForm(false);
              }}
              className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition select-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] flex items-center space-x-1 cursor-pointer transition shadow"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Local Provider</span>
            </button>
          </div>

          <div>
            <h3 className="font-display font-black text-slate-800 text-base">Orchid Heights Local Services</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Add, edit, or delete helper contacts and toggle active assignment to Flat {wing}-{flatNo}.
            </p>
          </div>

          {showAddForm && (
            <form onSubmit={handleSaveHelper} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                <h4 className="font-bold text-xs text-slate-700">
                  {editingHelperId ? '✏️ Edit Service Provider' : '➕ Register New Service Provider'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 text-red-700 p-2 border border-red-100 rounded-lg text-[10px] flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-2 border border-emerald-100 rounded-lg text-[10px] flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={helperName}
                    onChange={(e) => setHelperName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Mobile No</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={helperPhone}
                    onChange={(e) => setHelperPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Service Category</label>
                  <select
                    value={helperRole}
                    onChange={(e: any) => setHelperRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Maid">Sweep & Maid (🧹)</option>
                    <option value="Milkman">Milkman (🥛)</option>
                    <option value="Car Cleaner">Vehicle Cleaner (🧽)</option>
                    <option value="Newspaper Guy">Newspaper Guy (📰)</option>
                    <option value="Other">Other helper (🔧)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
              >
                {editingHelperId ? 'Update Provider Details' : 'Register Service Provider'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {dailyHelpers.map((helper) => {
              const isAssigned = helper.flats?.includes(myFlatId) || false;
              const cleanName = helper.name.replace(/\s*\([^)]*\)\s*/gi, '').trim();

              return (
                <div
                  key={helper.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-xl bg-white border border-slate-100 p-2 rounded-xl shrink-0 shadow-xs">
                        {helper.role === 'Maid' ? '🧹' : helper.role === 'Milkman' ? '🥛' : helper.role === 'Car Cleaner' ? '🧽' : helper.role === 'Newspaper Guy' ? '📰' : '🔧'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[140px]" title={cleanName}>
                            {cleanName}
                          </span>
                          {isAssigned && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase flex items-center font-mono tracking-wider">
                              <ShieldCheck className="w-2 h-2 mr-0.5" /> Mapped
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">Role: {helper.role} • {helper.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(helper)}
                        title="Edit provider details"
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHelper(helper.id)}
                        title="Delete provider completely"
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {helper.flats && helper.flats.length > 0 && (
                    <div className="text-[8px] text-slate-500 flex items-center gap-1 bg-white p-1.5 border border-slate-150 rounded-lg">
                      <span className="font-bold uppercase tracking-wide text-slate-400">Assigned Flats:</span>{' '}
                      <span className="font-mono font-bold text-slate-600 truncate max-w-[180px]">
                        {helper.flats.join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`tel:${helper.phone}`}
                      className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-1 px-2.5 rounded-xl text-[9px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Help</span>
                    </a>
                    <button
                      onClick={() => handleToggleHelperMapping(helper.id)}
                      className={`flex-1 py-1 px-2.5 rounded-xl text-[9px] font-extrabold uppercase transition-all duration-150 cursor-pointer shadow-xs select-none ${
                        isAssigned
                          ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isAssigned ? 'Remove Mapping' : 'Map to my Flat'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== VIEW 3: BUILDING SERVICES & STAFF ==================== */}
      {activeSub === 'building_services' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex items-center justify-between">
            <button
              onClick={() => setActiveSub('menu')}
              className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition select-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              View Only Mode
            </span>
          </div>

          <BuildingServicesSection contacts={essentialContacts} />
        </div>
      )}
    </div>
  );
}
