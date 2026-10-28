const API = import.meta.env.VITE_API_URL || '/api';
let csrfToken = '';

async function request(path, options = {}) {
  if (options.method && options.method !== 'GET' && !csrfToken) await initCsrf();
  const { headers: extraHeaders, ...fetchOptions } = options;
  const response = await fetch(`${API}${path}`, {
    ...fetchOptions, credentials: 'include', headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.method && options.method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}),
      ...extraHeaders
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('taskmate:unauthorized'));
    const error = new Error(payload.error?.message || 'Something went wrong. Please try again.');
    error.status = response.status; error.code = payload.error?.code; error.details = payload.error?.details || [];
    throw error;
  }
  if (payload.data?.csrfToken) csrfToken = payload.data.csrfToken;
  return payload;
}

export async function initCsrf() { const result = await request('/auth/csrf'); csrfToken = result.data.csrfToken; return csrfToken; }
export const api = {
  me: () => request('/auth/me'),
  login: async (data) => { await initCsrf(); return request('/auth/login', { method: 'POST', body: JSON.stringify(data) }); },
  register: async (data) => { await initCsrf(); return request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); },
  logout: async () => { const result = await request('/auth/logout', { method: 'POST' }); csrfToken = ''; return result; },
  stats: () => request('/dashboard/stats'),
  tasks: (query) => request(`/tasks?${new URLSearchParams(query)}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' })
};
