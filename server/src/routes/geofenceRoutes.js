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

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Geofence zone name must be between 2 and 100 characters' });
  }

  const lat = Number(latitude);
  const lon = Number(longitude);
  const rad = Number(radiusMeters);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Latitude must be a valid number between -90 and 90 degrees' });
  }
  if (isNaN(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Longitude must be a valid number between -180 and 180 degrees' });
  }
  if (isNaN(rad) || rad < 10 || rad > 50000) {
    return res.status(400).json({ error: 'Radius must be a number between 10 and 50,000 meters' });
  }

  const id = 'geo_' + Date.now().toString(36);
  const clubId = req.admin.clubId;

  db.prepare(`
    INSERT INTO geofences (id, club_id, name, latitude, longitude, radius_meters)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, clubId, name.trim(), lat, lon, rad);

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

