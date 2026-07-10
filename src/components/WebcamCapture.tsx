/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface WebcamCaptureProps {
  onPhotoCaptured: (base64: string) => void;
  value?: string;
  guestType?: string; // used to pre-select preset
}

// Custom built-in presets represented as high-quality SVGs converted to Data URIs (or we can use inline color canvas/base64).
// Let's create beautiful SVG string assets representing each guest type.
const PRESETS: Record<string, { label: string; svgColor: string; iconLetter: string }> = {
  delivery: { label: 'Delivery Driver', svgColor: 'from-amber-400 to-orange-500', iconLetter: '📦' },
  guest: { label: 'Guest / Relative', svgColor: 'from-indigo-400 to-indigo-600', iconLetter: '👋' },
  electrician: { label: 'Technician / Repair', svgColor: 'from-blue-400 to-blue-600', iconLetter: '⚡' },
  milkman: { label: 'Milkman / Dairy', svgColor: 'from-sky-300 to-slate-200', iconLetter: '🥛' },
  maid: { label: 'Household Help', svgColor: 'from-emerald-400 to-emerald-600', iconLetter: '🧹' },
  other: { label: 'General Visitor', svgColor: 'from-slate-400 to-slate-600', iconLetter: '👤' }
};

export default function WebcamCapture({ onPhotoCaptured, value, guestType }: WebcamCaptureProps) {
  const [mode, setMode] = useState<'preset' | 'camera' | 'upload'>('preset');
  const [photo, setPhoto] = useState<string>(value || '');
  const [selectedPreset, setSelectedPreset] = useState<string>('other');
  
  // Camera states
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-apply preset when guestType changes
  useEffect(() => {
    if (guestType) {
      const typeLower = guestType.toLowerCase();
      if (typeLower.includes('milk')) setSelectedPreset('milkman');
      else if (typeLower.includes('guest') || typeLower.includes('relative')) setSelectedPreset('guest');
      else if (typeLower.includes('delivery') || typeLower.includes('courier')) setSelectedPreset('delivery');
      else if (typeLower.includes('electrician') || typeLower.includes('plumber') || typeLower.includes('repair')) setSelectedPreset('electrician');
      else if (typeLower.includes('maid') || typeLower.includes('laundry')) setSelectedPreset('maid');
      else setSelectedPreset('other');
    }
  }, [guestType]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const generatePresetDataUri = (key: string) => {
    const preset = PRESETS[key] || PRESETS.other;
    // Create canvas snapshot of this preset
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 300, 300);
      if (key === 'delivery') { grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#ea580c'); }
      else if (key === 'guest') { grad.addColorStop(0, '#818cf8'); grad.addColorStop(1, '#4f46e5'); }
      else if (key === 'electrician') { grad.addColorStop(0, '#60a5fa'); grad.addColorStop(1, '#2563eb'); }
      else if (key === 'milkman') { grad.addColorStop(0, '#7dd3fc'); grad.addColorStop(1, '#cbd5e1'); }
      else if (key === 'maid') { grad.addColorStop(0, '#34d399'); grad.addColorStop(1, '#059669'); }
      else { grad.addColorStop(0, '#94a3b8'); grad.addColorStop(1, '#475569'); }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 300, 300);

      // Draw avatar circle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(150, 150, 110, 0, Math.PI * 2);
      ctx.fill();

      // Draw text letter / emoji
      ctx.font = '96px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(preset.iconLetter, 150, 150);

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(preset.label.toUpperCase(), 150, 260);

      return canvas.toDataURL('image/jpeg');
    }
    return '';
  };

  const selectPreset = (key: string) => {
    setSelectedPreset(key);
    const base64 = generatePresetDataUri(key);
    setPhoto(base64);
    onPhotoCaptured(base64);
  };

  // Auto-generate initial photo if in preset mode and empty
  useEffect(() => {
    if (mode === 'preset' && !photo) {
      selectPreset(selectedPreset);
    }
  }, [mode, selectedPreset]);

  // Sync photo with value prop when value changes
  useEffect(() => {
    if (value !== undefined) {
      setPhoto(value);
    }
  }, [value]);

  const startCamera = async () => {
    setCameraError('');
    setCameraActive(false);
    try {
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 300, facingMode: 'user' },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please make sure camera permissions are allowed or use the file upload or preset options.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 400;
      canvas.height = videoRef.current.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        onPhotoCaptured(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhoto(base64);
        onPhotoCaptured(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
      <div className="flex justify-between items-center mb-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Visitor Photo <span className="text-red-500">*</span>
        </label>
        
        {/* Sub-modes selector */}
        <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => { setMode('preset'); stopCamera(); }}
            className={`px-2.5 py-1 rounded-md transition ${mode === 'preset' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
          >
            Presets
          </button>
          <button
            type="button"
            onClick={() => { setMode('camera'); startCamera(); }}
            className={`px-2.5 py-1 rounded-md transition ${mode === 'camera' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
          >
            Webcam
          </button>
          <button
            type="button"
            onClick={() => { setMode('upload'); stopCamera(); }}
            className={`px-2.5 py-1 rounded-md transition ${mode === 'upload' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
          >
            Upload File
          </button>
        </div>
      </div>

      {/* Main interface card */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Photo Canvas Preview */}
        <div className="w-full md:w-48 h-36 bg-slate-200 border border-slate-300 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center shrink-0">
          {photo ? (
            <img src={photo} alt="Captured visitor" className="w-full h-full object-cover" />
          ) : (
            <div className="text-slate-400 text-center flex flex-col items-center">
              <ImageIcon className="w-8 h-8 mb-1" />
              <span className="text-[10px]">No photo added</span>
            </div>
          )}
          {photo && (
            <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow">
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Action controllers per mode */}
        <div className="flex-1 w-full text-left">
          {mode === 'preset' && (
            <div>
              <p className="text-[11px] text-slate-500 mb-2">
                Click to generate a clean preset profile image for this type of guest:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(PRESETS).map((key) => {
                  const p = PRESETS[key];
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => selectPreset(key)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition text-left cursor-pointer ${
                        selectedPreset === key
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span>{p.iconLetter}</span>
                      <span className="truncate">{p.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'camera' && (
            <div className="space-y-2">
              {cameraError ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-[10px] flex items-start space-x-1.5 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              ) : (
                <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-[4/3] max-w-[200px] mx-auto border border-slate-800 shadow">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white text-xs font-medium">
                      Starting camera...
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                {cameraActive ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap Photo</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-slate-700 hover:bg-slate-800 text-white py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div>
              <p className="text-[11px] text-slate-500 mb-2">
                Upload or drop any picture from your device:
              </p>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white p-4 hover:border-slate-400 transition text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-600">Click to upload image</p>
                <p className="text-[10px] text-slate-400">Supports JPG, PNG, WebP</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
