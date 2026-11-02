export function getBackendServerUrl() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('club_backend_url') : null;
  if (custom) return custom.replace(/\/$/, '');

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  return 'https://aws-cloud-tracker.onrender.com';
}

export function setBackendServerUrl(url) {
  if (url) {
    localStorage.setItem('club_backend_url', url.trim().replace(/\/$/, ''));
  } else {
    localStorage.removeItem('club_backend_url');
  }
}

export function getApiBase() {
  return `${getBackendServerUrl()}/api`;
}

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

  const response = await fetch(`${getApiBase()}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = { message: text.slice(0, 200) };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Server request failed (${response.status})`;
    throw new Error(errorMsg);
  }
  return data || {};
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

  deleteMember: (id) =>
    request(`/members/${id}`, {
      method: 'DELETE',
    }),

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

  deleteAlert: (id) =>
    request(`/alerts/${id}`, {
      method: 'DELETE',
    }),

  clearResolvedAlerts: () =>
    request('/alerts/bulk/resolved', {
      method: 'DELETE',
    }),

  // Simulator
  toggleSimulator: () =>
    request('/simulator/toggle', {
      method: 'POST',
    }),

  getSimulatorStatus: () => request('/simulator/status'),

  getSystemStatus: () => request('/system/status'),
};

