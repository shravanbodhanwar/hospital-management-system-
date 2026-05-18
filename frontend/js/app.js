// ===== Main Application Router =====
const SIDEBAR_CONFIG = {
  patient: [
    { id: 'patient-dashboard', icon: '🏠', label: 'Dashboard', render: renderPatientDashboard },
    { id: 'upload-report', icon: '📤', label: 'Upload Report', render: renderUploadReport, post: loadReports },
    { id: 'health-risk', icon: '🧠', label: 'Health Analysis', render: renderHealthRisk },
    { id: 'appointments', icon: '📅', label: 'Appointments', render: renderAppointments },
    { id: 'doctor-recs', icon: '👨‍⚕️', label: 'Find Doctor', render: renderDoctorRecs },
    { id: 'prescriptions', icon: '💊', label: 'Prescriptions', render: renderPrescriptions },
  ],
  doctor: [
    { id: 'doc-dashboard', icon: '🏠', label: 'Dashboard', render: renderDoctorDashboard },
    { id: 'doc-patients', icon: '👥', label: 'My Patients', render: renderDocPatients },
    { id: 'doc-appointments', icon: '📅', label: 'Appointments', render: renderDocAppointments },
    { id: 'doc-prescribe', icon: '📝', label: 'Write Prescription', render: renderDocPrescribe },
  ],
  pharmacist: [
    { id: 'pharma-dashboard', icon: '🏠', label: 'Dashboard', render: renderPharmacyDashboard },
    { id: 'inventory', icon: '📦', label: 'Inventory', render: renderInventory },
    { id: 'pharma-prescriptions', icon: '📋', label: 'Prescriptions', render: renderPharmaPrescriptions },
    { id: 'pharma-billing', icon: '🧾', label: 'Billing', render: renderPharmaBilling },
    { id: 'pharma-bills-list', icon: '💰', label: 'Bill History', render: renderBillHistory },
    { id: 'demand-forecast', icon: '📊', label: 'Demand Forecast', render: renderDemandForecast },
  ],
  admin: [
    { id: 'admin-dashboard', icon: '🏠', label: 'Dashboard', render: renderAdminDashboard },
    { id: 'admin-users', icon: '👥', label: 'Users', render: renderAdminUsers },
    { id: 'admin-analytics', icon: '📊', label: 'Analytics', render: renderAdminAnalytics },
    { id: 'admin-bills', icon: '🧾', label: 'Upload Bills', render: renderAdminBills },
    { id: 'admin-budget', icon: '💰', label: 'AI Budget', render: renderAdminBudget },
    { id: 'admin-sustainability', icon: '🌱', label: 'Sustainability', render: renderSustainability },
    { id: 'admin-sust-input', icon: '📝', label: 'Log Data', render: renderSustInput },
    { id: 'admin-report', icon: '📄', label: 'AI Report', render: renderSustReport },
  ],
  receptionist: [
    { id: 'rec-dashboard', icon: '🏠', label: 'Dashboard', render: renderReceptionistDashboard },
    { id: 'rec-register', icon: '👤', label: 'Register Patient', render: renderRecRegister },
    { id: 'rec-book', icon: '📅', label: 'Book Appointment', render: renderRecBook },
    { id: 'rec-patients', icon: '👥', label: 'All Patients', render: renderRecPatients },
    { id: 'rec-appointments', icon: '📋', label: 'Appointments', render: renderRecAppointments },
  ]
};

const ROLE_COLORS = { patient: 'var(--accent-teal)', doctor: 'var(--accent-blue)', pharmacist: 'var(--accent-emerald)', receptionist: '#e8795a', admin: 'var(--accent-purple)' };
const ROLE_GRADIENTS = { patient: 'var(--gradient-teal)', doctor: 'var(--gradient-blue)', pharmacist: 'var(--gradient-emerald)', receptionist: 'linear-gradient(135deg, #e8795a, #f59e0b)', admin: 'var(--gradient-purple)' };

let currentPage = '';

