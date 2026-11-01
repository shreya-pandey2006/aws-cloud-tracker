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

      socket.join(`club_${currentClubId}`);
      if (memberId) {
        socket.join(`member_${memberId}`);
      }

      console.log(`👤 Socket [${socket.id}] joined room club_${currentClubId} as ${userRole} ${memberId || ''}`);

      if (userRole === 'member' && currentMemberId) {
        db.prepare("UPDATE members SET status = 'active', last_seen_at = datetime('now') WHERE id = ?").run(currentMemberId);
        io.to(`club_${currentClubId}`).emit('member:status_changed', {
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

      // Check member's current sharing consent
      const member = db.prepare('SELECT id, name, is_sharing_location FROM members WHERE id = ?').get(memberId);
      if (!member || !member.is_sharing_location) {
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
        `).run(latitude, longitude, accuracy, speed, heading, altitude, battery, memberId);

        // 2. Insert into history trail
        db.prepare(`
          INSERT INTO location_history (
            member_id, latitude, longitude, accuracy, speed, heading, altitude, battery
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(memberId, latitude, longitude, accuracy, speed, heading, altitude, battery);

        // 3. Broadcast to all admins monitoring this club
        io.to(`club_${clubId}`).emit('member:location_changed', {
          memberId,
          name: member.name,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          altitude,
          battery,
          status: 'active',
          isSharing: true,
          lastSeenAt: new Date().toISOString()
        });

        // 4. Check Geofence perimeters
        const geofences = db.prepare('SELECT * FROM geofences WHERE club_id = ?').all(clubId);
        for (const gf of geofences) {
          const dist = getDistanceMeters(latitude, longitude, gf.latitude, gf.longitude);
          if (dist <= gf.radius_meters) {
            // Check if alert was already raised in the last 15 minutes
            const recentAlert = db.prepare(`
              SELECT id FROM alerts
              WHERE member_id = ? AND type = 'geofence_enter' AND message LIKE ?
                AND created_at >= datetime('now', '-15 minutes')
            `).get(memberId, `%${gf.name}%`);

            if (!recentAlert) {
              const alertId = 'gf_' + Date.now().toString(36);
              const msg = `${member.name} entered zone "${gf.name}" (${Math.round(dist)}m from center)`;
              db.prepare(`
                INSERT INTO alerts (id, club_id, member_id, type, severity, message, latitude, longitude, resolved)
                VALUES (?, ?, ?, 'geofence_enter', 'info', ?, ?, ?, 0)
              `).run(alertId, clubId, memberId, msg, latitude, longitude);

              io.to(`club_${clubId}`).emit('alert:new', {
                id: alertId,
                clubId,
                memberId,
                memberName: member.name,
                type: 'geofence_enter',
                severity: 'info',
                message: msg,
                latitude,
                longitude,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
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

      io.to(`club_${clubId}`).emit('member:status_changed', {
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

      const member = db.prepare('SELECT name, phone, emergency_contact FROM members WHERE id = ?').get(memberId);
      const alertId = 'sos_' + Date.now().toString(36);
      const alertMsg = message || `EMERGENCY SOS: Member ${member ? member.name : memberId} pressed distress alert!`;

      db.prepare(`
        INSERT INTO alerts (id, club_id, member_id, type, severity, message, latitude, longitude, resolved)
        VALUES (?, ?, ?, 'sos', 'critical', ?, ?, ?, 0)
      `).run(alertId, clubId, memberId, alertMsg, latitude || 0, longitude || 0);

      const alertPayload = {
        id: alertId,
        clubId,
        memberId,
        memberName: member ? member.name : 'Club Member',
        memberPhone: member ? member.phone : '',
        emergencyContact: member ? member.emergency_contact : '',
        type: 'sos',
        severity: 'critical',
        message: alertMsg,
        latitude,
        longitude,
        createdAt: new Date().toISOString()
      };

      // Broadcast urgent SOS to admin dashboards
      io.to(`club_${clubId}`).emit('alert:sos', alertPayload);
      io.to(`club_${clubId}`).emit('alert:new', alertPayload);

      console.log(`🚨 SOS DISTRESS ALERT BROADCASTED for Member [${memberId}]!`);
    });

    // Admin toggles demo fleet simulator
    socket.on('simulator:toggle', ({ clubId = currentClubId || 'club_akgec_aws_01' }) => {
      if (simulator) {
        const isRunning = simulator.toggle();
        io.to(`club_${clubId}`).emit('simulator:status', { isRunning });
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
            io.to(`club_${currentClubId}`).emit('member:status_changed', {
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

