const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();

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
  if (!memberId) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  const member = db.prepare('SELECT club_id, name, phone, emergency_contact FROM members WHERE id = ?').get(memberId);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const alertId = 'sos_' + Date.now().toString(36);
  const alertMsg = message || `EMERGENCY SOS: Member ${member.name} triggered a distress alert!`;

  db.prepare(`
    INSERT INTO alerts (id, club_id, member_id, type, severity, message, latitude, longitude, resolved)
    VALUES (?, ?, ?, 'sos', 'critical', ?, ?, ?, 0)
  `).run(alertId, member.club_id, memberId, alertMsg, latitude || 0, longitude || 0);

  const created = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
  return res.status(201).json({ alert: created, member });
});

// Resolve alert
router.put('/:id/resolve', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ? AND club_id = ?').run(id, req.admin.clubId);
  return res.json({ success: true, message: 'Alert resolved' });
});

module.exports = router;

