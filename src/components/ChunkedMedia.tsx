import React, { useState, useEffect } from 'react';
import { downloadChunkedFile } from '../lib/fileStorage';
import { FileText, Loader2, Download } from 'lucide-react';

interface ChunkedMediaProps {
  fileId: string;
  type: string;
  fallbackName: string;
  key?: any;
}

export default function ChunkedMedia({ fileId, type, fallbackName }: ChunkedMediaProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (fileId && fileId.startsWith('file_')) {
      downloadChunkedFile(fileId)
        .then((fileData) => {
          if (active) {
            setMediaUrl(fileData.base64);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Error fetching chunked media:', err);
          if (active) {
            setError(true);
            setLoading(false);
          }
        });
    } else {
      setMediaUrl(fileId);
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-slate-50 border border-slate-150 rounded-xl min-h-[90px] w-full">
        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mr-2" />
        <span className="text-[10px] font-bold text-slate-500">Loading attachment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 border border-red-150 text-red-700 rounded-xl min-h-[90px] w-full">
        <span className="text-[10px] font-bold">Failed to load attachment</span>
      </div>
    );
  }

  if (type?.startsWith('image/')) {
    return (
      <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-1 w-full">
        <img
          src={mediaUrl}
          alt={fallbackName}
          className="w-full object-contain max-h-[220px] rounded-lg"
          referrerPolicy="no-referrer"
        />
        <div className="w-full flex items-center justify-between px-2 py-1.5 mt-1 border-t border-slate-100 bg-white rounded-b-lg">
          <span className="text-[9px] font-bold text-slate-500 truncate max-w-[140px]">{fallbackName}</span>
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = mediaUrl;
              link.download = fallbackName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-indigo-600 hover:text-indigo-700 p-1 flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">Save</span>
          </button>
        </div>
      </div>
    );
  }

  if (type?.startsWith('video/')) {
    return (
      <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-black flex flex-col items-center justify-center p-1 w-full">
        <video src={mediaUrl} controls className="max-h-[220px] w-full rounded-lg" />
        <div className="w-full flex items-center justify-between px-2 py-1.5 mt-1 border-t border-slate-800 bg-slate-900 text-white rounded-b-lg">
          <span className="text-[9px] font-bold text-slate-300 truncate max-w-[140px]">{fallbackName}</span>
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = mediaUrl;
              link.download = fallbackName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="text-indigo-400 hover:text-indigo-300 p-1 flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">Save</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between text-xs w-full shadow-sm text-left">
      <div className="flex items-center space-x-2 truncate">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="text-left truncate">
          <p className="font-bold text-slate-700 truncate max-w-[150px]">{fallbackName}</p>
          <p className="text-[9px] text-slate-400 uppercase font-mono">{type || 'file'}</p>
        </div>
      </div>
      <button
        onClick={() => {
          const link = document.createElement('a');
          link.href = mediaUrl;
          link.download = fallbackName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center space-x-1 cursor-pointer transition shadow hover:shadow-md"
      >
        <Download className="w-3 h-3" />
        <span>Download</span>
      </button>
    </div>
  );
}
