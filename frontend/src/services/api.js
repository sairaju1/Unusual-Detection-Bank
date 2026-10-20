import axios from 'axios';

const TOKEN_KEY = 'udt_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const http = axios.create({ baseURL: `${import.meta.env.VITE_API_BASE || ''}/api`, timeout: 70000 });

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Session expired: drop the token and let AuthContext show the login page.
http.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && !e.config?.url?.startsWith('/auth/')) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(e);
  }
);

// Unwraps { success, data } and turns errors into Error objects with readable messages.
const unwrap = (promise) =>
  promise
    .then((r) => r.data.data)
    .catch((e) => {
      const body = e.response?.data;
      const msg = body?.error || (e.code === 'ERR_NETWORK' ? 'Cannot reach the backend. Is it running on port 4000?' : e.message);
      throw Object.assign(new Error(msg), { details: body?.details });
    });

export const api = {
  register: (name, email, password) => unwrap(http.post('/auth/register', { name, email, password })),
  login: (email, password) => unwrap(http.post('/auth/login', { email, password })),
  me: () => unwrap(http.get('/auth/me')),
  stats: () => unwrap(http.get('/dashboard/stats')),
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return unwrap(http.post('/statements/upload', fd));
  },
  analyze: (statementId) => unwrap(http.post(`/analysis/${statementId}`, { contamination: 0.05 })),
  transactions: (params) => unwrap(http.get('/transactions', { params })),
  transaction: (id) => unwrap(http.get(`/transactions/${id}`)),
  review: (id, reviewStatus, reviewNotes = '') => unwrap(http.patch(`/transactions/${id}/review`, { reviewStatus, reviewNotes })),
  // Needs the auth header, so it is fetched as a blob instead of a plain link.
  exportCsv: () => http.get('/reports/export', { responseType: 'blob' }).then((r) => r.data).catch((e) => {
    throw new Error(e.response?.status === 401 ? 'Please log in again.' : 'Could not download the report.');
  }),
};
