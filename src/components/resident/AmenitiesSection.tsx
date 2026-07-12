import React, { useState, useEffect } from 'react';
import { Calendar, Dumbbell, Film, Sparkles, Clock, Check, AlertCircle, Plus, Upload, X, CheckSquare, PlusCircle, ArrowRight, Users, CheckCircle2 } from 'lucide-react';
import { AmenityBooking, GymTheatreLog } from '../../types';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc } from '../../lib/firebase';

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

  // Form states passed down
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

interface MovieScreening {
  id: string;
  title: string;
  genre: string;
  timing: string;
  synopsis: string;
  rating: string;
  posterUrl: string;
}

const DEFAULT_MOVIES: MovieScreening[] = [
  {
    id: 'movie_1',
    title: 'Singham Again',
    genre: 'Action / Drama',
    timing: 'Friday • 8:00 PM',
    synopsis: 'Supercop Bajirao Singham returns to battle a dangerous international conspiracy threatening national security.',
    rating: 'UA • 2h 40m',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'movie_2',
    title: 'Bhool Bhulaiyaa 3',
    genre: 'Horror / Comedy',
    timing: 'Saturday • 9:00 PM',
    synopsis: 'Rooh Baba enters a haunted estate in Bengal, only to find himself facing two vengeful spirits claiming to be Manjulika.',
    rating: 'UA • 2h 32m',
    posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'movie_3',
    title: 'Stree 2',
    genre: 'Comedy / Horror',
    timing: 'Sunday • 4:00 PM',
    synopsis: 'The town of Chanderi is haunted by a new headless monster "Sarkata". The resident group rallies Stree to save them.',
    rating: 'UA • 2h 27m',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80'
  }
];

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
  const myFlatId = `${wing}-${flatNo}`;
  const THRESHOLD = 49;

  // Real-time Movie RSVPs state
  const [rsvps, setRsvps] = useState<Array<{ id: string; movieId: string; flatId: string }>>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'movie_rsvps'), (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setRsvps(list);
    }, (error) => {
      console.error('Error listening to movie RSVPs:', error);
    });
    return () => unsub();
  }, []);

  const handleToggleRSVP = async (movieId: string) => {
    const myRsvp = rsvps.find(r => r.movieId === movieId && r.flatId === myFlatId);
    try {
      if (myRsvp) {
        await deleteDoc(doc(db, 'movie_rsvps', myRsvp.id));
      } else {
        const id = `${movieId}_${myFlatId}`;
        await setDoc(doc(db, 'movie_rsvps', id), {
          movieId,
          flatId: myFlatId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to toggle movie RSVP:', err);
    }
  };

  // Find if currently checked in to Gym or Theatre
  const activeGym = gymTheatreLogs.find(l => l.flatId === myFlatId && l.amenity === 'Gym' && !l.checkOutTime);
  const activeTheatre = gymTheatreLogs.find(l => l.flatId === myFlatId && l.amenity === 'Theatre' && !l.checkOutTime);

  return (
    <div className="space-y-8 text-left pb-16">
      
      {/* ==================== BLOCK 1: GYM & MOVIE THEATRE ACCESS LOGGER ==================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <Dumbbell className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h3 className="font-display font-black text-sm text-slate-800 uppercase tracking-tight">Gym & Mini Theatre Access Gate</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Check-in at entrance, verification checkout at departure</p>
          </div>
        </div>

        {gymTheatreError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{gymTheatreError}</span>
          </div>
        )}

        {gymTheatreSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2 font-bold">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{gymTheatreSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gym Box */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between text-center hover:border-slate-300 transition relative">
            <div className="space-y-2">
              <span className="inline-flex w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full items-center justify-center border border-indigo-100 shadow-xs">
                🏋️
              </span>
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-tight">Society Fitness Gym</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Live Occupancy Status & Tracking</p>
              </div>
            </div>

            <div className="mt-4">
              {activeGym ? (
                <div className="space-y-2">
                  <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-left">
                    <p className="text-[8px] font-mono font-bold text-slate-400 uppercase leading-none">Checked In At</p>
                    <p className="text-xs font-black text-slate-800 mt-1 font-mono">
                      {new Date(activeGym.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckOutGymTheatreFlow(activeGym)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-4 rounded-lg text-[10px] uppercase cursor-pointer transition-all shadow-xs"
                  >
                    Vidaay (Exit Checkout)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleCheckInGymTheatre('Gym')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-lg text-[10px] uppercase cursor-pointer transition-all shadow-xs"
                >
                  Aagman (Enter Gym)
                </button>
              )}
            </div>
          </div>

          {/* Theatre Box */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between text-center hover:border-slate-300 transition relative">
            <div className="space-y-2">
              <span className="inline-flex w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full items-center justify-center border border-indigo-100 shadow-xs">
                🎬
              </span>
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-tight">Mini Movie Theatre Room</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Log screen admissions and exits</p>
              </div>
            </div>

            <div className="mt-4">
              {activeTheatre ? (
                <div className="space-y-2">
                  <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-left">
                    <p className="text-[8px] font-mono font-bold text-slate-400 uppercase leading-none">Checked In At</p>
                    <p className="text-xs font-black text-slate-800 mt-1 font-mono">
                      {new Date(activeTheatre.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckOutGymTheatreFlow(activeTheatre)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-4 rounded-lg text-[10px] uppercase cursor-pointer transition-all shadow-xs"
                  >
                    Vidaay (Exit Checkout)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleCheckInGymTheatre('Theatre')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-lg text-[10px] uppercase cursor-pointer transition-all shadow-xs"
                >
                  Aagman (Enter Theatre)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live log entries */}
        <div className="space-y-2.5 border-t border-slate-100 pt-4">
          <h4 className="font-display font-black text-[10px] uppercase tracking-wider text-slate-500">Society Access logbook history</h4>
          
          {gymTheatreLogs.length === 0 ? (
            <p className="text-[11px] text-slate-400 py-2">No records logged in the system yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
              {gymTheatreLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="bg-slate-50 border border-slate-150 p-3 rounded-lg flex items-center justify-between text-[11px] gap-3">
                  <div className="text-left leading-normal min-w-0 flex-1">
                    <p className="font-bold text-slate-800 uppercase text-[10px] truncate">
                      {log.amenity === 'Gym' ? '🏋️ Gym' : '🎬 Theatre'} ({log.flatId})
                    </p>
                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                      In: {new Date(log.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} 
                      {log.checkOutTime && ` • Out: ${new Date(log.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {log.checkOutTime ? (
                      <div className="space-y-1">
                        <span className="text-[7px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-1 py-0.5 rounded font-mono font-bold uppercase">
                          {log.durationMinutes}m
                        </span>
                        {log.exitPhotoUrl && (
                          <img src={log.exitPhotoUrl} className="w-6 h-6 object-cover rounded border border-slate-200 ml-auto" alt="exit verification" />
                        )}
                      </div>
                    ) : (
                      <span className="text-[7px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono font-black uppercase tracking-wider animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== BLOCK 2: MINI MOVIE THEATRE SCREENING SCHEDULE ==================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <Film className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h3 className="font-display font-black text-sm text-slate-800 uppercase tracking-tight">Mini Movie Theatre Schedule</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Book seats & RSVP for upcoming blockbusters in the society lounge</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_MOVIES.map((movie) => {
            const movieRSVPs = rsvps.filter(r => r.movieId === movie.id);
            const hasRSVPed = movieRSVPs.some(r => r.flatId === myFlatId);

            return (
              <div key={movie.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
                <div className="relative h-32 w-full bg-slate-900">
                  <img src={movie.posterUrl} className="w-full h-full object-cover opacity-80" alt={movie.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent flex flex-col justify-end p-3">
                    <span className="text-[8px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded w-max uppercase tracking-wider font-mono">
                      {movie.rating}
                    </span>
                    <h4 className="font-display font-black text-white text-xs sm:text-sm tracking-tight leading-tight mt-1 uppercase">
                      {movie.title}
                    </h4>
                  </div>
                </div>

                <div className="p-3 text-left space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold font-mono">
                      <span>{movie.genre}</span>
                      <span className="text-indigo-600">{movie.timing}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                      {movie.synopsis}
                    </p>
                  </div>

                  <div className="border-t border-slate-150 pt-2.5 mt-2 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[7px] font-mono font-bold text-slate-400 uppercase leading-none">Attending RSVPs</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[10px] font-black text-slate-700 font-mono">
                          {movieRSVPs.length} Flats
                        </span>
                      </div>
                      {movieRSVPs.length > 0 && (
                        <p className="text-[8px] text-slate-400 font-mono truncate max-w-[100px] mt-0.5">
                          {movieRSVPs.map(r => r.flatId).join(', ')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleRSVP(movie.id)}
                      className={`py-1.5 px-3 rounded-lg text-[9px] font-extrabold uppercase transition-all duration-150 cursor-pointer shadow-xs select-none ${
                        hasRSVPed
                          ? 'bg-emerald-500 text-white border border-emerald-600'
                          : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {hasRSVPed ? '✓ RSVPed' : 'Reserve Seat'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== BLOCK 3: FUNCTION HALL BOOKINGS & DECISION ENGINE ==================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <h3 className="font-display font-black text-sm text-slate-800 uppercase tracking-tight">Function Hall Bookings Suite</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Host family celebrations, track owner voting boards, and manage approvals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Booking Form (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-xl space-y-4 text-left">
            <div className="flex items-center space-x-1.5 text-slate-800">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider">Host a Function</h4>
            </div>

            {amenityBookingError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                {amenityBookingError}
              </div>
            )}

            {amenityBookingSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs">
                {amenityBookingSuccess}
              </div>
            )}

            <form onSubmit={handleAddAmenityBooking} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Location Property</label>
                <select
                  value={fPropertyName}
                  onChange={(e) => setFPropertyName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold outline-none"
                >
                  <option value="Clubhouse Party Hall">Clubhouse Party Hall</option>
                  <option value="Terrace Garden Lounge">Terrace Garden Lounge</option>
                  <option value="Society Pavilion Ground">Society Pavilion Ground</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Start Date/Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={fDateFrom}
                    onChange={(e) => setFDateFrom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">End Date/Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={fDateTo}
                    onChange={(e) => setFDateTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Function Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Birthday Celebration"
                  value={fReason}
                  onChange={(e) => setFReason(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Assets Needed (Chairs, Tables, etc.)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 Chairs, 5 Tables"
                  value={fStuffNeeded}
                  onChange={(e) => setFStuffNeeded(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Basement Guest Parking (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Park 10 Guest vehicles"
                  value={fParkingRequest}
                  onChange={(e) => setFParkingRequest(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-lg text-xs shadow-xs transition-all cursor-pointer"
              >
                File Booking Request
              </button>
            </form>
          </div>

          {/* Booking Approvals (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <h4 className="font-display font-black text-xs uppercase tracking-wider text-slate-600">Active Bookings Voting Board</h4>
              <span className="text-[9px] font-mono font-black bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full w-max">
                {THRESHOLD} flat owner votes to clear
              </span>
            </div>

            {amenityBookings.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/20">
                <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-semibold">No active bookings registered.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {amenityBookings.map((booking) => {
                  const totalVotes = booking.approvedFlats?.length || 0;
                  
                  // Calculate 72-hour automated decision window countdown
                  const createdTime = new Date(booking.createdAt || Date.now()).getTime();
                  const hoursElapsed = (Date.now() - createdTime) / 3600000;
                  const hoursRemaining = Math.max(0, 72 - hoursElapsed);
                  
                  // Approved if threshold reached
                  const isCleared = totalVotes >= THRESHOLD;
                  // Expired if 72 hours passed and not approved
                  const isExpired = hoursElapsed > 72 && !isCleared;
                  
                  const votedThisFlat = booking.approvedFlats?.includes(myFlatId);

                  return (
                    <div
                      key={booking.id}
                      className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between text-left space-y-3"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="bg-indigo-100 text-indigo-800 font-mono text-[9px] font-black px-2 py-0.5 rounded uppercase">
                              Flat {booking.flatId}
                            </span>
                            <h5 className="font-bold text-xs text-slate-800 mt-1 uppercase">
                              {booking.propertyName}
                            </h5>
                          </div>

                          <div className="text-right shrink-0">
                            {isCleared ? (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold px-2 py-0.5 rounded border uppercase">
                                ✅ Cleared & Approved
                              </span>
                            ) : isExpired ? (
                              <span className="text-[8px] bg-red-50 text-red-700 border border-red-200 font-mono font-bold px-2 py-0.5 rounded border uppercase">
                                ❌ Expired (Not Approved)
                              </span>
                            ) : (
                              <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold px-2 py-0.5 rounded border uppercase animate-pulse">
                                ⏳ {Math.round(hoursRemaining)}h Left to Vote
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-600 mt-2.5 border-t border-slate-100 pt-2">
                          <p><span className="text-slate-400 font-bold uppercase text-[9px]">Duration:</span> {new Date(booking.dateFrom).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} to {new Date(booking.dateTo).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          <p><span className="text-slate-400 font-bold uppercase text-[9px]">Purpose:</span> {booking.reason}</p>
                          <p><span className="text-slate-400 font-bold uppercase text-[9px]">Stuff:</span> {booking.stuffNeeded}</p>
                          {booking.parkingRequest && <p><span className="text-slate-400 font-bold uppercase text-[9px]">Basement:</span> {booking.parkingRequest}</p>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200/50 pt-2.5">
                        <div className="text-left">
                          <p className="text-[8px] font-mono font-bold text-slate-400 uppercase leading-none">Approvals Tracker</p>
                          <p className="text-xs font-black text-slate-700 mt-1 font-mono">
                            {totalVotes} / {THRESHOLD} Votes
                          </p>
                        </div>

                        {booking.flatId !== myFlatId ? (
                          <button
                            onClick={() => handleVoteAmenityBooking(booking.id)}
                            disabled={isCleared || isExpired}
                            className={`py-1.5 px-3 rounded-lg text-[9px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                              votedThisFlat 
                                ? 'bg-emerald-500 text-white border border-emerald-600' 
                                : isCleared || isExpired
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>{votedThisFlat ? 'Approved ✓' : 'Vote Approve'}</span>
                          </button>
                        ) : (
                          <span className="text-[9px] text-indigo-500 font-bold italic">Your Request</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Exit Security Photo Verification Modal --- */}
      {showExitPhotoModal && activeCheckInLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-4 text-left">
            <button
              onClick={() => setShowExitPhotoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
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
                  <p className="text-[10px] text-red-600 font-medium mt-0.5">
                    Your exit photo is too old. A brand new live photo of the current state of the facility is mandatory.
                  </p>
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
                  <p className="text-[10px] text-emerald-600 font-bold">✓ Live Photo Verified</p>
                </div>
              ) : (
                <div className="space-y-1 text-slate-500">
                  <div className="mx-auto w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Take a Live Photo or Upload</p>
                  <p className="text-[9px] text-slate-400">Supports camera capture directly</p>
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
