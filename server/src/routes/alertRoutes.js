const express = require('express');
const db = require('../db');
const { requireAdmin, verifyToken } = require('../auth');

const router = express.Router();

function optionalAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) req.admin = decoded;
  }
  next();
}

// List alerts
router.get('/', (req, res) => {
  const clubId = req.query.clubId || 'club_akgec_aws_01';
  const alerts = db.prepare(`
    SELECT
      a.*,
      m.name as member_name,
      m.phone as member_phone,
      m.emergency_contact
    FROM alerts a
    LEFT JOIN members m ON a.member_id = m.id
    WHERE a.club_id = ?
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all(clubId);

  return res.json({ alerts });
});

// Create SOS alert
router.post('/sos', (req, res) => {
  const { memberId, latitude, longitude, message } = req.body;
  if (!memberId || typeof memberId !== 'string') {
    return res.status(400).json({ error: 'Valid memberId is required' });
  }

  const cleanMemberId = memberId.trim();
  const member = db.prepare('SELECT club_id, name, phone, emergency_contact FROM members WHERE id = ?').get(cleanMemberId);
  if (!member) {
    return res.status(404).json({ error: 'You cannot send the SOS as you are no longer a member of this club.' });
  }

  // Deduplication: prevent duplicate SOS within 8 seconds from same member
  const recentAlert = db.prepare(`
    SELECT * FROM alerts
    WHERE member_id = ? AND type = 'sos' AND resolved = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(cleanMemberId);

  if (recentAlert) {
    const rawTs = recentAlert.created_at ? recentAlert.created_at.replace(' ', 'T') : '';
    const ageMs = Date.now() - new Date(rawTs).getTime();
    if (!isNaN(ageMs) && ageMs < 8000) {
      console.log(`[REST Deduplicate] Reusing existing SOS ${recentAlert.id} for member ${cleanMemberId} (${ageMs}ms ago)`);
      return res.status(200).json({ alert: recentAlert, member, deduplicated: true });
    }
  }

  const lat = latitude !== undefined ? Number(latitude) : 0;
  const lon = longitude !== undefined ? Number(longitude) : 0;
  const safeLat = (!isNaN(lat) && lat >= -90 && lat <= 90) ? lat : 0;
  const safeLon = (!isNaN(lon) && lon >= -180 && lon <= 180) ? lon : 0;

  const rawMsg = typeof message === 'string' ? message.trim().substring(0, 300) : '';
  const alertMsg = rawMsg || `EMERGENCY SOS: Member ${member.name} triggered a distress alert!`;
  const alertId = 'sos_' + Date.now().toString(36);

  db.prepare(`
    INSERT INTO alerts (id, club_id, member_id, type, severity, message, latitude, longitude, resolved)
    VALUES (?, ?, ?, 'sos', 'critical', ?, ?, ?, 0)
  `).run(alertId, member.club_id, member.id, alertMsg, safeLat, safeLon);

  const created = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);

  // Broadcast to club dispatch room
  const io = req.app.get('io');
  if (io) {
    const clubRoom = member.club_id.startsWith('club_') ? member.club_id : `club_${member.club_id}`;
    io.to(clubRoom).emit('alert:sos', {
      id: alertId,
      clubId: member.club_id,
      memberId: member.id,
      memberName: member.name,
      memberPhone: member.phone || '',
      emergencyContact: member.emergency_contact || '',
      type: 'sos',
      severity: 'critical',
      message: alertMsg,
      latitude: safeLat,
      longitude: safeLon,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  }

  return res.status(201).json({ alert: created, member });
});

// Resolve alert
router.put('/:id/resolve', requireAdmin, (req, res) => {
  const { id } = req.params;
  const clubId = req.admin?.clubId || 'club_akgec_aws_01';
  db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(id);

  const io = req.app.get('io');
  if (io) {
    const clubRoom = clubId.startsWith('club_') ? clubId : `club_${clubId}`;
    io.to(clubRoom).emit('alert:resolved', { alertId: id });
  }

  return res.json({ success: true, message: 'Alert resolved' });
});

// Bulk clear resolved alerts (Admin action) - MUST BE DEFINED BEFORE /:id
router.delete('/bulk/resolved', optionalAdmin, (req, res) => {
  const clubId = req.admin?.clubId || req.query.clubId || 'club_akgec_aws_01';

  const result = db.prepare('DELETE FROM alerts WHERE resolved = 1').run();

  const io = req.app.get('io');
  if (io) {
    const clubRoom = clubId.startsWith('club_') ? clubId : `club_${clubId}`;
    io.to(clubRoom).emit('alert:bulk_deleted', { count: result.changes });
  }

  return res.json({ success: true, count: result.changes, message: `Cleared ${result.changes} resolved alerts` });
});

// Delete single alert (Admin action)
router.delete('/:id', optionalAdmin, (req, res) => {
  const { id } = req.params;
  const clubId = req.admin?.clubId || req.query.clubId || 'club_akgec_aws_01';

  db.prepare('DELETE FROM alerts WHERE id = ?').run(id);

  const io = req.app.get('io');
  if (io) {
    const clubRoom = clubId.startsWith('club_') ? clubId : `club_${clubId}`;
    io.to(clubRoom).emit('alert:deleted', { alertId: id });
  }

  return res.json({ success: true, message: 'Alert deleted successfully' });
});

module.exports = router;

