/** Production (Vercel): uses /api → proxied to Render in vercel.json */
function resolveApiBase() {
  if (window.API_BASE) return window.API_BASE.replace(/\/$/, '');
  const { hostname, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (port === '8080' || port === '5500') return 'http://localhost:8000/api';
    if (port === '8000' || port === '8001') return `${window.location.protocol}//${hostname}:${port}/api`;
    return '/api';
  }
  return '/api';
}

const API = resolveApiBase();

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isLoggedIn() { return !!this.token; }
  getRole() { return this.user?.role || ''; }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const timeoutMs = options.timeoutMs ?? 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(`${API}${path}`, { ...options, headers, signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out. Try again in a moment.');
      throw new Error('Cannot reach the API. Check that the Render backend is running.');
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401) { this.clearAuth(); return null; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      const detail = err.detail;
      throw new Error(typeof detail === 'string' ? detail : 'Request failed');
    }
    return res.json();
  }

  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); }
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); }

  async upload(path, formData) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  }

  login(email, password) { return this.post('/auth/login', { email, password }); }
  register(data) { return this.post('/auth/register', data); }
}

const api = new ApiService();
