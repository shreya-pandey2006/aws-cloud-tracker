const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const alertRoutes = require('./routes/alertRoutes');
const MemberMovementSimulator = require('./simulator');
const setupSocketIO = require('./sockets');

const fs = require('fs');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static assets and mobile web client
app.use(express.static(path.join(__dirname, '..', 'public')));

// Path to compiled React Admin Dashboard
const adminDistPath = path.join(__dirname, '..', '..', 'admin-dashboard', 'dist');
if (fs.existsSync(adminDistPath)) {
  app.use(express.static(adminDistPath));
}

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

app.set('io', io);

// Setup Fleet Movement Simulator
const simulator = new MemberMovementSimulator(io);

// Setup WebSockets
setupSocketIO(io, simulator);

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.get('/api/geofences', (req, res) => res.json({ geofences: [] }));
app.use('/api/alerts', alertRoutes);

// Mobile Web Member App route
app.get('/member', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'member.html'));
});

// Simulator toggle endpoint
app.post('/api/simulator/toggle', (req, res) => {
  const isRunning = simulator.toggle();
  io.emit('simulator:status', { isRunning });
  return res.json({ isRunning, message: isRunning ? 'Simulator started' : 'Simulator stopped' });
});

app.get('/api/simulator/status', (req, res) => {
  return res.json({ isRunning: simulator.isRunning });
});

// Health & System Telemetry
app.get('/api/system/status', (req, res) => {
  const clubCount = db.prepare('SELECT COUNT(*) as count FROM clubs').get().count;
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
  const activeCount = db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'active' AND is_sharing_location = 1").get().count;
  const alertsCount = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE resolved = 0').get().count;

  return res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    metrics: {
      clubs: clubCount,
      totalMembers: memberCount,
      activeSharingMembers: activeCount,
      unresolvedAlerts: alertsCount,
      simulatorActive: simulator.isRunning
    }
  });
});

// Serve Admin Dashboard index.html or welcome JSON
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/member') {
    return next();
  }
  if (fs.existsSync(adminDistPath)) {
    return res.sendFile(path.join(adminDistPath, 'index.html'));
  }
  res.json({
    name: 'AWS Cloud Clubs of Ajay Kumar Garg Engineering College — Live Location Tracker API',
    institution: 'Ajay Kumar Garg Engineering College (AKGEC)',
    version: '1.0.0',
    documentation: '/api/system/status',
    mobileMemberWebClient: '/member'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🧭 AWS Cloud Clubs - AKGEC Tracking Server is LIVE!`);
  console.log(`🏛️ Ajay Kumar Garg Engineering College Campus Dispatch`);
  console.log(`🌐 Server Port: http://localhost:${PORT}`);
  console.log(`📱 Member Web View: http://localhost:${PORT}/member`);
  console.log(`📡 Socket.io: ws://localhost:${PORT}`);
  console.log(`🔑 Admin Account: admin@akgec.awscloudclubs.com / admin123`);
  console.log(`📋 Club Passcode: AKGEC2026 (Members register via Mobile App)`);
  console.log(`=======================================================`);
});
