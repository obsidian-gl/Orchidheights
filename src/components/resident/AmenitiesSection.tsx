import React, { useState } from 'react';
import { Calendar, Dumbbell, Film, Sparkles, Clock, Check, AlertCircle, Plus, Upload, X, CheckSquare, PlusCircle } from 'lucide-react';
import { AmenityBooking, GymTheatreLog } from '../../types';

interface AmenitiesSectionProps {
  wing: string;
  flatNo: number;
  amenityBookings: AmenityBooking[];
  gymTheatreLogs: GymTheatreLog[];
  handleAddAmenityBooking: (e: React.FormEvent) => void;
  handleVoteAmenityBooking: (id: string) => void;
  handleCheckInGymTheatre: (amenity: 'Gym' | 'Theatre') => void;
  handleCheckOutGymTheatreFlow: (log: GymTheatreLog) => void;
  showExitPhotoModal: boolean;
  setShowExitPhotoModal: (show: boolean) => void;
  exitPhotoBase64: string;
  handleExitPhotoChange: (file: File) => void;
  handleConfirmCheckOut: () => void;
  exitPhotoTimeError: boolean;
  activeCheckInLog: GymTheatreLog | null;
  gymTheatreSuccess: string;
  gymTheatreError: string;
  amenityBookingSuccess: string;
  amenityBookingError: string;

  // Form states passed down or controlled inside
  fPropertyName: string;
  setFPropertyName: (text: string) => void;
  fDateFrom: string;
  setFDateFrom: (text: string) => void;
  fDateTo: string;
  setFDateTo: (text: string) => void;
  fReason: string;
  setFReason: (text: string) => void;
  fStuffNeeded: string;
  setFStuffNeeded: (text: string) => void;
  fParkingRequest: string;
  setFParkingRequest: (text: string) => void;
}

