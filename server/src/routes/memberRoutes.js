const express = require('express');
const db = require('../db');
const { requireAdmin, requireMember } = require('../auth');

const router = express.Router();

// Get all members for the club (Admin view)
router.get('/', requireAdmin, (req, res) => {
  const clubId = req.admin.clubId;
  const members = db.prepare(`
    SELECT
      id, club_id, name, email, phone, emergency_contact, role,
      status, is_sharing_location, last_latitude, last_longitude,
      last_accuracy, last_speed, last_heading, last_altitude,
      last_battery, last_seen_at, created_at
    FROM members
    WHERE club_id = ?
    ORDER BY status ASC, name ASC
  `).all(clubId);

  return res.json({ members });
});

// Get single member profile
router.get('/:id', (req, res) => {
  const member = db.prepare(`
    SELECT
      id, club_id, name, email, phone, emergency_contact, role,
      status, is_sharing_location, last_latitude, last_longitude,
      last_accuracy, last_speed, last_heading, last_altitude,
      last_battery, last_seen_at, created_at
    FROM members
    WHERE id = ?
  `).get(req.params.id);

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  return res.json({ member });
});

// Get member location history trail (breadcrumbs for replay)
router.get('/:id/history', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { limit = 150, hours = 24 } = req.query;

  const history = db.prepare(`
    SELECT
      id, member_id, latitude, longitude, accuracy, speed, heading, altitude, battery, timestamp
    FROM location_history
    WHERE member_id = ? AND timestamp >= datetime('now', '-' || ? || ' hours')
    ORDER BY timestamp ASC
    LIMIT ?
  `).all(id, Number(hours) || 24, Number(limit) || 150);

  return res.json({
    memberId: id,
    pointsCount: history.length,
    trail: history
  });
});

// Update member profile
router.put('/:id/profile', (req, res) => {
  const { id } = req.params;
  const { name, phone, emergencyContact } = req.body;

  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(id);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  db.prepare(`
    UPDATE members
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        emergency_contact = COALESCE(?, emergency_contact)
    WHERE id = ?
  `).run(name, phone, emergencyContact, id);

  const updated = db.prepare(`
    SELECT id, club_id, name, email, phone, emergency_contact, role, status, is_sharing_location
    FROM members WHERE id = ?
  `).get(id);

  return res.json({ member: updated, message: 'Profile updated successfully' });
});

// Fallback REST endpoint for posting location update
router.post('/:id/location', (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, accuracy, speed, heading, altitude, battery } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const member = db.prepare('SELECT is_sharing_location FROM members WHERE id = ?').get(id);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Only record if sharing is enabled
  if (member.is_sharing_location) {
    db.prepare(`
      UPDATE members
      SET last_latitude = ?,
          last_longitude = ?,
          last_accuracy = ?,
          last_speed = ?,
          last_heading = ?,
          last_altitude = ?,
          last_battery = ?,
          last_seen_at = datetime('now'),
          status = 'active'
      WHERE id = ?
    `).run(latitude, longitude, accuracy || 5.0, speed || 0.0, heading || 0.0, altitude || 0.0, battery || 100, id);

    db.prepare(`
      INSERT INTO location_history (member_id, latitude, longitude, accuracy, speed, heading, altitude, battery)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, latitude, longitude, accuracy || 5.0, speed || 0.0, heading || 0.0, altitude || 0.0, battery || 100);
  }

  return res.json({ success: true, isSharing: !!member.is_sharing_location });
});

// Toggle location sharing status
router.post('/:id/sharing', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const isSharing = enabled ? 1 : 0;
  const status = isSharing ? 'active' : 'paused';

  db.prepare(`
    UPDATE members
    SET is_sharing_location = ?,
        status = ?,
        last_seen_at = datetime('now')
    WHERE id = ?
  `).run(isSharing, status, id);

  return res.json({
    success: true,
    memberId: id,
    isSharing: !!isSharing,
    status
  });
});

module.exports = router;

