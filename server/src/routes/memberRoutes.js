const express = require('express');
const db = require('../db');
const { requireAdmin, requireMember } = require('../auth');

const router = express.Router();

const PHONE_REGEX = /^\+?[0-9\s-]{10,15}$/;

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

  const sanitizedLimit = Math.min(Math.max(parseInt(limit, 10) || 150, 1), 1000);
  const sanitizedHours = Math.min(Math.max(parseFloat(hours) || 24, 0.1), 720);

  const history = db.prepare(`
    SELECT
      id, member_id, latitude, longitude, accuracy, speed, heading, altitude, battery, timestamp
    FROM location_history
    WHERE member_id = ? AND timestamp >= datetime('now', '-' || ? || ' hours')
    ORDER BY timestamp ASC
    LIMIT ?
  `).all(id, sanitizedHours, sanitizedLimit);

  return res.json({
    memberId: id,
    pointsCount: history.length,
    trail: history
  });
});

// Update member profile
router.put('/:id/profile', (req, res) => {
  const { id } = req.params;
  const { name, phone, emergencyContact, role } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
      return res.status(400).json({ error: 'Name must be between 2 and 60 characters' });
    }
  }

  if (role !== undefined) {
    if (typeof role !== 'string' || role.trim().length === 0 || role.trim().length > 50) {
      return res.status(400).json({ error: 'Role must be between 1 and 50 characters' });
    }
  }

  if (phone !== undefined && phone !== '') {
    if (typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
      return res.status(400).json({ error: 'Invalid phone number format (must be 10-15 digits)' });
    }
  }

  if (emergencyContact !== undefined && emergencyContact !== '') {
    if (typeof emergencyContact !== 'string' || !PHONE_REGEX.test(emergencyContact.trim())) {
      return res.status(400).json({ error: 'Invalid emergency contact number format (must be 10-15 digits)' });
    }
  }

  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(id);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  db.prepare(`
    UPDATE members
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        emergency_contact = COALESCE(?, emergency_contact),
        role = COALESCE(?, role)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    phone ? phone.trim() : null,
    emergencyContact ? emergencyContact.trim() : null,
    role ? role.trim() : null,
    id
  );

  const updated = db.prepare(`
    SELECT id, club_id, name, email, phone, emergency_contact, role, status, is_sharing_location
    FROM members WHERE id = ?
  `).get(id);

  const io = req.app.get('io');
  if (io && updated) {
    const clubRoom = updated.club_id.startsWith('club_') ? updated.club_id : `club_${updated.club_id}`;
    io.to(clubRoom).emit('member:updated', updated);
  }

  return res.json({ member: updated, message: 'Profile updated successfully' });
});

// Fallback REST endpoint for posting location update
router.post('/:id/location', (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, accuracy, speed, heading, altitude, battery } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const lat = Number(latitude);
  const lon = Number(longitude);
  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Latitude must be between -90 and 90 degrees' });
  }
  if (isNaN(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Longitude must be between -180 and 180 degrees' });
  }

  const acc = Math.max(0, Number(accuracy) || 5.0);
  const spd = Math.max(0, Number(speed) || 0.0);
  const hdg = Math.min(360, Math.max(0, Number(heading) || 0.0));
  const alt = Number(altitude) || 0.0;
  const bat = Math.min(100, Math.max(0, Math.round(Number(battery) || 100)));

  const member = db.prepare('SELECT id, name, club_id, is_sharing_location FROM members WHERE id = ?').get(id);
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
    `).run(lat, lon, acc, spd, hdg, alt, bat, id);

    db.prepare(`
      INSERT INTO location_history (member_id, latitude, longitude, accuracy, speed, heading, altitude, battery)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, lat, lon, acc, spd, hdg, alt, bat);

    const io = req.app.get('io');
    if (io) {
      const clubId = member.club_id || 'club_akgec_aws_01';
      const clubRoom = clubId.startsWith('club_') ? clubId : `club_${clubId}`;
      io.to(clubRoom).emit('member:location_changed', {
        memberId: id,
        name: member.name,
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        speed: spd,
        heading: hdg,
        altitude: alt,
        battery: bat,
        status: 'active',
        isSharing: true,
        lastSeenAt: new Date().toISOString()
      });
    }
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

// Delete a member (Admin action)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const clubId = req.query.clubId || req.admin?.clubId || 'club_akgec_aws_01';

  // Delete referencing records first
  db.prepare('DELETE FROM location_history WHERE member_id = ?').run(id);
  db.prepare('DELETE FROM alerts WHERE member_id = ?').run(id);
  db.prepare('DELETE FROM members WHERE id = ?').run(id);

  const io = req.app.get('io');
  if (io) {
    const clubRoom = clubId.startsWith('club_') ? clubId : `club_${clubId}`;
    io.to(clubRoom).emit('member:removed', { memberId: id });
    io.to(`member_${id}`).emit('auth:revoked', {
      memberId: id,
      error: 'Your account was removed by the administrator.'
    });
  }

  return res.json({ success: true, message: `Member removed successfully` });
});

module.exports = router;

