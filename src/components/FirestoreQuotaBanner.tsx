/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { checkQuotaExceeded } from '../lib/firebase';

export default function FirestoreQuotaBanner() {
  const [quotaExceeded, setQuotaExceeded] = useState(() => checkQuotaExceeded());

  useEffect(() => {
    const handleStatusChange = () => {
      setQuotaExceeded(checkQuotaExceeded());
    };
    window.addEventListener('firestore_quota_status_changed', handleStatusChange);
    return () => {
      window.removeEventListener('firestore_quota_status_changed', handleStatusChange);
    };
  }, []);

  if (!quotaExceeded) return null;

  return (
    <div id="firestore-quota-banner" className="bg-amber-50/90 backdrop-blur-xs border-b border-amber-200 py-3 px-4 sm:px-6 lg:px-8 text-amber-900 animate-in slide-in-from-top duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base shrink-0 select-none">⚠️</span>
          <div className="text-xs font-sans text-left leading-normal">
            <span className="font-extrabold text-amber-950 block sm:inline">Firestore Free-Tier Quota Exceeded.</span>{' '}
            <span className="text-amber-800 font-medium">
              The application is running in highly resilient offline sandbox mode. All features remain fully functional with local persistence.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://console.firebase.google.com/project/elaborate-valor-f2t1j/firestore/databases/ai-studio-orchidheightsgat-9723728d-dfbd-4989-888d-4a04d2bdfd45/data?openUpgradeDialog=true"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-amber-600 hover:bg-amber-700 text-white font-sans font-black py-1.5 px-3.5 rounded-xl text-[10px] uppercase tracking-wider transition shadow-sm text-center inline-block hover:shadow-md cursor-pointer select-none"
          >
            Upgrade Database
          </a>
        </div>
      </div>
    </div>
  );
}
