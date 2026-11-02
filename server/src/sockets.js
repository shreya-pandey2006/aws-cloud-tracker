const db = require('./db');

// Calculate distance in meters between two lat/lng coordinates (Haversine formula)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getClubRoom(clubId) {
  if (!clubId) return 'club_akgec_aws_01';
  return clubId.startsWith('club_') ? clubId : `club_${clubId}`;
}

function setupSocketIO(io, simulator) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: [${socket.id}]`);

    let currentMemberId = null;
    let currentClubId = null;
    let userRole = null;

    // Join room
    socket.on('join', ({ clubId, memberId, role }) => {
      currentClubId = clubId || 'club_akgec_aws_01';
      currentMemberId = memberId || null;
      userRole = role || 'member';

      const room = getClubRoom(currentClubId);
      socket.join(room);
      if (memberId) {
        socket.join(`member_${memberId}`);
      }

      console.log(`👤 Socket [${socket.id}] joined room ${room} as ${userRole} ${memberId || ''}`);

      if (userRole === 'member' && currentMemberId) {
        db.prepare("UPDATE members SET status = 'active', last_seen_at = datetime('now') WHERE id = ?").run(currentMemberId);
        io.to(room).emit('member:status_changed', {
          memberId: currentMemberId,
          status: 'active'
        });
      }
    });

    // Real-time location stream from Member Phone
    socket.on('location:update', (data) => {
      const {
        memberId,
        clubId = currentClubId || 'club_akgec_aws_01',
        latitude,
        longitude,
        accuracy = 5.0,
        speed = 0.0,
        heading = 0.0,
        altitude = 0.0,
        battery = 100
      } = data;

      if (!memberId || latitude === undefined || longitude === undefined) {
        return;
      }

      const lat = Number(latitude);
      const lon = Number(longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return;
      }

      const acc = Math.max(0, Number(accuracy) || 5.0);
      const spd = Math.max(0, Number(speed) || 0.0);
      const hdg = Math.min(360, Math.max(0, Number(heading) || 0.0));
      const alt = Number(altitude) || 0.0;
      const bat = Math.min(100, Math.max(0, Math.round(Number(battery) || 100)));

      // Check member's current sharing consent
      const member = db.prepare('SELECT id, name, is_sharing_location FROM members WHERE id = ?').get(memberId);
      if (!member) {
        socket.emit('auth:revoked', { memberId, error: 'Your session has expired. Please sign in again.' });
        return;
      }
      if (!member.is_sharing_location) {
        // Member has paused location sharing
        return;
      }

      try {
        // 1. Update latest state
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
        `).run(lat, lon, acc, spd, hdg, alt, bat, memberId);

        // 2. Insert into history trail
        db.prepare(`
          INSERT INTO location_history (
            member_id, latitude, longitude, accuracy, speed, heading, altitude, battery
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(memberId, lat, lon, acc, spd, hdg, alt, bat);

        // 3. Broadcast to all admins monitoring this club
        const room = getClubRoom(clubId);
        io.to(room).emit('member:location_changed', {
          memberId,
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
      } catch (err) {
        console.error('Error handling location:update:', err.message);
      }
    });

    // Member toggles location sharing ON or OFF
    socket.on('location:toggle', ({ memberId, enabled, clubId = currentClubId || 'club_akgec_aws_01' }) => {
      if (!memberId) return;

      const isSharing = enabled ? 1 : 0;
      const status = isSharing ? 'active' : 'paused';

      db.prepare(`
        UPDATE members
        SET is_sharing_location = ?,
            status = ?,
            last_seen_at = datetime('now')
        WHERE id = ?
      `).run(isSharing, status, memberId);

      const member = db.prepare('SELECT name FROM members WHERE id = ?').get(memberId);
      const room = getClubRoom(clubId);

      io.to(room).emit('member:status_changed', {
        memberId,
        name: member ? member.name : '',
        status,
        isSharing: !!isSharing,
        lastSeenAt: new Date().toISOString()
      });

      console.log(`📡 Location sharing toggled: Member [${memberId}] => ${isSharing ? 'ENABLED' : 'DISABLED'}`);
    });

    // Member sends SOS emergency alert
    socket.on('member:sos', ({ memberId, latitude, longitude, message, clubId = currentClubId || 'club_akgec_aws_01' }) => {
      if (!memberId) return;

      const cleanMemberId = String(memberId).trim();
      const member = db.prepare('SELECT name, phone, emergency_contact, club_id FROM members WHERE id = ?').get(cleanMemberId);

      // SECURITY CHECK: If member does NOT exist in the database (deleted by admin), REJECT IMMEDIATELY!
      if (!member) {
        console.warn(`[Blocked] SOS attempt from non-existent or deleted member: ${cleanMemberId}`);
        socket.emit('auth:revoked', { memberId: cleanMemberId, error: 'Unable to send SOS: Member account not found.' });
        return;
      }

      const effectiveClubId = member.club_id || clubId;

      // Deduplication: prevent rapid double-trigger within 15 seconds
      const recentAlert = db.prepare(`
        SELECT id FROM alerts
        WHERE member_id = ? AND type = 'sos' AND resolved = 0
          AND (strftime('%s', 'now') - strftime('%s', created_at)) < 15
        ORDER BY created_at DESC
        LIMIT 1
      `).get(cleanMemberId);

      if (recentAlert) {
        console.log(`[Sockets Deduplicate] Dropping duplicate SOS for member ${cleanMemberId} (existing alert: ${recentAlert.id})`);
        return;
      }

      const alertId = 'sos_' + Date.now().toString(36);
      const alertMsg = message || `EMERGENCY SOS: Member ${member ? member.name : cleanMemberId} pressed distress alert!`;

      db.prepare(`
        INSERT INTO alerts (id, club_id, member_id, type, severity, message, latitude, longitude, resolved)
        VALUES (?, ?, ?, 'sos', 'critical', ?, ?, ?, 0)
      `).run(alertId, effectiveClubId, cleanMemberId, alertMsg, latitude || 0, longitude || 0);

      const alertPayload = {
        id: alertId,
        clubId: effectiveClubId,
        memberId: cleanMemberId,
        memberName: member ? member.name : 'Club Member',
        memberPhone: member ? member.phone : '',
        emergencyContact: member ? member.emergency_contact : '',
        type: 'sos',
        severity: 'critical',
        message: alertMsg,
        latitude,
        longitude,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Broadcast urgent SOS to admin dashboards (single event emission)
      const room = getClubRoom(effectiveClubId);
      io.to(room).emit('alert:sos', alertPayload);

      console.log(`🚨 SOS DISTRESS ALERT BROADCASTED for Member [${cleanMemberId}]!`);
    });

    // Admin toggles demo fleet simulator (no-op)
    socket.on('simulator:toggle', ({ clubId = currentClubId || 'club_akgec_aws_01' }) => {
      if (simulator) {
        const isRunning = simulator.toggle();
        const room = getClubRoom(clubId);
        io.to(room).emit('simulator:status', { isRunning });
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: [${socket.id}]`);
      if (userRole === 'member' && currentMemberId && currentClubId) {
        // Set to idle/offline after a small grace window
        setTimeout(() => {
          try {
            db.prepare("UPDATE members SET status = 'offline' WHERE id = ? AND is_sharing_location = 0").run(currentMemberId);
            const room = getClubRoom(currentClubId);
            io.to(room).emit('member:status_changed', {
              memberId: currentMemberId,
              status: 'offline'
            });
          } catch (e) {}
        }, 10000);
      }
    });
  });
}

module.exports = setupSocketIO;

