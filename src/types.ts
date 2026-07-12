/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vehicle {
  id: string;
  type: 'twowheeler' | 'fourwheeler';
  plateNumber: string;
  brandModel: string;
  parkingPlot?: string;
}

export interface DeviceInfo {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  imei: string;
  os: string;
  browser: string;
  lastLogin: string;
}

export interface FlatOwner {
  wing: 'A' | 'B';
  flatNo: number;
  nameEn: string;
  nameGu: string;
  phone: string;
  secondaryContact?: string;
  members: string[]; // max 2 members added by flat owner
  vehicles: Vehicle[];
  notificationsEnabled?: boolean; // toggle to enable/disable alerts
  devices?: DeviceInfo[]; // Registered devices tracking
}

export interface Visitor {
  id: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  wing: 'A' | 'B';
  flatNo: number;
  reason: string;
  guestType: string; // e.g. milkman, guest, electrician, delivery, laundry, etc.
  photoUrl: string; // Base64 data URI or placeholder
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestTime: string; // ISO timestamp
  respondedTime?: string; // ISO timestamp
  flatOwnerName: string;
  visitorCount?: number; // total number of visitors
  respondedBy?: string; // name of who approved/rejected
  rejectReason?: string; // optional reason if rejected
  deletedByResident?: boolean; // soft deletion tracker
}

export type UserRole = 'security' | 'owner' | 'admin';

export interface UserSession {
  role: UserRole;
  wing?: 'A' | 'B';
  flatNo?: number;
  ownerName?: string;
}

export interface Announcement {
  id: string;
  target: 'all' | 'wing' | 'flat';
  wing?: 'A' | 'B';
  flatNo?: number;
  text: string;
  timestamp: string;
  sender: string;
  imageUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  fileName?: string;
  fileType?: string;
  attachments?: Array<{ url: string; name: string; type: string }>;
}

export interface Complaint {
  id: string;
  flatId: string;
  title: string;
  description: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaType?: string;
  status: 'open' | 'in-progress' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  processNotes?: string;
  attachments?: Array<{ url: string; name: string; type: string }>;
}

export interface FinancialReport {
  id: string;
  month: string;
  year: number;
  title: string;
  description: string;
  pdfUrl?: string;
  fileName?: string;
  fileType?: string;
  totalExpense: number;
  createdAt: string;
  uploadedBy: string;
  reportType?: 'expense' | 'welfare' | 'statement' | 'other';
  attachments?: Array<{ url: string; name: string; type: string }>;
}

export interface EssentialContact {
  id: string;
  name: string;
  category: 'Plumber' | 'Electrician' | 'Security' | 'Manager' | 'Gardener' | 'Other';
  phone: string;
  alternatePhone?: string;
  active: boolean;
}

export interface AmenityBooking {
  id: string;
  flatId: string;
  propertyName: string;
  dateFrom: string;
  dateTo: string;
  reason: string;
  stuffNeeded: string;
  parkingRequest: string;
  approvedFlats: string[];
  createdAt: string;
}

export interface GymTheatreLog {
  id: string;
  flatId: string;
  amenity: 'Gym' | 'Theatre';
  checkInTime: string;
  checkOutTime?: string;
  exitPhotoUrl?: string;
  durationMinutes?: number;
  createdAt: string;
}

export interface DailyHelper {
  id: string;
  name: string;
  phone: string;
  role: 'Maid' | 'Milkman' | 'Car Cleaner' | 'Newspaper Guy' | 'Other';
  flats: string[];
}

export interface AbsenceLog {
  id: string;
  flatId: string;
  dateFrom: string;
  dateTo: string;
  milkRedirectFlat?: string;
  newspaperRedirectFlat?: string;
  parcelRedirectFlat?: string;
  createdAt: string;
}
