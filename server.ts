/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { getInitialOwners } from './src/data/ownersData';
import { FlatOwner, Visitor } from './src/types';

interface DatabaseSchema {
  owners: FlatOwner[];
  visitors: Visitor[];
  passwords: Record<string, string>; // key: "wing-flatNo" -> password
}

const DB_FILE = path.join(process.cwd(), 'db.json');

// Helper to load or initialize database
function getDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      // Validate structure roughly
      if (data && Array.isArray(data.owners) && Array.isArray(data.visitors) && data.passwords) {
        return data as DatabaseSchema;
      }
    }
  } catch (error) {
    console.error('Failed to read or parse db.json. Reinitializing...', error);
  }

  // Generate initial database
  const initialOwners = getInitialOwners();
  const passwords: Record<string, string> = {};

  // Default passwords
  for (const owner of initialOwners) {
    const key = `${owner.wing}-${owner.flatNo}`;
    if (owner.wing === 'B' && owner.flatNo === 1104) {
      passwords[key] = '9898180810'; // Admin Rahul Popat
    } else {
      passwords[key] = 'admin@123'; // Default
    }
  }

  const newDb: DatabaseSchema = {
    owners: initialOwners,
    visitors: [],
    passwords
  };

  saveDatabase(newDb);
  return newDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write database to db.json', error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to handle large base64 camera image uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Initialize DB
  const db = getDatabase();

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Auth: Login endpoint
  app.post('/api/auth/login', (req, res) => {
    const { role, username, password, wing, flatNo } = req.body;

    if (role === 'security') {
      if (username === 'admin' && password === 'admin@123') {
        return res.json({
          success: true,
          session: { role: 'security', name: 'Security Guard' }
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid Security Guard credentials.' });
    }

    if (role === 'owner' || role === 'admin') {
      if (!wing || !flatNo) {
        return res.status(400).json({ success: false, message: 'Wing and Flat number are required.' });
      }

      const flatNum = parseInt(flatNo, 10);
      const key = `${wing}-${flatNum}`;
      const savedPassword = db.passwords[key] || 'admin@123';

      if (password === savedPassword) {
        const owner = db.owners.find((o) => o.wing === wing && o.flatNo === flatNum);
        const isB1104Admin = wing === 'B' && flatNum === 1104;

        return res.json({
          success: true,
          session: {
            role: isB1104Admin ? 'admin' : 'owner',
            wing,
            flatNo: flatNum,
            ownerName: owner ? owner.nameEn : `Flat ${wing}-${flatNum}`
          }
        });
      }

      return res.status(401).json({ success: false, message: 'Invalid password. Default is admin@123.' });
    }

    return res.status(400).json({ success: false, message: 'Invalid role specified.' });
  });

  // Get directory of all owners (with vehicle/members details)
  app.get('/api/owners', (req, res) => {
    res.json(db.owners);
  });

  // Update flat owner details (members, vehicles, secondary contact, etc.)
  app.put('/api/owners/:wing/:flatNo', (req, res) => {
    const { wing, flatNo } = req.params;
    const flatNum = parseInt(flatNo, 10);
    const { nameEn, nameGu, phone, secondaryContact, members, vehicles, password } = req.body;

    const ownerIdx = db.owners.findIndex((o) => o.wing === wing && o.flatNo === flatNum);
    if (ownerIdx === -1) {
      return res.status(404).json({ success: false, message: 'Flat not found.' });
    }

    const currentOwner = db.owners[ownerIdx];

    // Update allowable fields
    if (nameEn !== undefined) currentOwner.nameEn = nameEn;
    if (nameGu !== undefined) currentOwner.nameGu = nameGu;
    if (phone !== undefined) currentOwner.phone = phone;
    if (secondaryContact !== undefined) currentOwner.secondaryContact = secondaryContact;
    if (members !== undefined) {
      // Limit to max 2 members as requested by user
      currentOwner.members = members.slice(0, 2);
    }
    if (vehicles !== undefined) {
      currentOwner.vehicles = vehicles;
    }

    // Handle password update if provided
    if (password) {
      db.passwords[`${wing}-${flatNum}`] = password;
    }

    saveDatabase(db);
    res.json({ success: true, owner: currentOwner });
  });

  // Update password of a specific flat owner (Admin action)
  app.post('/api/admin/change-password', (req, res) => {
    const { wing, flatNo, newPassword } = req.body;
    if (!wing || !flatNo || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    const key = `${wing}-${flatNo}`;
    db.passwords[key] = newPassword;
    saveDatabase(db);

    res.json({ success: true, message: `Password for Flat ${wing}-${flatNo} updated successfully.` });
  });

  // Reset entire DB to initial state (Admin action)
  app.post('/api/admin/reset-db', (req, res) => {
    const initialOwners = getInitialOwners();
    const passwords: Record<string, string> = {};

    for (const owner of initialOwners) {
      const key = `${owner.wing}-${owner.flatNo}`;
      if (owner.wing === 'B' && owner.flatNo === 1104) {
        passwords[key] = '9898180810';
      } else {
        passwords[key] = 'admin@123';
      }
    }

    db.owners = initialOwners;
    db.visitors = [];
    db.passwords = passwords;

    saveDatabase(db);
    res.json({ success: true, message: 'Database reset to initial Excel data.' });
  });

  // Create a visitor request (called by security)
  app.post('/api/visitors', (req, res) => {
    const { fullName, mobileNumber, email, wing, flatNo, reason, guestType, photoUrl, flatOwnerName } = req.body;

    if (!fullName || !mobileNumber || !wing || !flatNo || !reason || !guestType) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    const flatNum = parseInt(flatNo, 10);

    const newVisitor: Visitor = {
      id: 'v_' + Math.random().toString(36).substr(2, 9),
      fullName,
      mobileNumber,
      email: email || '',
      wing,
      flatNo: flatNum,
      reason,
      guestType,
      photoUrl: photoUrl || '',
      status: 'pending',
      requestTime: new Date().toISOString(),
      flatOwnerName: flatOwnerName || `Flat ${wing}-${flatNum}`
    };

    db.visitors.push(newVisitor);
    saveDatabase(db);

    res.status(201).json(newVisitor);
  });

  // Fetch visitor history or active requests
  app.get('/api/visitors', (req, res) => {
    const { wing, flatNo, limit } = req.query;

    let filtered = [...db.visitors];

    if (wing) {
      filtered = filtered.filter((v) => v.wing === wing);
    }
    if (flatNo) {
      const flatNum = parseInt(flatNo as string, 10);
      filtered = filtered.filter((v) => v.flatNo === flatNum);
    }

    // Newest first
    filtered.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());

    if (limit) {
      const lim = parseInt(limit as string, 10);
      filtered = filtered.slice(0, lim);
    }

    res.json(filtered);
  });

  // Poll for pending visitor requests for a specific flat
  app.get('/api/visitors/poll/:wing/:flatNo', (req, res) => {
    const { wing, flatNo } = req.params;
    const flatNum = parseInt(flatNo, 10);

    // Get any visitor for this flat that is 'pending'
    const pending = db.visitors.filter(
      (v) => v.wing === wing && v.flatNo === flatNum && v.status === 'pending'
    );

    res.json(pending);
  });

  // Respond to a visitor request (approved / rejected)
  app.post('/api/visitors/:id/respond', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected'

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Invalid response status.' });
    }

    const visitor = db.visitors.find((v) => v.id === id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor request not found.' });
    }

    visitor.status = status;
    visitor.respondedTime = new Date().toISOString();

    saveDatabase(db);
    res.json({ success: true, visitor });
  });

  // Get status of a single visitor (called by security guard to check on pending)
  app.get('/api/visitors/:id/status', (req, res) => {
    const { id } = req.params;
    const visitor = db.visitors.find((v) => v.id === id);

    if (!visitor) {
      return res.status(404).json({ success: false, status: 'unknown', message: 'Visitor not found' });
    }

    res.json({
      id: visitor.id,
      status: visitor.status,
      fullName: visitor.fullName,
      respondedTime: visitor.respondedTime
    });
  });

  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
