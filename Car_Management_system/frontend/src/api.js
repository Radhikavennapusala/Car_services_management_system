// ─────────────────────────────────────────────────────────────
//  api.js  —  All Django REST API calls for CSMS Frontend
//  Uses VITE_API_BASE_URL in production, falls back to /api in local dev
// ─────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_API_BASE_URL || 'https://csms-backend.onrender.com/api').replace(/\/+$/, '');

function getToken() {
  return localStorage.getItem('csms_token') || sessionStorage.getItem('csms_token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Token ${token}` } : {}),
  };
}

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Handle 204 No Content
  if (res.status === 204) return {};

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.detail || data.non_field_errors?.[0] || JSON.stringify(data) || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login:            (username, password) => request('POST',   `${BASE}/auth/login/`,           { username, password }),
  register:         (payload)            => request('POST',   `${BASE}/auth/register/`,        payload),
  logout:           ()                   => request('POST',   `${BASE}/auth/logout/`),
  me:               ()                   => request('GET',    `${BASE}/auth/me/`),
  changePassword:   (payload)            => request('POST',   `${BASE}/auth/change-password/`, payload),
  updateProfile:    (payload)            => request('PATCH',  `${BASE}/auth/profile/update/`, payload),
  deleteAccount:    ()                   => request('DELETE', `${BASE}/auth/delete-account/`),
  listUsers:        ()                   => request('GET',    `${BASE}/auth/users/`),
  toggleUserStatus: (id)                 => request('POST',   `${BASE}/auth/users/${id}/toggle-status/`),
  deleteUserAdmin:  (id)                 => request('DELETE', `${BASE}/auth/users/${id}/delete/`),
};

// ── Cars / Vehicles ───────────────────────────────────────────
export const carsAPI = {
  list:   (params = '') => request('GET',    `${BASE}/cars/${params}`),
  create: (data)        => request('POST',   `${BASE}/cars/`, data),
  update: (id, data)    => request('PATCH',  `${BASE}/cars/${id}/`, data),
  remove: (id)          => request('DELETE', `${BASE}/cars/${id}/`),
};

// ── Services ──────────────────────────────────────────────────
export const servicesAPI = {
  list:         (params = '') => request('GET',  `${BASE}/services/${params}`),
  create:       (data)        => request('POST', `${BASE}/services/`, data),
  updateStatus: (id, data)    => request('POST', `${BASE}/services/${id}/update-status/`, data),
};

// ── Bookings ──────────────────────────────────────────────────
export const bookingsAPI = {
  list:   (params = '') => request('GET',   `${BASE}/bookings/${params}`),
  create: (data)        => request('POST',  `${BASE}/bookings/`, data),
  update: (id, data)    => request('PATCH', `${BASE}/bookings/${id}/`, data),
  cancel: (id, data = {}) => request('POST', `${BASE}/bookings/${id}/cancel/`, data),
  accept: (id)          => request('POST',  `${BASE}/bookings/${id}/accept/`, {}),
  stats:  ()            => request('GET',   `${BASE}/bookings/stats/`),
};

// ── Customers ─────────────────────────────────────────────────
export const customersAPI = {
  list:   () => request('GET',  `${BASE}/customers/`),
  create: (data) => request('POST', `${BASE}/customers/`, data),
};
