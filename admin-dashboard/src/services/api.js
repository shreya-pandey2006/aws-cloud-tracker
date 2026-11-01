const API_BASE = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`);

export function getAuthToken() {
  return localStorage.getItem('club_admin_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('club_admin_token', token);
  } else {
    localStorage.removeItem('club_admin_token');
  }
}

export function getAdminUser() {
  const user = localStorage.getItem('club_admin_user');
  return user ? JSON.parse(user) : null;
}

export function setAdminUser(user) {
  if (user) {
    localStorage.setItem('club_admin_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('club_admin_user');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server request failed');
  }
  return data;
}

export const api = {
  // Auth
  adminLogin: (email, password) =>
    request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request('/auth/me'),

  // Members
  getMembers: () => request('/members'),

  getMemberHistory: (memberId, hours = 24, limit = 200) =>
    request(`/members/${memberId}/history?hours=${hours}&limit=${limit}`),

  // Geofences
  getGeofences: (clubId) => request(`/geofences?clubId=${clubId || 'club_akgec_aws_01'}`),

  createGeofence: (data) =>
    request('/geofences', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteGeofence: (id) =>
    request(`/geofences/${id}`, {
      method: 'DELETE',
    }),

  // Alerts
  getAlerts: (clubId) => request(`/alerts?clubId=${clubId || 'club_akgec_aws_01'}`),

  resolveAlert: (id) =>
    request(`/alerts/${id}/resolve`, {
      method: 'PUT',
    }),

  // Simulator
  toggleSimulator: () =>
    request('/simulator/toggle', {
      method: 'POST',
    }),

  getSimulatorStatus: () => request('/simulator/status'),

  getSystemStatus: () => request('/system/status'),
};

