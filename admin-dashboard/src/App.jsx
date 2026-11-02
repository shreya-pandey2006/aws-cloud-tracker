import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import MemberSidebar from './components/MemberSidebar';
import AlertBanner from './components/AlertBanner';
import AlertsModal from './components/AlertsModal';
import HistoryReplayBar from './components/HistoryReplayBar';
import GeofenceModal from './components/GeofenceModal';
import LoginModal from './components/LoginModal';

import { api, getAuthToken, setAuthToken, getAdminUser, setAdminUser, getBackendServerUrl, setBackendServerUrl } from './services/api';
import { initSocket, disconnectSocket, getSocket } from './services/socket';
import { playEmergencyAlertSound } from './utils/audio';

const isLegacyMockMember = (m) => {
  if (!m) return false;
  const name = (m.name || '').toLowerCase().trim();
  const email = (m.email || '').toLowerCase().trim();
  const id = m.id || m.memberId || m.member_id || '';
  return ['alex rivera', 'jordan lee', 'taylor smith', 'sam patel'].includes(name)
    || ['mem_01', 'mem_02', 'mem_03', 'mem_04'].includes(id)
    || email.startsWith('alex@') || email.startsWith('jordan@') || email.startsWith('taylor@') || email.startsWith('sam@');
};

const DISMISSED_ALERTS_KEY = 'club_dismissed_alert_ids';

// Wipe any legacy name-based suppression from localStorage
try {
  localStorage.removeItem('club_dismissed_member_names');
} catch {}

function getDismissedAlertIds() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_ALERTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistDismissedAlertId(alertId) {
  try {
    const list = getDismissedAlertIds();
    if (!list.includes(alertId)) {
      list.push(alertId);
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(list.slice(-500)));
    }
  } catch (err) {
    console.error('Failed to save dismissed alert to localStorage', err);
  }
}

function persistDismissedAlertIds(alertIds) {
  try {
    const set = new Set(getDismissedAlertIds());
    alertIds.forEach((id) => set.add(id));
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(Array.from(set).slice(-500)));
  } catch (err) {
    console.error('Failed to save dismissed alerts to localStorage', err);
  }
}

const DISMISSED_MEMBERS_KEY = 'club_dismissed_member_ids';

function getDismissedMemberIds() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_MEMBERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistDismissedMemberId(memberId) {
  try {
    if (!memberId) return;
    const list = getDismissedMemberIds();
    if (!list.includes(memberId)) {
      list.push(memberId);
      localStorage.setItem(DISMISSED_MEMBERS_KEY, JSON.stringify(list.slice(-500)));
    }
  } catch (err) {
    console.error('Failed to save dismissed member to localStorage', err);
  }
}

