/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vehicle {
  id: string;
  type: 'twowheeler' | 'fourwheeler';
  plateNumber: string;
  brandModel: string;
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
  status: 'pending' | 'approved' | 'rejected';
  requestTime: string; // ISO timestamp
  respondedTime?: string; // ISO timestamp
  flatOwnerName: string;
}

export type UserRole = 'security' | 'owner' | 'admin';

export interface UserSession {
  role: UserRole;
  wing?: 'A' | 'B';
  flatNo?: number;
  ownerName?: string;
}