export default function AmenitiesSection({
  wing,
  flatNo,
  amenityBookings,
  gymTheatreLogs,
  handleAddAmenityBooking,
  handleVoteAmenityBooking,
  handleCheckInGymTheatre,
  handleCheckOutGymTheatreFlow,
  showExitPhotoModal,
  setShowExitPhotoModal,
  exitPhotoBase64,
  handleExitPhotoChange,
  handleConfirmCheckOut,
  exitPhotoTimeError,
  activeCheckInLog,
  gymTheatreSuccess,
  gymTheatreError,
  amenityBookingSuccess,
  amenityBookingError,
  fPropertyName,
  setFPropertyName,
  fDateFrom,
  setFDateFrom,
  fDateTo,
  setFDateTo,
  fReason,
  setFReason,
  fStuffNeeded,
  setFStuffNeeded,
  fParkingRequest,
  setFParkingRequest
}: AmenitiesSectionProps) {
  const [subTab, setSubTab] = useState<'booking' | 'gym_theatre'>('booking');
  const myFlatId = `${wing}-${flatNo}`;

  // Find if currently checked in to Gym or Theatre
  const activeGym = gymTheatreLogs.find(l => l.flatId === myFlatId && l.amenity === 'Gym' && !l.checkOutTime);
  const activeTheatre = gymTheatreLogs.find(l => l.flatId === myFlatId && l.amenity === 'Theatre' && !l.checkOutTime);

  // Total owners = 96. "1/2 + 1" = 49 approvals threshold
  const THRESHOLD = 49;

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center space-x-2.5 mb-6 border-b border-slate-100 pb-3">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-display font-bold text-base text-slate-800">Orchid Heights Club & Amenities</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Function bookings & real-time entry/exit logs</p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl mb-6">
          <button
            onClick={() => setSubTab('booking')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${subTab === 'booking' ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Calendar className="w-4 h-4" />
            <span>Function Hall Booking</span>
          </button>
          <button
            onClick={() => setSubTab('gym_theatre')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${subTab === 'gym_theatre' ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Gym & Movie Theatre Log</span>
          </button>
        </div>

        {/* --- Tab 1: Function Booking --- */}
        {subTab === 'booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form to book */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
              <div className="flex items-center space-x-1.5 text-slate-800">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider">Host a Function</h4>
              </div>

              {amenityBookingError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                  {amenityBookingError}
                </div>
              )}

              {amenityBookingSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs">
                  {amenityBookingSuccess}
                </div>
              )}

              <form onSubmit={handleAddAmenityBooking} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Property / Location</label>
                  <select
                    value={fPropertyName}
                    onChange={(e) => setFPropertyName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none"
                  >
                    <option value="Clubhouse Party Hall">Clubhouse Party Hall</option>
                    <option value="Terrace Garden Lounge">Terrace Garden Lounge</option>
                    <option value="Society Pavilion Ground">Society Pavilion Ground</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">From Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={fDateFrom}
                      onChange={(e) => setFDateFrom(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">To Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={fDateTo}
                      onChange={(e) => setFDateTo(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Purpose of Function</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daughter's Birthday Celebration"
                    value={fReason}
                    onChange={(e) => setFReason(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Society Stuff Needed</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50 chairs, 6 big tables, sound system"
                    value={fStuffNeeded}
                    onChange={(e) => setFStuffNeeded(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Basement Parking requests (Guests)</label>
                  <input
                    type="text"
                    placeholder="e.g. Park 15 guest vehicles in underground parking"
                    value={fParkingRequest}
                    onChange={(e) => setFParkingRequest(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  File Booking Request
                </button>
              </form>
            </div>

            {/* Right Column: Other bookings and Voting board */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-600">Active Bookings & Approvals Panel</h4>
                <span className="text-[9px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                  {THRESHOLD} owner votes required to clear (1/2 + 1)
                </span>
              </div>

              {amenityBookings.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/20">
                  <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No active bookings registered.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {amenityBookings.map((booking) => {
                    const totalVotes = booking.approvedFlats?.length || 0;
                    const isCleared = totalVotes >= THRESHOLD;
                    const votedThisFlat = booking.approvedFlats?.includes(myFlatId);

                    return (
                      <div
                        key={booking.id}
                        className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition relative overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="bg-indigo-100 text-indigo-800 font-mono text-[9px] font-black px-2.5 py-0.5 rounded uppercase">
                                Flat {booking.flatId}
                              </span>
                              <h5 className="font-bold text-xs text-slate-800 mt-1 uppercase">
                                {booking.propertyName}
                              </h5>
                            </div>

                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                              isCleared 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isCleared ? '✅ Approved/Cleared' : 'Pending approvals'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-slate-600 mt-3 border-t border-slate-100/50 pt-2.5">
                            <p><span className="text-slate-400">Duration:</span> {new Date(booking.dateFrom).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} to {new Date(booking.dateTo).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            <p><span className="text-slate-400">Purpose:</span> {booking.reason}</p>
                            <p><span className="text-slate-400">Stuff needed:</span> {booking.stuffNeeded}</p>
                            {booking.parkingRequest && <p><span className="text-slate-400">Basement:</span> {booking.parkingRequest}</p>}
                          </div>
                        </div>

                        {/* Voting controls */}
                        <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 mt-3">
                          <div className="text-left">
                            <p className="text-[8px] font-mono font-bold text-slate-400 uppercase leading-none">Approvals Tracker</p>
                            <p className="text-xs font-black text-slate-700 mt-1 font-mono">
                              {totalVotes} / {THRESHOLD} votes
                            </p>
                          </div>

                          {booking.flatId !== myFlatId ? (
                            <button
                              onClick={() => handleVoteAmenityBooking(booking.id)}
                              className={`py-1.5 px-3.5 rounded-lg text-[10px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                                votedThisFlat 
                                  ? 'bg-emerald-500 text-white shadow-sm' 
                                  : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600'
                              }`}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>{votedThisFlat ? 'Approved ✓' : 'Approve Booking'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-indigo-500 italic font-medium">Your own booking</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Tab 2: Gym & Movie Theatre Logging --- */}
        {subTab === 'gym_theatre' && (
          <div className="space-y-6">
            {gymTheatreError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                {gymTheatreError}
              </div>
            )}

            {gymTheatreSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs">
                {gymTheatreSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Gym */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between text-center relative overflow-hidden">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-200 shadow-sm">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-800">Sardar Patel Society Gym</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Check-in at entrance, check-out on departure</p>
                  </div>
                </div>

                <div className="mt-6">
                  {activeGym ? (
                    <div className="space-y-3">
                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Checked In Since</p>
                        <p className="text-xs font-black text-slate-800 mt-1 font-mono">
                          {new Date(activeGym.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckOutGymTheatreFlow(activeGym)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow cursor-pointer transition-all"
                      >
                        Vidaay Check-Out (Exit)
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckInGymTheatre('Gym')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow cursor-pointer transition-all"
                    >
                      Aagman Check-In (Enter)
                    </button>
                  )}
                </div>
              </div>

              {/* Box 2: Theatre */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between text-center relative overflow-hidden">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-200 shadow-sm">
                    <Film className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-800">Mini Movie Theatre Room</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Log entry and exits for audit logs</p>
                  </div>
                </div>

                <div className="mt-6">
                  {activeTheatre ? (
                    <div className="space-y-3">
                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Checked In Since</p>
                        <p className="text-xs font-black text-slate-800 mt-1 font-mono">
                          {new Date(activeTheatre.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckOutGymTheatreFlow(activeTheatre)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow cursor-pointer transition-all"
                      >
                        Vidaay Check-Out (Exit)
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckInGymTheatre('Theatre')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow cursor-pointer transition-all"
                    >
                      Aagman Check-In (Enter)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Past Log list for Gym/Theatre */}
            <div className="space-y-3 border-t border-slate-100 pt-6">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-600">Past Logbook Records</h4>
              
              {gymTheatreLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs">No records logged in the system yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {gymTheatreLogs.map((log) => (
                    <div key={log.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs gap-4 shadow-sm relative overflow-hidden">
                      <div className="flex items-center space-x-3 text-left">
                        <span className="text-xl p-1 bg-white border rounded-lg shrink-0">
                          {log.amenity === 'Gym' ? '🏋️' : '🎬'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 uppercase">{log.amenity} Log ({log.flatId})</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-1">
                            In: {new Date(log.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} 
                            {log.checkOutTime && ` • Out: ${new Date(log.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {log.checkOutTime ? (
                          <div className="space-y-1">
                            <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                              {log.durationMinutes} Mins Duration
                            </span>
                            {log.exitPhotoUrl && (
                              <img src={log.exitPhotoUrl} className="w-8 h-8 object-cover rounded border border-slate-200 ml-auto" alt="exit checkpoint" />
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider animate-pulse">
                            Active Session
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Exit Security Photo Verification Modal --- */}
      {showExitPhotoModal && activeCheckInLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowExitPhotoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-left space-y-2">
              <h3 className="font-display font-extrabold text-base text-slate-800">
                Exit Check-Out Verification ({activeCheckInLog.amenity})
              </h3>
              <p className="text-xs text-slate-500">
                Please snap or upload a fresh live photo to complete society safety requirements.
              </p>
            </div>

            {/* 15-minute safety check warning */}
            {exitPhotoTimeError && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start space-x-1.5 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">⚠️ SECURITY AUDIT VERIFICATION</p>
                  <p className="text-[10px] text-red-600 font-medium mt-0.5">Your checked-in time exceeds 15 minutes. A fresh live photo of the gym/theatre state is mandatory to clear check-out.</p>
                </div>
              </div>
            )}

            {/* Drag & Drop File Upload */}
            <div
              onClick={() => document.getElementById('exit-photo-picker')?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                exitPhotoBase64 ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input
                id="exit-photo-picker"
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleExitPhotoChange(e.target.files[0]);
                  }
                }}
              />

              {exitPhotoBase64 ? (
                <div className="space-y-2">
                  <img src={exitPhotoBase64} alt="Captured exit state" className="w-24 h-24 object-cover mx-auto rounded-lg border border-slate-200 shadow-sm" />
                  <p className="text-[10px] text-emerald-600 font-bold">✓ Photo Uploaded Successfully</p>
                </div>
              ) : (
                <div className="space-y-1 text-slate-500">
                  <div className="mx-auto w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Take a Live Photo or Upload</p>
                  <p className="text-[9px] text-slate-400">Supports Camera capture directly</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExitPhotoModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckOut}
                disabled={!exitPhotoBase64}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                Confirm Exit Check-Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