function navigateTo(pageId) {
  currentPage = pageId;
  const role = api.getRole();
  const pages = SIDEBAR_CONFIG[role] || [];
  const page = pages.find(p => p.id === pageId);
  if (!page) return;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
  const activeLink = document.querySelector(`[data-page="${pageId}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Render page
  const content = document.getElementById('app-content');
  const result = page.render();
  if (result instanceof Promise) {
    content.innerHTML = '<div class="spinner"></div>';
    result.then(html => {
      content.innerHTML = html || '<div class="card"><div class="card-body"><p>Could not load page.</p></div></div>';
      if (page.post) page.post();
    }).catch(err => {
      content.innerHTML = `<div class="card"><div class="card-body">
        <h3 style="color:var(--accent-red)">Failed to load</h3>
        <p style="margin:12px 0;color:var(--text-muted)">${err.message}</p>
        <button class="btn btn-outline" onclick="navigateTo('${pageId}')">Retry</button>
      </div></div>`;
    });
  } else {
    content.innerHTML = result;
    if (page.post) setTimeout(page.post, 100);
  }
}

function renderDashboard() {
  const role = api.getRole();
  const pages = SIDEBAR_CONFIG[role] || [];
  const user = api.user;
  const color = ROLE_COLORS[role] || 'var(--accent-teal)';

  const sidebar = `<aside class="sidebar">
    <div class="sidebar-logo"><div class="logo"><svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:var(--accent-teal)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> SmartHospital</div></div>
    <nav class="sidebar-nav">
      ${pages.map(p => `<button class="sidebar-link" data-page="${p.id}" onclick="navigateTo('${p.id}')"><span class="icon">${p.icon}</span>${p.label}</button>`).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar" style="background:${color}">${(user?.full_name||'U')[0]}</div>
        <div class="sidebar-user-info"><div class="name">${user?.full_name||'User'}</div><div class="role">${role}</div></div>
      </div>
      <button class="sidebar-link" onclick="logout()" style="color:var(--accent-red)"><span class="icon">🚪</span>Logout</button>
    </div>
  </aside>`;

  document.getElementById('app').innerHTML = `<div class="dashboard">${sidebar}<main class="main-content" id="app-content"><div class="spinner"></div></main></div>
    <button class="chatbot-toggle" onclick="toggleChatbot()">💬</button>
    <div class="chatbot-panel" id="chatbotPanel">
      <div class="chatbot-header"><span>🤖 AI Assistant</span><button onclick="toggleChatbot()" style="background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer">✕</button></div>
      <div class="chatbot-messages" id="chatMessages"><div class="chat-msg bot">Hello! 👋 I'm your Smart Hospital AI Assistant. How can I help you today?</div></div>
      <div class="chatbot-input"><input type="text" id="chatInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendChat()"><button onclick="sendChat()">Send</button></div>
    </div>
    <div class="modal-overlay" id="dynamicModal" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative"></div></div>`;

  // Navigate to first page
  navigateTo(pages[0]?.id);
}

function toggleChatbot() {
  document.getElementById('chatbotPanel').classList.toggle('open');
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  const messages = document.getElementById('chatMessages');
  messages.innerHTML += `<div class="chat-msg user">${msg}</div>`;
  messages.scrollTop = messages.scrollHeight;
  try {
    const data = await api.post('/chatbot', { message: msg });
    messages.innerHTML += `<div class="chat-msg bot ai-text">${renderMarkdown(data.response)}</div>`;
  } catch {
    messages.innerHTML += `<div class="chat-msg bot" style="color:var(--accent-red)">Sorry, I couldn't process that request.</div>`;
  }
  messages.scrollTop = messages.scrollHeight;
}

function closeModal() {
  document.getElementById('dynamicModal')?.classList.remove('active');
}

// ===== Auth Modal =====
function showAuthModal(mode = 'login', prefillRole = '') {
  const existing = document.getElementById('authModal');
  if (existing) existing.remove();

  const isLogin = mode === 'login';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'authModal';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `<div class="modal" style="position:relative">
    <button class="modal-close" onclick="document.getElementById('authModal').remove()">✕</button>
    <h2>${isLogin ? 'Welcome Back' : 'Create Account'}</h2>
    <p class="subtitle">${isLogin ? 'Sign in to your portal' : 'Join Smart Hospital Platform'}</p>
    <form onsubmit="handleAuth(event, '${mode}')">
      ${!isLogin ? '<div class="form-group"><label>Full Name</label><input type="text" id="authName" required placeholder="Dr. John Doe"></div>' : ''}
      <div class="form-group"><label>Email</label><input type="email" id="authEmail" required placeholder="you@example.com" value="${isLogin && prefillRole ? prefillRole+'@demo.com' : ''}"></div>
      <div class="form-group"><label>Password</label><input type="password" id="authPassword" required placeholder="••••••••" value="${isLogin ? 'password123' : ''}"></div>
      ${!isLogin ? `<div class="form-group"><label>Role</label><select id="authRole"><option value="patient" ${prefillRole==='patient'?'selected':''}>Patient</option><option value="doctor" ${prefillRole==='doctor'?'selected':''}>Doctor</option><option value="pharmacist" ${prefillRole==='pharmacist'?'selected':''}>Pharmacist</option><option value="receptionist" ${prefillRole==='receptionist'?'selected':''}>Receptionist</option><option value="admin" ${prefillRole==='admin'?'selected':''}>Admin</option></select></div>` : ''}
      <button class="btn btn-primary" type="submit" style="width:100%;margin-top:8px">${isLogin ? 'Sign In' : 'Create Account'}</button>
    </form>
    <div class="form-footer" style="margin-top:16px;text-align:center">
      <a href="#" onclick="document.getElementById('authModal').remove();showAuthModal('${isLogin?'register':'login'}')">${isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}</a>
    </div>
    ${isLogin ? '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border-glass)"><p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">Demo Accounts (password: password123):</p><div style="display:flex;flex-wrap:wrap;gap:6px"><button class="btn btn-sm btn-outline" onclick="fillDemo(\'patient@demo.com\')">Patient</button><button class="btn btn-sm btn-outline" onclick="fillDemo(\'doctor@demo.com\')">Doctor</button><button class="btn btn-sm btn-outline" onclick="fillDemo(\'pharmacist@demo.com\')">Pharmacist</button><button class="btn btn-sm btn-outline" onclick="fillDemo(\'receptionist@demo.com\')">Receptionist</button><button class="btn btn-sm btn-outline" onclick="fillDemo(\'admin@demo.com\')">Admin</button></div></div>' : ''}
  </div>`;
  document.body.appendChild(modal);
}

function fillDemo(email) {
  document.getElementById('authEmail').value = email;
  document.getElementById('authPassword').value = 'password123';
}

async function handleAuth(e, mode) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  try {
    let data;
    if (mode === 'login') {
      data = await api.login(email, password);
    } else {
      data = await api.register({
        email, password,
        full_name: document.getElementById('authName').value,
        role: document.getElementById('authRole').value,
      });
    }
    api.setAuth(data.access_token, data.user);
    document.getElementById('authModal')?.remove();
    showToast(`Welcome, ${data.user.full_name}!`);
    renderDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  api.clearAuth();
  showToast('Logged out successfully');
  initApp();
}

// ===== App Init =====
function initApp() {
  try {
    const app = document.getElementById('app');
    if (!app) return;
    if (api.isLoggedIn()) {
      renderDashboard();
    } else {
      app.innerHTML = renderLanding();
    }
  } catch (e) {
    console.error('initApp failed:', e);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `<div class="card" style="max-width:480px;margin:80px auto;padding:24px">
        <h2 style="color:var(--accent-red)">App failed to load</h2>
        <p style="margin-top:12px;color:var(--text-muted)">${e.message}</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="location.reload()">Reload</button>
      </div>`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
