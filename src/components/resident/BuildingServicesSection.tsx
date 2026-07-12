import React, { useState } from 'react';
import { Phone, Search, Wrench, Shield, Clipboard, Hammer, User, Landmark, HelpCircle, Copy, Check } from 'lucide-react';
import { EssentialContact } from '../../types';

interface BuildingServicesSectionProps {
  contacts: EssentialContact[];
}

export default function BuildingServicesSection({ contacts }: BuildingServicesSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Plumber', 'Electrician', 'Security', 'Manager', 'Gardener', 'Other'];

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.phone.includes(searchTerm) || 
                          c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Plumber':
        return <Wrench className="w-4 h-4 text-sky-600" />;
      case 'Electrician':
        return <Hammer className="w-4 h-4 text-amber-600" />;
      case 'Security':
        return <Shield className="w-4 h-4 text-emerald-600" />;
      case 'Manager':
        return <Landmark className="w-4 h-4 text-indigo-600" />;
      case 'Gardener':
        return <User className="w-4 h-4 text-teal-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Plumber':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Electrician':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Security':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Manager':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Gardener':
        return 'bg-teal-50 text-teal-700 border-teal-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleCopy = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header Title */}
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-2.5">
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
            <Wrench className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-800">Building Services & Contacts</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Verified maintenance personnel and society staff managed by the Administration</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, category, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none transition"
          />
        </div>

        {/* Category Pills Slider */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition shrink-0 select-none cursor-pointer ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Essential Contacts List Grid */}
        {filteredContacts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl">
            <p className="text-xs font-semibold">No contacts found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredContacts.map((c) => (
              <div
                key={c.id}
                className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-center space-x-2.5 text-left min-w-0 flex-1">
                  <span className="text-xl bg-white border border-slate-100 p-2 rounded-lg shrink-0 shadow-xs">
                    {getCategoryIcon(c.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[140px]" title={c.name}>
                        {c.name}
                      </span>
                      <span className={`border px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider ${getCategoryBadgeClass(c.category)}`}>
                        {c.category}
                      </span>
                    </div>
                    <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">Primary: {c.phone}</p>
                    {c.alternatePhone && (
                      <p className="text-[8px] font-mono text-slate-400 mt-0.5">Alt: {c.alternatePhone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => handleCopy(c.id, c.phone)}
                    title="Copy phone number"
                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg shadow-xs transition cursor-pointer select-none"
                  >
                    {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <a
                    href={`tel:${c.phone}`}
                    title="Call now"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition select-none flex items-center justify-center"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
