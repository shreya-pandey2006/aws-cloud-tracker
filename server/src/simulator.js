const db = require('./db');

class MemberMovementSimulator {
  constructor(io) {
    this.io = io;
    this.intervalId = null;
    this.isRunning = false;
    this.simulatedFleets = [];
  }

  start() {
    this.isRunning = false;
  }

  stop() {
    if (!this.isRunning) return;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
  }

  toggle() {
    return false;
  }

  tick() {
    // No-op: zero hardcoded members
  }
}

module.exports = MemberMovementSimulator;
