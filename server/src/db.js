const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'tracker.db');
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

    DELETE FROM geofences;
    DELETE FROM alerts WHERE type = 'geofence_enter';
  `);

  seedInitialData();
}

function seedInitialData() {
  const clubCount = db.prepare('SELECT COUNT(*) as count FROM clubs').get().count;
  if (clubCount > 0) return;

  console.log('🌱 Initializing AWS Cloud Clubs of Ajay Kumar Garg Engineering College...');
  const salt = bcrypt.genSaltSync(10);
  const adminPassHash = bcrypt.hashSync('admin123', salt);

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

  console.log('✅ Clean setup complete: Zero hardcoded members. Real members register via the app.');
}

initDatabase();

module.exports = db;
