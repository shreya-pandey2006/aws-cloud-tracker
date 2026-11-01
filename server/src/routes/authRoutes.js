const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, verifyToken } = require('../auth');

const router = express.Router();

// Admin Login
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
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
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let memberQuery = 'SELECT m.*, c.name as club_name, c.code as club_code FROM members m JOIN clubs c ON m.club_id = c.id WHERE LOWER(m.email) = ?';
  const queryParams = [email.toLowerCase().trim()];

  if (clubCode) {
    memberQuery += ' AND UPPER(c.code) = ?';
    queryParams.push(clubCode.toUpperCase().trim());
  }

  const member = db.prepare(memberQuery).get(...queryParams);
  if (!member) {
    return res.status(401).json({ error: 'Invalid member credentials or club code' });
  }

  const isMatch = bcrypt.compareSync(password, member.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid member credentials' });
  }

  const token = signToken({
    id: member.id,
    clubId: member.club_id,
    role: 'member',
    name: member.name,
    email: member.email
  });

  // Strip password hash
  const { password_hash, ...safeMember } = member;

  return res.json({
    token,
    user: {
      ...safeMember,
      role: 'member'
    }
  });
});

// Member Registration
router.post('/member/register', (req, res) => {
  const { clubCode, name, email, phone, emergencyContact, password } = req.body;
  if (!clubCode || !name || !email || !password) {
    return res.status(400).json({ error: 'Club code, name, email and password are required' });
  }

  const club = db.prepare('SELECT * FROM clubs WHERE UPPER(code) = ?').get(clubCode.toUpperCase().trim());
  if (!club) {
    return res.status(404).json({ error: 'Club with this code does not exist' });
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
    VALUES (?, ?, ?, ?, ?, ?, ?, 'member', 'offline', 0)
  `).run(
    memberId,
    club.id,
    name.trim(),
    email.toLowerCase().trim(),
    phone || '',
    emergencyContact || '',
    passwordHash
  );

  const token = signToken({
    id: memberId,
    clubId: club.id,
    role: 'member',
    name: name.trim(),
    email: email.toLowerCase().trim()
  });

  return res.status(201).json({
    token,
    user: {
      id: memberId,
      clubId: club.id,
      clubName: club.name,
      clubCode: club.code,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      emergency_contact: emergencyContact || '',
      role: 'member',
      status: 'offline',
      is_sharing_location: 0
    }
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

