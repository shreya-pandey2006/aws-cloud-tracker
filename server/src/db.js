const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'tracker.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      admin_name TEXT NOT NULL,
      admin_email TEXT UNIQUE NOT NULL,
      admin_password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      emergency_contact TEXT,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'offline',
      is_sharing_location INTEGER DEFAULT 0,
      last_latitude REAL,
      last_longitude REAL,
      last_accuracy REAL,
      last_speed REAL,
      last_heading REAL,
      last_altitude REAL,
      last_battery INTEGER,
      last_seen_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs(id)
    );

    CREATE TABLE IF NOT EXISTS location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      speed REAL,
      heading REAL,
      altitude REAL,
      battery INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS geofences (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL,
      member_id TEXT,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE INDEX IF NOT EXISTS idx_history_member_time ON location_history(member_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_members_club ON members(club_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_club ON alerts(club_id);
  `);

  seedInitialData();
}

function seedInitialData() {
  const clubCount = db.prepare('SELECT COUNT(*) as count FROM clubs').get().count;
  if (clubCount > 0) return;

  console.log('🌱 Seeding initial AWS Cloud Clubs of Ajay Kumar Garg Engineering College data...');
  const salt = bcrypt.genSaltSync(10);
  const adminPassHash = bcrypt.hashSync('admin123', salt);
  const memberPassHash = bcrypt.hashSync('member123', salt);

  const clubId = 'club_akgec_aws_01';
  db.prepare(`
    INSERT INTO clubs (id, name, code, admin_name, admin_email, admin_password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    clubId,
    'AWS Cloud Clubs of Ajay Kumar Garg Engineering College',
    'AKGEC2026',
    'AKGEC Cloud Lead Director',
    'admin@akgec.awscloudclubs.com',
    adminPassHash
  );

  // Real AKGEC Campus Coordinates (Ghaziabad, UP, India): 28.6757, 77.5020
  const initialMembers = [
    {
      id: 'mem_alex',
      name: 'Alex Rivera',
      email: 'alex@akgec.awscloudclubs.com',
      phone: '+91 98765 43210',
      emergency_contact: 'Prof. Sharma (Faculty Advisor): +91 98111 22233',
      role: 'Club Captain & Cloud Lead',
      lat: 28.6762,
      lng: 77.5025,
      speed: 4.8,
      heading: 45,
      battery: 92,
      isSharing: 1,
      status: 'active'
    },
    {
      id: 'mem_jordan',
      name: 'Jordan Lee',
      email: 'jordan@akgec.awscloudclubs.com',
      phone: '+91 98765 43211',
      emergency_contact: 'Dr. Verma (HOD CS): +91 98222 33344',
      role: 'Technical Secretary (CS Dept)',
      lat: 28.6750,
      lng: 77.5015,
      speed: 12.5,
      heading: 120,
      battery: 78,
      isSharing: 1,
      status: 'active'
    },
    {
      id: 'mem_sam',
      name: 'Sam Patel',
      email: 'sam@akgec.awscloudclubs.com',
      phone: '+91 98765 43212',
      emergency_contact: 'AKGEC Security Desk: +91 120 2762841',
      role: 'Cloud Architect Lead (IT Dept)',
      lat: 28.6770,
      lng: 77.5035,
      speed: 0.0,
      heading: 0,
      battery: 64,
      isSharing: 0,
      status: 'paused'
    },
    {
      id: 'mem_taylor',
      name: 'Taylor Smith',
      email: 'taylor@akgec.awscloudclubs.com',
      phone: '+91 98765 43213',
      emergency_contact: 'Hostel Warden: +91 98333 44455',
      role: 'Hackathon Head (ECE Dept)',
      lat: 28.6745,
      lng: 77.5005,
      speed: 18.2,
      heading: 270,
      battery: 45,
      isSharing: 1,
      status: 'active'
    }
  ];

  const insertMember = db.prepare(`
    INSERT INTO members (
      id, club_id, name, email, phone, emergency_contact, password_hash,
      role, status, is_sharing_location, last_latitude, last_longitude,
      last_accuracy, last_speed, last_heading, last_altitude, last_battery, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertHistory = db.prepare(`
    INSERT INTO location_history (
      member_id, latitude, longitude, accuracy, speed, heading, altitude, battery, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  for (const m of initialMembers) {
    insertMember.run(
      m.id,
      clubId,
      m.name,
      m.email,
      m.phone,
      m.emergency_contact,
      memberPassHash,
      m.role,
      m.status,
      m.isSharing,
      m.lat,
      m.lng,
      4.5,
      m.speed,
      m.heading,
      210.0, // AKGEC campus altitude (~210m above sea level)
      m.battery
    );

    // Seed initial campus breadcrumbs
    for (let i = 6; i >= 0; i--) {
      const timeOffset = `-${i * 5} minutes`;
      const latOffset = (6 - i) * 0.0003;
      const lngOffset = (6 - i) * 0.0004;
      insertHistory.run(
        m.id,
        m.lat - latOffset,
        m.lng - lngOffset,
        4.0,
        m.speed,
        m.heading,
        210 + i,
        m.battery + i,
        timeOffset
      );
    }
  }

  // Insert AKGEC Campus Geofences
  const insertGeofence = db.prepare(`
    INSERT INTO geofences (id, club_id, name, latitude, longitude, radius_meters)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertGeofence.run('geo_akgec_hub', clubId, 'AKGEC Innovation Hub & Central Audi', 28.6757, 77.5020, 350);
  insertGeofence.run('geo_akgec_sports', clubId, 'AKGEC Sports Complex & Rally Ground', 28.6778, 77.5042, 250);
  insertGeofence.run('geo_akgec_gate', clubId, 'AKGEC Main Gate Checkpoint', 28.6738, 77.5010, 180);

  // Insert sample alert
  db.prepare(`
    INSERT INTO alerts (id, club_id, member_id, type, severity, message, latitude, longitude, resolved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    'alert_init_01',
    clubId,
    'mem_jordan',
    'geofence_enter',
    'info',
    'Jordan Lee entered AKGEC Innovation Hub & Central Audi perimeter',
    28.6750,
    77.5015
  );

  console.log('✅ AWS Cloud Clubs of Ajay Kumar Garg Engineering College data seeded successfully!');
}

initDatabase();

module.exports = db;
