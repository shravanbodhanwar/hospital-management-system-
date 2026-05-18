const API = window.location.port === '8080' ? 'http://localhost:8000/api' : '/api';

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
    
    const res = await fetch(`${API}${path}`, { ...options, headers });
    if (res.status === 401) { this.clearAuth(); window.location.hash = '#login'; return null; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Request failed');
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
    if (!res.ok) { const err = await res.json().catch(() => ({ detail: 'Upload failed' })); throw new Error(err.detail); }
    return res.json();
  }

  // Auth
  login(email, password) { return this.post('/auth/login', { email, password }); }
  register(data) { return this.post('/auth/register', data); }
}

const api = new ApiService();
