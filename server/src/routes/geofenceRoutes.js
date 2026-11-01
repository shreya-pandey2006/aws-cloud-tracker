const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();

// List geofences for club
router.get('/', (req, res) => {
  const clubId = req.query.clubId || 'club_akgec_aws_01';
  const geofences = db.prepare('SELECT * FROM geofences WHERE club_id = ? ORDER BY created_at DESC').all(clubId);
  return res.json({ geofences });
});

// Create new geofence
router.post('/', requireAdmin, (req, res) => {
  const { name, latitude, longitude, radiusMeters } = req.body;
  if (!name || latitude === undefined || longitude === undefined || !radiusMeters) {
    return res.status(400).json({ error: 'Name, latitude, longitude and radiusMeters are required' });
  }

  const id = 'geo_' + Date.now().toString(36);
  const clubId = req.admin.clubId;

  db.prepare(`
    INSERT INTO geofences (id, club_id, name, latitude, longitude, radius_meters)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, clubId, name, latitude, longitude, radiusMeters);

  const created = db.prepare('SELECT * FROM geofences WHERE id = ?').get(id);
  return res.status(201).json({ geofence: created });
});

// Delete geofence
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM geofences WHERE id = ? AND club_id = ?').run(id, req.admin.clubId);
  return res.json({ success: true, message: 'Geofence deleted' });
});

module.exports = router;

