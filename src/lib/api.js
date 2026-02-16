// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Get the auth token from localStorage
const getAuthToken = () => localStorage.getItem('crm_token');

// Generic fetch wrapper with auth
export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // Handle 401 unauthorized - redirect to login
  if (response.status === 401) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    window.location.href = '/login';
    return { success: false, message: 'Session expired' };
  }

  return response.json();
}

// Upload helper for FormData (multipart)
export async function apiUpload(endpoint, formData) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (response.status === 401) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    window.location.href = '/login';
    return { success: false, message: 'Session expired' };
  }
  return response.json();
}

// Convenience methods
export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: 'GET' }),
  
  post: (endpoint, data, options) => {
    // Support FormData uploads
    if (data instanceof FormData) return apiUpload(endpoint, data);
    return apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  put: (endpoint, data) => apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  patch: (endpoint, data) => apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
  
  upload: apiUpload,
};

export default api;