function unpersistDismissedMemberId(memberId) {
  try {
    if (!memberId) return;
    const list = getDismissedMemberIds().filter((id) => id !== memberId);
    localStorage.setItem(DISMISSED_MEMBERS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to un-dismiss member from localStorage', err);
  }
}

export default function App() {
  const [adminUser, setUser] = useState(getAdminUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [members, setMembers] = useState([]);
  const membersRef = useRef(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const [geofences, setGeofences] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [simulatorActive, setSimulatorActive] = useState(false);
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(getBackendServerUrl());
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [historyTrail, setHistoryTrail] = useState(null);
  const [historyMember, setHistoryMember] = useState(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState(null);

  // Load initial club data
  const loadDashboardData = useCallback(async () => {
    try {
      const [membersRes, geofencesRes, alertsRes] = await Promise.all([
        api.getMembers(),
        api.getGeofences('club_akgec_aws_01'),
        api.getAlerts('club_akgec_aws_01')
      ]);

      const rawMembers = membersRes.members || [];
      const dismissedMemberIds = new Set(getDismissedMemberIds());
      const cleanMembers = rawMembers
        .filter((m) => !isLegacyMockMember(m))
        .filter((m) => !dismissedMemberIds.has(m.id));

      const rawAlerts = alertsRes.alerts || [];
      const dismissedAlertIds = new Set(getDismissedAlertIds());
      const activeMemberIds = new Set(cleanMembers.map((m) => m.id));

      const cleanAlerts = rawAlerts
        .filter((a) => !isLegacyMockMember({ id: a.member_id, name: a.member_name }))
        .filter((a) => !dismissedAlertIds.has(a.id))
        .filter((a) => {
          const mId = a.member_id || a.memberId;
          // Drop alert only if member is explicitly known to be deleted / not active
          if (mId && dismissedMemberIds.has(mId) && !activeMemberIds.has(mId)) return false;
          return true;
        });

      // Deduplicate alerts: collapse duplicate unresolved alerts for the same member within 30s
      const dedupedAlerts = [];
      for (const a of cleanAlerts) {
        const mId = a.member_id || a.memberId;
        const aTime = new Date(a.created_at ? a.created_at.replace(' ', 'T') + 'Z' : Date.now()).getTime();
        const isDupe = dedupedAlerts.some((existing) => {
          const exMId = existing.member_id || existing.memberId;
          if (mId && exMId === mId && a.type === existing.type && a.message === existing.message) {
            const exTime = new Date(existing.created_at ? existing.created_at.replace(' ', 'T') + 'Z' : Date.now()).getTime();
            return Math.abs(aTime - exTime) < 30000;
          }
          return false;
        });
        if (!isDupe) {
          dedupedAlerts.push(a);
        }
      }

      setMembers(cleanMembers);
      setGeofences(geofencesRes.geofences || []);
      setAlerts(dedupedAlerts);
      setSimulatorActive(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  // Handle Socket connections
  useEffect(() => {
    if (!isAuthenticated) return;

    loadDashboardData();

    const socket = initSocket(
      'club_akgec_aws_01',
      () => {
        setIsSocketConnected(true);
        loadDashboardData();
        console.log('Admin socket ready for live member telemetry');
      },
      () => {
        setIsSocketConnected(false);
      }
    );

    // Real-time location update event
    socket.on('member:location_changed', (data) => {
      if (isLegacyMockMember(data)) return;
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
      if (isLegacyMockMember(data)) return;
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

    // Real-time new member registration
    socket.on('member:joined', (newMember) => {
      if (isLegacyMockMember(newMember)) return;
      unpersistDismissedMemberId(newMember.id);
      setMembers((prev) => {
        if (prev.some((m) => m.id === newMember.id)) return prev;
        return [newMember, ...prev];
      });
    });

    // Real-time member removal
    socket.on('member:removed', ({ memberId }) => {
      persistDismissedMemberId(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setAlerts((prev) => prev.filter((a) => a.member_id !== memberId && a.memberId !== memberId));
    });

    // SOS Emergency Alert
    socket.on('alert:sos', (alertData) => {
      const mId = alertData.memberId || alertData.member_id;
      const dismissedAlertIds = new Set(getDismissedAlertIds());
      const dismissedMemberIds = new Set(getDismissedMemberIds());

      if (dismissedAlertIds.has(alertData.id)) return;
      if (isLegacyMockMember({ id: mId, name: alertData.memberName })) return;

      // Drop only if member was deleted and is NOT in current active members list
      if (mId && dismissedMemberIds.has(mId) && !membersRef.current.some((m) => m.id === mId)) {
        console.warn('Blocked incoming SOS from deleted member ID:', mId);
        return;
      }

      playEmergencyAlertSound();
      setAlerts((prev) => {
        // Drop duplicate SOS within 15 seconds from the same member
        const isDupe = prev.some((a) => {
          if (a.id === alertData.id) return true;
          const prevMId = a.member_id || a.memberId;
          if (prevMId && prevMId === mId && a.type === 'sos' && !a.resolved) {
            const timeDiff = Math.abs(Date.now() - new Date(a.created_at || a.createdAt || Date.now()).getTime());
            return isNaN(timeDiff) || timeDiff < 15000;
          }
          return false;
        });
        if (isDupe) {
          console.warn('Dashboard dropped duplicate incoming SOS alert for member:', mId);
          return prev;
        }
        return [alertData, ...prev];
      });

      // Highlight member with SOS status
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === mId) {
            return { ...m, status: 'sos' };
          }
          return m;
        })
      );

      // Auto-focus on emergency location
      if (mId) setSelectedMemberId(mId);
    });

    // General Alert (Geofence, etc.)
    socket.on('alert:new', (alertData) => {
      const mId = alertData.memberId || alertData.member_id;
      const dismissedAlertIds = new Set(getDismissedAlertIds());
      const dismissedMemberIds = new Set(getDismissedMemberIds());

      if (dismissedAlertIds.has(alertData.id)) return;
      if (isLegacyMockMember({ id: mId, name: alertData.memberName })) return;

      if (mId && dismissedMemberIds.has(mId) && !membersRef.current.some((m) => m.id === mId)) {
        console.warn('Blocked incoming alert from deleted member ID:', mId);
        return;
      }

      setAlerts((prev) => {
        if (prev.some((a) => a.id === alertData.id)) return prev;
        return [alertData, ...prev];
      });
    });

    // Alert Real-Time Events
    socket.on('alert:deleted', ({ alertId }) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    });

    socket.on('alert:resolved', ({ alertId }) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, resolved: 1 } : a))
      );
    });

    socket.on('alert:bulk_deleted', () => {
      setAlerts((prev) => prev.filter((a) => a.resolved === 0 || a.resolved === false));
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
    try {
      await api.resolveAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, resolved: 1 } : a))
      );
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Delete Alert
  const handleDeleteAlert = async (alertId) => {
    // 1. Immediately persist locally so refreshing NEVER brings it back
    persistDismissedAlertId(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));

    // 2. Also send delete request to backend
    try {
      await api.deleteAlert(alertId);
    } catch (err) {
      console.warn('Backend delete sync note (server pending update):', err.message);
    }
  };

  // Bulk Clear Resolved Alerts
  const handleClearResolvedAlerts = async () => {
    if (!window.confirm('Are you sure you want to delete all resolved alerts from history?')) return;
    const resolvedIds = alerts
      .filter((a) => a.resolved === 1 || a.resolved === true)
      .map((a) => a.id);

    // 1. Immediately persist locally so refreshing NEVER brings them back
    persistDismissedAlertIds(resolvedIds);
    setAlerts((prev) => prev.filter((a) => a.resolved === 0 || a.resolved === false));

    // 2. Also send bulk clear to backend
    try {
      await api.clearResolvedAlerts();
    } catch (err) {
      console.warn('Backend bulk delete sync note (server pending update):', err.message);
    }
  };

  // Delete Member
  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the club?')) return;

    // 1. Immediately persist locally so refreshing NEVER brings them back
    persistDismissedMemberId(memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (selectedMemberId === memberId) setSelectedMemberId(null);

    // Also purge and dismiss alerts associated with this deleted member ID
    const relatedAlertIds = alerts
      .filter((a) => (a.member_id || a.memberId) === memberId)
      .map((a) => a.id);

    if (relatedAlertIds.length > 0) {
      persistDismissedAlertIds(relatedAlertIds);
    }
    setAlerts((prev) => prev.filter((a) => (a.member_id || a.memberId) !== memberId));

    // 2. Also send DELETE to backend
    try {
      await api.deleteMember(memberId);
    } catch (err) {
      console.warn('Backend delete member note (server pending redeploy):', err.message);
    }
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
            isConnected={isSocketConnected}
            onOpenServerSettings={() => setIsServerSettingsOpen(true)}
            onOpenGeofences={() => setIsGeofenceModalOpen(true)}
            onOpenAlerts={() => setIsAlertsModalOpen(true)}
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
              onDeleteMember={handleDeleteMember}
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

          {/* Alerts & Notifications Modal */}
          <AlertsModal
            isOpen={isAlertsModalOpen}
            onClose={() => setIsAlertsModalOpen(false)}
            alerts={alerts}
            onFocusMember={setSelectedMemberId}
            onResolveAlert={handleResolveAlert}
            onDeleteAlert={handleDeleteAlert}
            onClearResolved={handleClearResolvedAlerts}
          />

          {/* Server Gateway Settings Modal */}
          {isServerSettingsOpen && (
            <div
              onClick={() => setIsServerSettingsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '16px',
                  width: '460px',
                  maxWidth: '92%',
                  padding: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  position: 'relative'
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
                  Backend Gateway Settings
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '16px' }}>
                  Configure which backend server the admin dashboard communicates with:
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <input
                    type="text"
                    value={customServerUrl}
                    onChange={(e) => setCustomServerUrl(e.target.value)}
                    placeholder="https://aws-cloud-tracker.onrender.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setCustomServerUrl('https://aws-cloud-tracker.onrender.com')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      color: '#93c5fd',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ☁️ Live Render Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomServerUrl('http://localhost:5000')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    💻 Localhost:5000
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsServerSettingsOpen(false)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanUrl = customServerUrl.trim();
                      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                        alert('URL must start with http:// or https://');
                        return;
                      }
                      setBackendServerUrl(cleanUrl);
                      setIsServerSettingsOpen(false);
                      window.location.reload();
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Save & Reconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
