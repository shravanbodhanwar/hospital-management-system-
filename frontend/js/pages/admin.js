// Chart helper — destroys old chart if exists
function makeChart(id, config) {
  const existing = Chart.getChart(id);
  if (existing) existing.destroy();
  return new Chart(document.getElementById(id), config);
}

// ===== Admin Dashboard =====
async function renderAdminDashboard() {
  const data = await api.get('/admin/dashboard');
  if (!data) return '<div class="spinner"></div>';
  const s = data.stats; const sust = data.latest_sustainability;
  return `<div class="page-header"><h1>Admin Dashboard ⚙️</h1><p>Platform overview and management</p></div>
    <div class="stats-grid">
      ${statCard('👥','Total Users', s.total_users, '#3b82f6')}
      ${statCard('🏥','Patients', s.patients, '#14b8a6')}
      ${statCard('👨‍⚕️','Doctors', s.doctors, '#8b5cf6')}
      ${statCard('💊','Medicines', s.total_medicines, '#10b981')}
    </div>
    <div class="stats-grid">
      ${statCard('📅','Appointments', s.total_appointments, '#f59e0b')}
      ${statCard('📝','Prescriptions', s.total_prescriptions, '#6366f1')}
      ${statCard('💰','Pharmacy Revenue', '₹'+(s.pharmacy_revenue||0).toLocaleString(), '#10b981')}
      ${statCard('🧾','Hospital Expenses', '₹'+(s.hospital_expenses||0).toLocaleString(), '#ef4444')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>⚡ Quick Actions</h3></div><div class="card-body" style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" onclick="navigateTo('admin-analytics')" style="width:100%;background:var(--gradient-blue)">📊 Analytics & Charts</button>
        <button class="btn btn-outline" onclick="navigateTo('admin-bills')" style="width:100%">🧾 Upload Hospital Bills</button>
        <button class="btn btn-outline" onclick="navigateTo('admin-budget')" style="width:100%">💰 AI Budget Analysis</button>
        <button class="btn btn-outline" onclick="navigateTo('admin-sustainability')" style="width:100%">🌱 Sustainability</button>
        <button class="btn btn-outline" onclick="navigateTo('admin-users')" style="width:100%">👥 Manage Users</button>
      </div></div>
      <div class="card"><div class="card-header"><h3>🌱 Latest Sustainability</h3></div><div class="card-body">
        ${sust ? `
        <div style="margin-bottom:12px"><span style="font-size:0.85rem">⚡ Electricity: <strong>${sust.electricity_kwh} kWh</strong></span><div class="risk-bar"><div class="risk-bar-fill" style="width:${Math.min(sust.electricity_kwh/10,100)}%;background:var(--accent-amber)"></div></div></div>
        <div style="margin-bottom:12px"><span style="font-size:0.85rem">🌍 Carbon: <strong>${sust.carbon_footprint_kg} kg CO₂</strong></span><div class="risk-bar"><div class="risk-bar-fill" style="width:${Math.min(sust.carbon_footprint_kg/5,100)}%;background:var(--accent-emerald)"></div></div></div>
        <div><span style="font-size:0.85rem">⭐ Efficiency: <strong>${sust.efficiency_score}/100</strong></span><div class="risk-bar"><div class="risk-bar-fill" style="width:${sust.efficiency_score}%;background:var(--accent-teal)"></div></div></div>
        ` : '<p style="color:var(--text-muted)">No sustainability data yet.</p>'}
      </div></div>
    </div>`;
}

