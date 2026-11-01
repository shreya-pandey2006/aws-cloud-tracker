import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import MemberSidebar from './components/MemberSidebar';
import AlertBanner from './components/AlertBanner';
import HistoryReplayBar from './components/HistoryReplayBar';
import GeofenceModal from './components/GeofenceModal';
import LoginModal from './components/LoginModal';

import { api, getAuthToken, setAuthToken, getAdminUser, setAdminUser } from './services/api';
import { initSocket, disconnectSocket, getSocket } from './services/socket';
import { playEmergencyAlertSound } from './utils/audio';

export default function App() {
  const [adminUser, setUser] = useState(getAdminUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [members, setMembers] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [simulatorActive, setSimulatorActive] = useState(false);
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [historyTrail, setHistoryTrail] = useState(null);
  const [historyMember, setHistoryMember] = useState(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState(null);

  // Load initial club data
  const loadDashboardData = useCallback(async () => {
    try {
      const [membersRes, geofencesRes, alertsRes, simRes] = await Promise.all([
        api.getMembers(),
        api.getGeofences('club_akgec_aws_01'),
        api.getAlerts('club_akgec_aws_01'),
        api.getSimulatorStatus()
      ]);

      setMembers(membersRes.members || []);
      setGeofences(geofencesRes.geofences || []);
      setAlerts(alertsRes.alerts || []);
      setSimulatorActive(simRes.isRunning);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  // Handle Socket connections
  useEffect(() => {
    if (!isAuthenticated) return;

    loadDashboardData();

    const socket = initSocket('club_akgec_aws_01', () => {
      console.log('Admin socket ready for live member telemetry');
    });

    // Real-time location update event
    socket.on('member:location_changed', (data) => {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === data.memberId) {
            return {
              ...m,
              last_latitude: data.latitude,
              last_longitude: data.longitude,
              last_accuracy: data.accuracy,
              last_speed: data.speed,
              last_heading: data.heading,
              last_battery: data.battery,
              last_seen_at: data.lastSeenAt,
              status: data.status,
              is_sharing_location: 1
            };
          }
          return m;
        })
      );
    });

    // Real-time status change event
    socket.on('member:status_changed', (data) => {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === data.memberId) {
            return {
              ...m,
              status: data.status,
              is_sharing_location: data.isSharing ? 1 : 0,
              last_seen_at: data.lastSeenAt || m.last_seen_at
            };
          }
          return m;
        })
      );
    });

    // SOS Emergency Alert
    socket.on('alert:sos', (alertData) => {
      playEmergencyAlertSound();
      setAlerts((prev) => [alertData, ...prev]);

      // Highlight member with SOS status
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === alertData.memberId) {
            return { ...m, status: 'sos' };
          }
          return m;
        })
      );

      // Auto-focus on emergency location
      setSelectedMemberId(alertData.memberId);
    });

    // General Alert (Geofence, etc.)
    socket.on('alert:new', (alertData) => {
      setAlerts((prev) => [alertData, ...prev]);
    });

    // Simulator status event
    socket.on('simulator:status', ({ isRunning }) => {
      setSimulatorActive(isRunning);
    });

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, loadDashboardData]);

  // Login handler
  const handleLogin = async (email, password) => {
    const res = await api.adminLogin(email, password);
    setAuthToken(res.token);
    setAdminUser(res.user);
    setUser(res.user);
    setIsAuthenticated(true);
  };

  // Logout handler
  const handleLogout = () => {
    setAuthToken(null);
    setAdminUser(null);
    setUser(null);
    setIsAuthenticated(false);
    disconnectSocket();
  };

  // Simulator toggle
  const handleToggleSimulator = async () => {
    try {
      const res = await api.toggleSimulator();
      setSimulatorActive(res.isRunning);
    } catch (err) {
      alert('Failed to toggle simulator: ' + err.message);
    }
  };

  // Load member history breadcrumbs
  const handleLoadHistory = async (memberId) => {
    try {
      setLoadingHistoryId(memberId);
      const res = await api.getMemberHistory(memberId, 24, 150);
      setHistoryTrail(res.trail || []);
      const member = members.find((m) => m.id === memberId);
      setHistoryMember(member || null);
      setSelectedMemberId(memberId);
    } catch (err) {
      alert('Failed to load history: ' + err.message);
    } finally {
      setLoadingHistoryId(null);
    }
  };

  // Clear history breadcrumbs
  const handleClearHistory = () => {
    setHistoryTrail(null);
    setHistoryMember(null);
  };

  // Geofence Actions
  const handleCreateGeofence = async (data) => {
    const res = await api.createGeofence(data);
    setGeofences((prev) => [res.geofence, ...prev]);
  };

  const handleDeleteGeofence = async (id) => {
    await api.deleteGeofence(id);
    setGeofences((prev) => prev.filter((g) => g.id !== id));
  };

  // Resolve Alert
  const handleResolveAlert = async (alertId) => {
    await api.resolveAlert(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: 1 } : a))
    );
  };

  // Calculated Stats
  const activeSharingCount = members.filter(
    (m) => (m.is_sharing_location === 1 || m.is_sharing_location === true) && m.status !== 'sos'
  ).length;
  const unresolvedAlertCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="app-container">
      {/* Login Modal */}
      <LoginModal isOpen={!isAuthenticated} onLogin={handleLogin} />

      {isAuthenticated && (
        <>
          {/* Top Navbar */}
          <Navbar
            club={{ name: adminUser?.clubName, code: adminUser?.clubCode }}
            admin={adminUser}
            stats={{
              total: members.length,
              activeSharing: activeSharingCount,
            }}
            simulatorActive={simulatorActive}
            onToggleSimulator={handleToggleSimulator}
            onOpenGeofences={() => setIsGeofenceModalOpen(true)}
            onOpenAlerts={() => {}}
            unresolvedAlertCount={unresolvedAlertCount}
            onLogout={handleLogout}
          />

          {/* Main Content Area */}
          <div className="main-content">
            {/* Live Map */}
            <MapView
              members={members}
              geofences={geofences}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              historyTrail={historyTrail}
              onClearHistory={handleClearHistory}
              onLoadHistory={handleLoadHistory}
            />

            {/* Members Directory Sidebar */}
            <MemberSidebar
              members={members}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onLoadHistory={handleLoadHistory}
              loadingHistory={loadingHistoryId}
            />

            {/* Emergency & Geofence Alert Banner */}
            <AlertBanner
              alerts={alerts}
              onFocusMember={setSelectedMemberId}
              onResolveAlert={handleResolveAlert}
            />

            {/* History Trail Bar */}
            <HistoryReplayBar
              historyTrail={historyTrail}
              member={historyMember}
              onClose={handleClearHistory}
            />
          </div>

          {/* Geofence Management Modal */}
          <GeofenceModal
            isOpen={isGeofenceModalOpen}
            onClose={() => setIsGeofenceModalOpen(false)}
            geofences={geofences}
            onCreateGeofence={handleCreateGeofence}
            onDeleteGeofence={handleDeleteGeofence}
          />
        </>
      )}
    </div>
  );
}
