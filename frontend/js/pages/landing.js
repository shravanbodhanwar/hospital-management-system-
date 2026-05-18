function renderLanding() {
  return `<div class="landing">
    <nav class="landing-nav">
      <div class="logo"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> SmartHospital</div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#portals">Portals</a>
        <a href="#" onclick="showAuthModal('login')">Login</a>
        <button class="btn btn-primary btn-sm" onclick="showAuthModal('register')">Get Started</button>
      </div>
    </nav>
    <section class="hero">
      <div class="hero-badge">🌱 AI-Powered Sustainability</div>
      <h1>Smart Healthcare for a <span>Sustainable</span> Future</h1>
      <p>Unified AI-powered platform combining hospital management, pharmacy operations, patient risk analysis, and sustainability monitoring — all in one intelligent ecosystem.</p>
      <div class="hero-btns">
        <button class="btn btn-primary" onclick="showAuthModal('register')">🚀 Start Free</button>
        <button class="btn btn-outline" onclick="showAuthModal('login')">Sign In →</button>
      </div>
    </section>
    <section class="features" id="features">
      <div class="feature-card"><div class="feature-icon" style="background:var(--accent-teal-dim);color:var(--accent-teal)">🧠</div><h3>AI Health Risk Analysis</h3><p>ML-powered disease risk prediction with personalized specialist recommendations and plain-language health explanations.</p></div>
      <div class="feature-card"><div class="feature-icon" style="background:var(--accent-blue-dim);color:var(--accent-blue)">👨‍⚕️</div><h3>Smart Doctor Matching</h3><p>Intelligent doctor recommendation engine ranking specialists by relevance, rating, experience, and availability.</p></div>
      <div class="feature-card"><div class="feature-icon" style="background:var(--accent-emerald-dim);color:var(--accent-emerald)">💊</div><h3>Pharmacy Intelligence</h3><p>Automated inventory management with demand forecasting, expiry tracking, and eco-friendly alternatives.</p></div>
      <div class="feature-card"><div class="feature-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">🌱</div><h3>Carbon Footprint Tracking</h3><p>Monitor and reduce hospital emissions with ML-powered sustainability predictions and optimization strategies.</p></div>
      <div class="feature-card"><div class="feature-icon" style="background:var(--accent-amber-dim);color:var(--accent-amber)">📊</div><h3>Generative AI Reports</h3><p>Auto-generated health summaries, sustainability reports, and administrative briefings powered by Gen AI.</p></div>
      <div class="feature-card"><div class="feature-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">🔒</div><h3>Role-Based Security</h3><p>JWT-secured multi-role authentication with dedicated portals for patients, doctors, pharmacists, and admins.</p></div>
    </section>
    <section class="portals" id="portals">
      <h2>Choose Your Portal</h2>
      <div class="portal-grid">
        <div class="portal-card" onclick="showAuthModal('login','patient')">
          <div class="portal-icon" style="background:var(--accent-teal-dim);color:var(--accent-teal)">🏥</div>
          <h3>Patient Portal</h3><p>Upload reports, book appointments, get AI health analysis</p>
          <button class="btn btn-primary btn-sm">Access Portal →</button>
        </div>
        <div class="portal-card" onclick="showAuthModal('login','doctor')">
          <div class="portal-icon" style="background:var(--accent-blue-dim);color:var(--accent-blue)">👨‍⚕️</div>
          <h3>Doctor Portal</h3><p>Manage patients, prescriptions, and risk alerts</p>
          <button class="btn btn-primary btn-sm" style="background:var(--gradient-blue)">Access Portal →</button>
        </div>
        <div class="portal-card" onclick="showAuthModal('login','pharmacist')">
          <div class="portal-icon" style="background:var(--accent-emerald-dim);color:var(--accent-emerald)">💊</div>
          <h3>Pharmacist Portal</h3><p>Inventory management, demand forecasting, dispensing</p>
          <button class="btn btn-primary btn-sm" style="background:var(--gradient-emerald)">Access Portal →</button>
        </div>
        <div class="portal-card" onclick="showAuthModal('login','receptionist')">
          <div class="portal-icon" style="background:rgba(232,121,90,0.12);color:#e8795a">🏥</div>
          <h3>Receptionist Portal</h3><p>Patient registration, doctor assignment, appointments</p>
          <button class="btn btn-primary btn-sm" style="background:linear-gradient(135deg,#e8795a,#f59e0b)">Access Portal →</button>
        </div>
        <div class="portal-card" onclick="showAuthModal('login','admin')">
          <div class="portal-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">⚙️</div>
          <h3>Admin Portal</h3><p>Platform analytics, sustainability, user management</p>
          <button class="btn btn-primary btn-sm" style="background:var(--gradient-purple)">Access Portal →</button>
        </div>
      </div>
    </section>
    <footer style="text-align:center;padding:40px;color:var(--text-muted);font-size:0.85rem;border-top:1px solid var(--border-glass)">
      <p>© 2026 SmartHospital AI Platform — Built for HackWithMumbai</p>
    </footer>
  </div>`;
}