// ===== User Management =====
async function renderAdminUsers() {
  let html = `<div class="page-header"><h1>👥 User Management</h1><p>All registered platform users</p></div>`;
  try {
    const users = await api.get('/admin/users');
    const roleColor = { patient:'badge-info', doctor:'badge-purple', pharmacist:'badge-success', receptionist:'badge-warning', admin:'badge-danger' };
    html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th></tr></thead><tbody>
      ${users.map(u=>`<tr><td>${u.id}</td><td><strong>${u.full_name}</strong></td><td>${u.email}</td><td><span class="badge ${roleColor[u.role]||'badge-info'}">${u.role.toUpperCase()}</span></td><td>${u.phone||'—'}</td><td>${formatDate(u.created_at)}</td></tr>`).join('')}
    </tbody></table></div></div></div>`;
  } catch { html += '<p>Failed.</p>'; }
  return html;
}

// ===== Analytics with Charts =====
async function renderAdminAnalytics() {
  let html = `<div class="page-header"><h1>📊 Platform Analytics</h1><p>Interactive charts and key metrics</p></div>`;
  try {
    const data = await api.get('/admin/analytics');
    html += `
    <div class="grid-2" style="margin-bottom:20px">
      <div class="card"><div class="card-header"><h3>🎯 Patient Risk Distribution</h3></div><div class="card-body" style="height:260px;display:flex;align-items:center;justify-content:center"><canvas id="riskChart"></canvas></div></div>
      <div class="card"><div class="card-header"><h3>📅 Appointment Status</h3></div><div class="card-body" style="height:260px;display:flex;align-items:center;justify-content:center"><canvas id="aptChart"></canvas></div></div>
    </div>
    <div class="grid-2" style="margin-bottom:20px">
      <div class="card"><div class="card-header"><h3>💊 Medicine Categories</h3></div><div class="card-body" style="height:260px;display:flex;align-items:center;justify-content:center"><canvas id="medChart"></canvas></div></div>
      <div class="card"><div class="card-header"><h3>🌍 CO₂ Trend (Last 7 Days)</h3></div><div class="card-body" style="height:260px;display:flex;align-items:center;justify-content:center"><canvas id="co2Chart"></canvas></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>💰 Monthly Revenue vs Expenses</h3></div><div class="card-body" style="height:280px"><canvas id="finChart"></canvas></div></div>`;

    setTimeout(() => {
      // Risk Donut
      const riskLabels = Object.keys(data.risk_distribution||{});
      const riskVals = Object.values(data.risk_distribution||{});
      if (riskLabels.length) makeChart('riskChart', { type:'doughnut', data:{ labels:riskLabels.map(l=>l.toUpperCase()), datasets:[{data:riskVals, backgroundColor:['#10b981','#f59e0b','#ef4444','#7c3aed'], borderWidth:2, borderColor:'#fff'}]}, options:{responsive:true, plugins:{legend:{position:'bottom'}}}});

      // Appointment bar
      const aptLabels = Object.keys(data.appointment_distribution||{});
      const aptVals = Object.values(data.appointment_distribution||{});
      if (aptLabels.length) makeChart('aptChart', { type:'bar', data:{ labels:aptLabels.map(l=>l.toUpperCase()), datasets:[{label:'Appointments', data:aptVals, backgroundColor:['#f59e0b','#10b981','#3b82f6','#ef4444'], borderRadius:8}]}, options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});

      // Medicine categories horizontal bar
      const medCats = data.medicine_categories||[];
      if (medCats.length) makeChart('medChart', { type:'bar', data:{ labels:medCats.map(c=>c.category), datasets:[{label:'Stock', data:medCats.map(c=>c.stock), backgroundColor:'rgba(59,130,246,0.7)', borderRadius:6},{label:'Types', data:medCats.map(c=>c.count), backgroundColor:'rgba(16,185,129,0.7)', borderRadius:6}]}, options:{responsive:true, indexAxis:'y', plugins:{legend:{position:'bottom'}}, scales:{x:{beginAtZero:true}}}});

      // CO2 line
      const sust = (data.sustainability_trend||[]).reverse();
      if (sust.length) makeChart('co2Chart', { type:'line', data:{ labels:sust.map(s=>s.date), datasets:[{label:'CO₂ (kg)', data:sust.map(s=>s.carbon_footprint_kg), borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', fill:true, tension:0.4, pointBackgroundColor:'#10b981'},{label:'Electricity (kWh)', data:sust.map(s=>s.electricity_kwh), borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.05)', fill:false, tension:0.4, pointBackgroundColor:'#f59e0b'}]}, options:{responsive:true, plugins:{legend:{position:'bottom'}}, scales:{y:{beginAtZero:true}}}});

      // Revenue vs Expenses line
      const allMonths = Array.from(new Set([...Object.keys(data.monthly_revenue||{}), ...Object.keys(data.monthly_expenses||{})])).sort();
      if (allMonths.length) makeChart('finChart', { type:'bar', data:{ labels:allMonths, datasets:[{label:'Pharmacy Revenue (₹)', data:allMonths.map(m=>(data.monthly_revenue||{})[m]||0), backgroundColor:'rgba(16,185,129,0.7)', borderRadius:6},{label:'Hospital Expenses (₹)', data:allMonths.map(m=>(data.monthly_expenses||{})[m]||0), backgroundColor:'rgba(239,68,68,0.7)', borderRadius:6}]}, options:{responsive:true, plugins:{legend:{position:'bottom'}}, scales:{y:{beginAtZero:true}}}});
    }, 100);
  } catch(err) { html += `<p style="color:var(--accent-red)">${err.message}</p>`; }
  return html;
}

// ===== Upload Hospital Bills =====
async function renderAdminBills() {
  let billsHtml = '';
  try {
    const bills = await api.get('/admin/bills');
    billsHtml = bills.length ? `<div class="card" style="margin-top:20px"><div class="card-header"><h3>📋 Uploaded Bills</h3></div><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Type</th><th>Vendor</th><th>Amount</th><th>Month</th><th>Description</th><th>Uploaded</th></tr></thead><tbody>
      ${bills.map(b=>`<tr><td><span class="badge badge-info">${b.bill_type}</span></td><td>${b.vendor_name||'—'}</td><td style="font-weight:700;color:var(--accent-red)">₹${b.amount.toLocaleString()}</td><td>${b.month}</td><td>${b.description||'—'}</td><td>${formatDate(b.uploaded_at)}</td></tr>`).join('')}
    </tbody></table></div></div></div>` : '';
  } catch {}

  const curMonth = new Date().toISOString().slice(0,7);
  return `<div class="page-header"><h1>🧾 Upload Hospital Bills</h1><p>Track hospital expenses for AI budget analysis</p></div>
    <div class="card"><div class="card-body">
      <div class="form-row">
        <div class="form-group"><label>Bill Type *</label><select id="hbType"><option>Equipment</option><option>Utilities</option><option>Salary</option><option>Medicines Supply</option><option>Maintenance</option><option>IT Infrastructure</option><option>Cleaning</option><option>General</option></select></div>
        <div class="form-group"><label>Vendor / Supplier</label><input type="text" id="hbVendor" placeholder="Vendor name"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Amount (₹) *</label><input type="number" id="hbAmount" placeholder="25000" step="0.01"></div>
        <div class="form-group"><label>Month</label><input type="month" id="hbMonth" value="${curMonth}"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea id="hbDesc" placeholder="Invoice details, PO number..."></textarea></div>
      <div class="form-group"><label>File Name (if uploading physical copy)</label><input type="text" id="hbFile" placeholder="invoice_may2026.pdf"></div>
      <button class="btn btn-primary" onclick="submitHospitalBill()" style="width:100%;margin-top:8px">📤 Upload Bill</button>
      <div id="hbResult" style="margin-top:12px"></div>
    </div></div>
    ${billsHtml}`;
}

async function submitHospitalBill() {
  const amount = parseFloat(document.getElementById('hbAmount').value);
  if (!amount) return showToast('Please enter an amount', 'error');
  try {
    await api.post('/admin/bills', {
      bill_type: document.getElementById('hbType').value,
      vendor_name: document.getElementById('hbVendor').value,
      amount, month: document.getElementById('hbMonth').value,
      description: document.getElementById('hbDesc').value,
      file_name: document.getElementById('hbFile').value,
    });
    showToast('Bill uploaded!');
    document.getElementById('hbResult').innerHTML = `<div class="card" style="border-color:rgba(16,185,129,0.3)"><div class="card-body"><h3>✅ Bill recorded — ₹${amount.toLocaleString()}</h3></div></div>`;
    setTimeout(() => navigateTo('admin-bills'), 1500);
  } catch(err) { showToast(err.message,'error'); }
}

// ===== AI Budget Analysis =====
async function renderAdminBudget() {
  let html = `<div class="page-header"><h1>💰 AI Budget Analysis</h1><p>Monthly spending analysis and next-month predictions</p></div><div class="spinner"></div>`;
  setTimeout(async () => {
    try {
      const data = await api.get('/admin/budget/analysis');
      const months = Object.keys(data.monthly_totals||{}).sort();
      let chartHtml = months.length ? `<div class="card" style="margin-bottom:20px"><div class="card-header"><h3>📊 Expense Breakdown by Month & Category</h3></div><div class="card-body" style="height:300px"><canvas id="budgetChart"></canvas></div></div>` : '';

      const content = document.getElementById('app-content');
      content.innerHTML = `<div class="page-header"><h1>💰 AI Budget Analysis</h1><p>Monthly spending analysis and next-month predictions</p></div>
        ${chartHtml}
        <div class="card" style="margin-bottom:20px"><div class="card-header"><h3>📅 Monthly Totals</h3></div><div class="card-body">
          ${months.length ? `<div class="table-wrap"><table><thead><tr><th>Month</th><th>Total Expenses</th><th>Pharmacy Revenue</th><th>Net</th></tr></thead><tbody>
            ${months.map(m=>{const exp=(data.monthly_totals||{})[m]||0;const rev=(data.monthly_revenue||{})[m]||0;const net=rev-exp;return`<tr><td><strong>${m}</strong></td><td style="color:var(--accent-red)">₹${exp.toLocaleString()}</td><td style="color:var(--accent-emerald)">₹${rev.toLocaleString()}</td><td style="font-weight:700;color:${net>=0?'var(--accent-emerald)':'var(--accent-red)'}">${net>=0?'+':''}₹${net.toLocaleString()}</td></tr>`}).join('')}
          </tbody></table></div>` : '<p style="color:var(--text-muted)">No expense data yet. Upload bills to enable analysis.</p>'}
        </div></div>
        <div class="grid-2">
          <div class="card"><div class="card-header"><h3>🤖 AI Analysis & Predictions</h3></div><div class="card-body ai-text" style="white-space:pre-wrap;line-height:1.8">${renderMarkdown(data.ai_analysis||'No analysis available.')}</div></div>
          <div class="card"><div class="card-header"><h3>🌍 CO₂ Forecast</h3></div><div class="card-body">
            <p style="margin-bottom:12px"><strong>Monthly Carbon Est:</strong> ${(data.co2_forecast?.predicted_monthly_carbon_kg||0).toFixed(0)} kg CO₂</p>
            <p style="margin-bottom:12px"><strong>Trend:</strong> <span class="badge ${data.co2_forecast?.trend==='improving'?'badge-success':data.co2_forecast?.trend==='worsening'?'badge-danger':'badge-warning'}">${(data.co2_forecast?.trend||'N/A').toUpperCase()}</span></p>
            <p style="margin-bottom:8px"><strong>Efficiency:</strong> ${data.co2_forecast?.efficiency_score||0}/100</p>
            <div class="risk-bar"><div class="risk-bar-fill" style="width:${data.co2_forecast?.efficiency_score||0}%;background:var(--accent-emerald)"></div></div>
            <div style="margin-top:16px">${(data.co2_forecast?.suggestions||[]).slice(0,3).map(s=>`<div class="alert-item"><div class="alert-dot" style="background:${s.priority==='high'?'var(--accent-red)':s.priority==='medium'?'var(--accent-amber)':'var(--accent-emerald)'}"></div><div><strong>${s.area}</strong><br><span style="font-size:0.8rem;color:var(--text-secondary)">${s.action}</span></div></div>`).join('')}</div>
          </div></div>
        </div>`;

      // Budget chart
      if (months.length) {
        const categories = Array.from(new Set(Object.values(data.monthly_expenses||{}).flatMap(c=>Object.keys(c))));
        const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#e8795a','#06b6d4','#a78bfa'];
        setTimeout(() => {
          makeChart('budgetChart', { type:'bar', data:{ labels:months, datasets:categories.map((cat,i)=>({ label:cat, data:months.map(m=>(data.monthly_expenses[m]||{})[cat]||0), backgroundColor:colors[i%colors.length], borderRadius:4 }))}, options:{ responsive:true, plugins:{legend:{position:'bottom'}}, scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}});
        }, 100);
      }
    } catch(err) { document.getElementById('app-content').innerHTML = `<div class="page-header"><h1>💰 AI Budget Analysis</h1></div><p style="color:var(--accent-red)">${err.message}</p>`; }
  }, 100);
  return html;
}

// ===== Sustainability =====
async function renderSustainability() {
  let html = `<div class="page-header"><h1>🌱 Sustainability Dashboard</h1><p>Environmental impact monitoring</p></div>`;
  try {
    const metrics = await api.get('/admin/sustainability');
    const forecast = await api.get('/admin/sustainability/forecast');
    const latest = metrics[0] || {};
    html += `<div class="stats-grid">
      ${statCard('⚡','Electricity', (latest.electricity_kwh||0).toFixed(0)+' kWh', '#f59e0b')}
      ${statCard('💧','Water', (latest.water_liters||0).toFixed(0)+' L', '#3b82f6')}
      ${statCard('🗑️','Waste', (latest.waste_kg||0).toFixed(0)+' kg', '#ef4444')}
      ${statCard('🌍','Carbon', (latest.carbon_footprint_kg||0).toFixed(0)+' kg CO₂', '#10b981')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>📊 ML Forecast</h3></div><div class="card-body">
        <p style="margin-bottom:12px"><strong>Monthly Carbon:</strong> ${forecast.predicted_monthly_carbon_kg||0} kg CO₂</p>
        <p style="margin-bottom:12px"><strong>Trend:</strong> <span class="badge ${forecast.trend==='improving'?'badge-success':forecast.trend==='worsening'?'badge-danger':'badge-warning'}">${(forecast.trend||'N/A').toUpperCase()}</span></p>
        <p><strong>Efficiency:</strong> ${forecast.efficiency_score||0}/100</p>
        <div class="risk-bar" style="margin-top:8px"><div class="risk-bar-fill" style="width:${forecast.efficiency_score||0}%;background:var(--accent-emerald)"></div></div>
      </div></div>
      <div class="card"><div class="card-header"><h3>💡 AI Suggestions</h3></div><div class="card-body">
        ${(forecast.suggestions||[]).map(s=>`<div class="alert-item"><div class="alert-dot" style="background:${s.priority==='high'?'var(--accent-red)':s.priority==='medium'?'var(--accent-amber)':'var(--accent-emerald)'}"></div><div><strong>${s.area||''}</strong><br><span style="font-size:0.8rem;color:var(--text-secondary)">${s.action||''}</span><br><span style="font-size:0.75rem;color:var(--accent-teal)">${s.potential_saving||''}</span></div></div>`).join('')}
      </div></div>
    </div>`;
    if (metrics.length > 1) {
      html += `<div class="card" style="margin-top:20px"><div class="card-header"><h3>📅 Historical Data</h3></div><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Electricity</th><th>Water</th><th>Waste</th><th>Occupancy</th><th>Carbon</th></tr></thead><tbody>${metrics.slice(0,10).map(m=>`<tr><td>${m.date}</td><td>${m.electricity_kwh} kWh</td><td>${m.water_liters} L</td><td>${m.waste_kg} kg</td><td>${m.ward_occupancy_pct}%</td><td>${m.carbon_footprint_kg} kg</td></tr>`).join('')}</tbody></table></div></div></div>`;
    }
  } catch(err) { html += `<p style="color:var(--accent-red)">${err.message}</p>`; }
  return html;
}

// ===== Log Sustainability Data =====
function renderSustInput() {
  const today = new Date().toISOString().split('T')[0];
  return `<div class="page-header"><h1>📝 Log Sustainability Data</h1><p>Daily operational metrics</p></div>
    <div class="card"><div class="card-body">
      <div class="form-group"><label>Date</label><input type="date" id="sustDate" value="${today}"></div>
      <div class="form-row"><div class="form-group"><label>Electricity (kWh)</label><input type="number" id="sustElec" step="0.1" value="550"></div><div class="form-group"><label>Water (Liters)</label><input type="number" id="sustWater" step="0.1" value="2200"></div></div>
      <div class="form-row"><div class="form-group"><label>General Waste (kg)</label><input type="number" id="sustWaste" step="0.1" value="45"></div><div class="form-group"><label>Medical Waste (kg)</label><input type="number" id="sustMedWaste" step="0.1" value="12"></div></div>
      <div class="form-row"><div class="form-group"><label>Paper Sheets</label><input type="number" id="sustPaper" value="250"></div><div class="form-group"><label>Ward Occupancy (%)</label><input type="number" id="sustOccupancy" step="0.1" value="72"></div></div>
      <div class="form-group"><label>Equipment Utilization (%)</label><input type="number" id="sustEquip" step="0.1" value="78"></div>
      <div class="form-group"><label>Notes</label><textarea id="sustNotes" placeholder="Any observations..."></textarea></div>
      <button class="btn btn-primary" onclick="submitSustainability()" style="width:100%">📊 Log Data & Calculate Carbon</button>
      <div id="sustResult" style="margin-top:16px"></div>
    </div></div>`;
}

async function submitSustainability() {
  try {
    const result = await api.post('/admin/sustainability', { date: document.getElementById('sustDate').value, electricity_kwh: +document.getElementById('sustElec').value, water_liters: +document.getElementById('sustWater').value, waste_kg: +document.getElementById('sustWaste').value, medical_waste_kg: +document.getElementById('sustMedWaste').value, paper_sheets: +document.getElementById('sustPaper').value, ward_occupancy_pct: +document.getElementById('sustOccupancy').value, equipment_utilization_pct: +document.getElementById('sustEquip').value, notes: document.getElementById('sustNotes').value });
    document.getElementById('sustResult').innerHTML = `<div class="card" style="border-color:rgba(16,185,129,0.3)"><div class="card-body"><h3>✅ Data Logged</h3><p style="margin-top:8px">Carbon Footprint: <strong style="color:var(--accent-teal)">${result.carbon_footprint_kg} kg CO₂</strong></p></div></div>`;
    showToast('Sustainability data logged!');
  } catch(err) { showToast(err.message,'error'); }
}

// ===== AI Sustainability Report =====
async function renderSustReport() {
  let html = `<div class="page-header"><h1>📄 AI Sustainability Report</h1><p>Auto-generated environmental impact analysis</p></div>`;
  try {
    const data = await api.get('/admin/sustainability/report');
    html += `<div class="card"><div class="card-body ai-text" style="white-space:pre-wrap;line-height:1.8">${renderMarkdown(data.report)}</div></div>`;
  } catch { html += '<p>Failed to generate report.</p>'; }
  return html;
}
