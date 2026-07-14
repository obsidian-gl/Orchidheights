/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  verifyCredentials,
  getAllOwners,
  updateOwnerDetails,
  adminChangePassword,
  resetDatabaseToDefault,
  registerVisitor,
  getVisitorsList,
  pollPendingVisitorAlerts,
  respondToVisitorRequest,
  deleteVisitorRequest,
  seedDatabaseIfNeeded,
  getCollection,
  getDocument,
  addDocument,
  setDocument,
  deleteDocument
} from './src/lib/server-db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to handle large base64 camera image uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Seed Firestore if it is a completely empty database
  try {
    await seedDatabaseIfNeeded();
  } catch (err) {
    console.error('Initial Firestore seeding failed:', err);
  }

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Generic REST Fallback endpoints for Client ---
  app.get('/api/db/:collectionName', async (req, res) => {
    try {
      const { collectionName } = req.params;
      const data = await getCollection(collectionName);
      res.json(data);
    } catch (err: any) {
      console.error(`Generic API GET Collection ${req.params.collectionName} error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/db/:collectionName/:docId', async (req, res) => {
    try {
      const { collectionName, docId } = req.params;
      const data = await getDocument(collectionName, docId);
      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ error: 'Document not found' });
      }
    } catch (err: any) {
      console.error(`Generic API GET Doc ${req.params.collectionName}/${req.params.docId} error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/:collectionName', async (req, res) => {
    try {
      const { collectionName } = req.params;
      const data = await addDocument(collectionName, req.body);
      res.json(data);
    } catch (err: any) {
      console.error(`Generic API POST Collection ${req.params.collectionName} error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/db/:collectionName/:docId', async (req, res) => {
    try {
      const { collectionName, docId } = req.params;
      const data = await setDocument(collectionName, docId, req.body);
      res.json(data);
    } catch (err: any) {
      console.error(`Generic API PUT Doc ${req.params.collectionName}/${req.params.docId} error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/db/:collectionName/:docId', async (req, res) => {
    try {
      const { collectionName, docId } = req.params;
      const success = await deleteDocument(collectionName, docId);
      res.json({ success });
    } catch (err: any) {
      console.error(`Generic API DELETE Doc ${req.params.collectionName}/${req.params.docId} error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // Auth: Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { role, username, password, wing, flatNo } = req.body;
      const result = await verifyCredentials(role, { username, password, wing, flatNo });
      if (result.success) {
        return res.json(result);
      }
      return res.status(401).json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get directory of all owners (with vehicle/members details)
  app.get('/api/owners', async (req, res) => {
    try {
      const owners = await getAllOwners();
      res.json(owners);
    } catch (error: any) {
      console.error('Get owners error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Update flat owner details (members, vehicles, secondary contact, etc.)
  app.put('/api/owners/:wing/:flatNo', async (req, res) => {
    try {
      const { wing, flatNo } = req.params;
      const flatNum = parseInt(flatNo, 10);
      const result = await updateOwnerDetails(wing, flatNum, req.body);
      if (result.success) {
        return res.json(result);
      }
      return res.status(400).json(result);
    } catch (error: any) {
      console.error('Update owner error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Update password of a specific flat owner (Admin action)
  app.post('/api/admin/change-password', async (req, res) => {
    try {
      const { wing, flatNo, newPassword } = req.body;
      if (!wing || !flatNo || !newPassword) {
        return res.status(400).json({ success: false, message: 'Missing parameters.' });
      }
      const flatNum = parseInt(flatNo, 10);
      await adminChangePassword(wing, flatNum, newPassword);
      res.json({ success: true, message: `Password for Flat ${wing}-${flatNo} updated successfully.` });
    } catch (error: any) {
      console.error('Admin change password error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Reset entire DB to initial state (Admin action)
  app.post('/api/admin/reset-db', async (req, res) => {
    try {
      await resetDatabaseToDefault();
      res.json({ success: true, message: 'Database reset to initial Excel data in Firestore.' });
    } catch (error: any) {
      console.error('Admin DB reset error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Create a visitor request (called by security)
  app.post('/api/visitors', async (req, res) => {
    try {
      const { fullName, mobileNumber, email, wing, flatNo, reason, guestType, photoUrl, flatOwnerName } = req.body;

      if (!fullName || !mobileNumber || !wing || !flatNo || !reason || !guestType) {
        return res.status(400).json({ success: false, message: 'Required fields are missing.' });
      }

      const visitor = await registerVisitor(req.body);
      res.status(201).json(visitor);
    } catch (error: any) {
      console.error('Create visitor error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Fetch visitor history or active requests
  app.get('/api/visitors', async (req, res) => {
    try {
      const { wing, flatNo, limit } = req.query;
      const visitors = await getVisitorsList({
        wing: wing as string,
        flatNo: flatNo ? parseInt(flatNo as string, 10) : undefined,
        limitNo: limit ? parseInt(limit as string, 10) : undefined
      });
      res.json(visitors);
    } catch (error: any) {
      console.error('Get visitors error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Poll for pending visitor requests for a specific flat
  app.get('/api/visitors/poll/:wing/:flatNo', async (req, res) => {
    try {
      const { wing, flatNo } = req.params;
      const flatNum = parseInt(flatNo, 10);
      const pending = await pollPendingVisitorAlerts(wing, flatNum);
      res.json(pending);
    } catch (error: any) {
      console.error('Poll visitor error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Respond to a visitor request (approved / rejected)
  app.post('/api/visitors/:id/respond', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'approved' | 'rejected'

      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ success: false, message: 'Invalid response status.' });
      }

      const result = await respondToVisitorRequest(id, status);
      if (result.success) {
        return res.json(result);
      }
      return res.status(404).json({ success: false, message: 'Visitor request not found.' });
    } catch (error: any) {
      console.error('Respond visitor error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get status of a single visitor (called by security guard to check on pending)
  app.get('/api/visitors/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const list = await getVisitorsList();
      const visitor = list.find((v) => v.id === id);

      if (!visitor) {
        return res.status(404).json({ success: false, status: 'unknown', message: 'Visitor not found' });
      }

      res.json({
        id: visitor.id,
        status: visitor.status,
        fullName: visitor.fullName,
        respondedTime: visitor.respondedTime
      });
    } catch (error: any) {
      console.error('Get visitor status error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Delete a visitor request (called by security or owners)
  app.delete('/api/visitors/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteVisitorRequest(id);
      res.json({ success: true, message: 'Visitor request deleted successfully.' });
    } catch (error: any) {
      console.error('Delete visitor error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
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
