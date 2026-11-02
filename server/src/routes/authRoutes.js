const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, verifyToken } = require('../auth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{10,15}$/;

// Admin Login
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'A valid admin email address is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const club = db.prepare('SELECT * FROM clubs WHERE admin_email = ?').get(email.toLowerCase().trim());
  if (!club) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const isMatch = bcrypt.compareSync(password, club.admin_password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = signToken({
    id: club.id,
    clubId: club.id,
    role: 'admin',
    name: club.admin_name,
    email: club.admin_email
  });

  return res.json({
    token,
    user: {
      id: club.id,
      name: club.admin_name,
      email: club.admin_email,
      role: 'admin',
      clubId: club.id,
      clubName: club.name,
      clubCode: club.code
    }
  });
});

// Member Login
router.post('/member/login', (req, res) => {
  const { email, password, clubCode } = req.body;
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  let memberQuery = 'SELECT m.*, c.name as club_name, c.code as club_code FROM members m JOIN clubs c ON m.club_id = c.id WHERE LOWER(m.email) = ?';
  const queryParams = [email.toLowerCase().trim()];

  if (clubCode) {
    memberQuery += ' AND UPPER(c.code) = ?';
    queryParams.push(clubCode.toUpperCase().trim());
  }

  const member = db.prepare(memberQuery).get(...queryParams);
  if (!member) {
    return res.status(401).json({ error: 'Invalid member credentials or club passcode' });
  }

  const isMatch = bcrypt.compareSync(password, member.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid member credentials' });
  }

  const token = signToken({
    id: member.id,
    clubId: member.club_id,
    role: member.role || 'Member',
    name: member.name,
    email: member.email
  });

  // Strip password hash
  const { password_hash, ...safeMember } = member;

  return res.json({
    token,
    user: {
      ...safeMember,
      role: member.role || 'Member'
    }
  });
});

// Member Forgot / Reset Password
router.post('/member/reset-password', (req, res) => {
  const { clubCode, email, newPassword } = req.body;

  if (!clubCode || typeof clubCode !== 'string' || clubCode.trim().length < 3) {
    return res.status(400).json({ error: 'A valid club passcode is required' });
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'A valid registered email address is required' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 100) {
    return res.status(400).json({ error: 'New password must be between 6 and 100 characters long' });
  }

  const club = db.prepare('SELECT * FROM clubs WHERE UPPER(code) = ?').get(clubCode.toUpperCase().trim());
  if (!club) {
    return res.status(404).json({ error: 'Invalid club passcode. No club found with this code.' });
  }

  const member = db.prepare(`
    SELECT m.*, c.name as club_name, c.code as club_code
    FROM members m
    JOIN clubs c ON m.club_id = c.id
    WHERE LOWER(m.email) = ? AND m.club_id = ?
  `).get(email.toLowerCase().trim(), club.id);

  if (!member) {
    return res.status(404).json({ error: 'No registered member found with this email in this club' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);

  db.prepare(`UPDATE members SET password_hash = ? WHERE id = ?`).run(passwordHash, member.id);

  const token = signToken({
    id: member.id,
    clubId: member.club_id,
    role: member.role || 'Member',
    name: member.name,
    email: member.email
  });

  const { password_hash, ...safeMember } = member;

  return res.json({
    success: true,
    message: 'Password reset successfully',
    token,
    user: {
      ...safeMember,
      role: member.role || 'Member'
    }
  });
});

// Member Registration
router.post('/member/register', (req, res) => {
  const { clubCode, name, email, phone, emergencyContact, password, role } = req.body;

  // Validate required fields
  if (!clubCode || typeof clubCode !== 'string' || clubCode.trim().length < 3) {
    return res.status(400).json({ error: 'A valid club passcode (at least 3 characters) is required' });
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
    return res.status(400).json({ error: 'Full name must be between 2 and 60 characters' });
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 100) {
    return res.status(400).json({ error: 'A valid email address (up to 100 characters) is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 100) {
    return res.status(400).json({ error: 'Password must be between 6 and 100 characters' });
  }

  // Validate optional phone numbers if supplied
  if (phone && (typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim()))) {
    return res.status(400).json({ error: 'Phone number format is invalid (must be 10-15 digits)' });
  }
  if (emergencyContact && (typeof emergencyContact !== 'string' || !PHONE_REGEX.test(emergencyContact.trim()))) {
    return res.status(400).json({ error: 'Emergency contact format is invalid (must be 10-15 digits)' });
  }

  const memberRole = (typeof role === 'string' && role.trim().length > 0)
    ? role.trim().substring(0, 50)
    : 'Member';

  const club = db.prepare('SELECT * FROM clubs WHERE UPPER(code) = ?').get(clubCode.toUpperCase().trim());
  if (!club) {
    return res.status(404).json({ error: 'Invalid club passcode. No club found with this code.' });
  }

  const existingMember = db.prepare('SELECT id FROM members WHERE LOWER(email) = ?').get(email.toLowerCase().trim());
  if (existingMember) {
    return res.status(409).json({ error: 'A member with this email already exists' });
  }

  const memberId = 'mem_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  db.prepare(`
    INSERT INTO members (id, club_id, name, email, phone, emergency_contact, password_hash, role, status, is_sharing_location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'offline', 0)
  `).run(
    memberId,
    club.id,
    name.trim(),
    email.toLowerCase().trim(),
    phone ? phone.trim() : '',
    emergencyContact ? emergencyContact.trim() : '',
    passwordHash,
    memberRole
  );

  const token = signToken({
    id: memberId,
    clubId: club.id,
    role: memberRole,
    name: name.trim(),
    email: email.toLowerCase().trim()
  });

  const newMemberUser = {
    id: memberId,
    club_id: club.id,
    clubId: club.id,
    clubName: club.name,
    clubCode: club.code,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone || '',
    emergency_contact: emergencyContact || '',
    role: memberRole,
    status: 'offline',
    is_sharing_location: 0,
    created_at: new Date().toISOString()
  };

  const io = req.app.get('io');
  if (io) {
    const clubRoom = club.id.startsWith('club_') ? club.id : `club_${club.id}`;
    io.to(clubRoom).emit('member:joined', newMemberUser);
  }

  return res.status(201).json({
    token,
    user: newMemberUser
  });
});

// Current user profile verification
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (decoded.role === 'admin') {
    const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(decoded.clubId);
    if (!club) return res.status(404).json({ error: 'Club not found' });
    return res.json({
      user: {
        id: club.id,
        name: club.admin_name,
        email: club.admin_email,
        role: 'admin',
        clubId: club.id,
        clubName: club.name,
        clubCode: club.code
      }
    });
  } else {
    const member = db.prepare(`
      SELECT m.*, c.name as club_name, c.code as club_code
      FROM members m JOIN clubs c ON m.club_id = c.id
      WHERE m.id = ?
    `).get(decoded.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const { password_hash, ...safeMember } = member;
    return res.json({ user: safeMember });
  }
});

module.exports = router;

