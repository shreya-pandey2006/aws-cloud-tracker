const db = require('./db');

class MemberMovementSimulator {
  constructor(io) {
    this.io = io;
    this.intervalId = null;
    this.isRunning = false;
    this.tickCount = 0;

    // Defined realistic waypoints around AKGEC Campus
    this.simulatedFleets = [
      {
        id: 'mem_alex',
        baseLat: 28.6762,
        baseLng: 77.5025,
        radiusLat: 0.0018,
        radiusLng: 0.0022,
        speedBase: 5.2, // km/h (walking across campus)
        phase: 0.0,
        speedStep: 0.08
      },
      {
        id: 'mem_jordan',
        baseLat: 28.6750,
        baseLng: 77.5015,
        radiusLat: 0.0025,
        radiusLng: 0.0028,
        speedBase: 14.8, // km/h (cycling around campus)
        phase: 1.5,
        speedStep: 0.12
      },
      {
        id: 'mem_taylor',
        baseLat: 28.6745,
        baseLng: 77.5005,
        radiusLat: 0.0030,
        radiusLng: 0.0035,
        speedBase: 22.5, // km/h (support vehicle/e-bike)
        phase: 3.14,
        speedStep: 0.15
      }
    ];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🚀 Fleet GPS Movement Simulator STARTED');

    this.intervalId = setInterval(() => {
      this.tick();
    }, 3000);
  }

  stop() {
    if (!this.isRunning) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
    console.log('⏹️ Fleet GPS Movement Simulator STOPPED');
  }

  toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  tick() {
    this.tickCount++;

    for (const fleet of this.simulatedFleets) {
      // Advance position along an organic parametric path
      fleet.phase += fleet.speedStep;
      if (fleet.phase > Math.PI * 2) {
        fleet.phase -= Math.PI * 2;
      }

      // Add gentle Lissajous wave pattern to mimic street / trail curvature
      const lat = fleet.baseLat + Math.sin(fleet.phase) * fleet.radiusLat;
      const lng = fleet.baseLng + Math.cos(fleet.phase * 0.8) * fleet.radiusLng;

      // Calculate approximate heading (bearing)
      const heading = Math.round(((fleet.phase * 180 / Math.PI) + 90) % 360);
      const speed = Number((fleet.speedBase + Math.sin(fleet.phase * 2) * 2.5).toFixed(1));
      const battery = Math.max(15, 95 - Math.floor(this.tickCount / 10));
      const accuracy = Number((3.5 + Math.random() * 2.0).toFixed(1));

      // Update database
      try {
        db.prepare(`
          UPDATE members
          SET last_latitude = ?,
              last_longitude = ?,
              last_accuracy = ?,
              last_speed = ?,
              last_heading = ?,
              last_battery = ?,
              last_seen_at = datetime('now'),
              status = 'active',
              is_sharing_location = 1
          WHERE id = ?
        `).run(lat, lng, accuracy, speed, heading, battery, fleet.id);

        db.prepare(`
          INSERT INTO location_history (
            member_id, latitude, longitude, accuracy, speed, heading, battery
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(fleet.id, lat, lng, accuracy, speed, heading, battery);

        // Fetch fresh member row
        const member = db.prepare(`
          SELECT id, club_id, name, email, phone, role, status, is_sharing_location,
                 last_latitude, last_longitude, last_accuracy, last_speed,
                 last_heading, last_battery, last_seen_at
          FROM members WHERE id = ?
        `).get(fleet.id);

        if (this.io && member) {
          this.io.to(`club_${member.club_id}`).emit('member:location_changed', {
            memberId: member.id,
            name: member.name,
            latitude: lat,
            longitude: lng,
            accuracy,
            speed,
            heading,
            battery,
            lastSeenAt: new Date().toISOString(),
            status: 'active',
            isSharing: true
          });
        }
      } catch (err) {
        console.error('Simulator tick error for member', fleet.id, err.message);
      }
    }
  }
}

module.exports = MemberMovementSimulator;

