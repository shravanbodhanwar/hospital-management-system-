// ===== Patient Dashboard =====
async function renderPatientDashboard() {
  const data = await api.get('/patients/dashboard');
  if (!data) return '<div class="spinner"></div>';
  const s = data.stats;
  const r = data.latest_risk;
  return `<div class="page-header"><h1>Welcome, ${data.user.name} 👋</h1><p>Your health dashboard at a glance</p></div>
    <div class="stats-grid">
      ${statCard('❤️','Health Score', s.health_score + '/100', '#14b8a6')}
      ${statCard('📋','Reports', s.total_reports, '#3b82f6')}
      ${statCard('📅','Appointments', s.pending_appointments, '#f59e0b', 'Pending')}
      ${statCard('💊','Prescriptions', s.total_prescriptions, '#8b5cf6')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>🎯 Health Risk Overview</h3></div><div class="card-body">
        ${r ? `<p style="margin-bottom:12px">Overall: ${riskBadge(r.risk_level)}</p>
        <div style="margin-bottom:10px"><span style="font-size:0.85rem">Diabetes</span><div class="risk-bar"><div class="risk-bar-fill" style="width:${r.diabetes_risk*100}%;background:${riskColor(r.diabetes_risk>0.4?'high':r.diabetes_risk>0.2?'moderate':'low')}"></div></div></div>
        <div style="margin-bottom:10px"><span style="font-size:0.85rem">Heart Disease</span><div class="risk-bar"><div class="risk-bar-fill" style="width:${r.heart_disease_risk*100}%;background:${riskColor(r.heart_disease_risk>0.4?'high':r.heart_disease_risk>0.2?'moderate':'low')}"></div></div></div>
        <div><span style="font-size:0.85rem">Hypertension</span><div class="risk-bar"><div class="risk-bar-fill" style="width:${r.hypertension_risk*100}%;background:${riskColor(r.hypertension_risk>0.4?'high':r.hypertension_risk>0.2?'moderate':'low')}"></div></div></div>
        ` : '<p style="color:var(--text-muted)">No risk assessment yet. Click "Health Analysis" to get started.</p>'}
      </div></div>
      <div class="card"><div class="card-header"><h3>⚡ Quick Actions</h3></div><div class="card-body" style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" onclick="navigateTo('upload-report')" style="width:100%">📤 Upload Medical Report</button>
        <button class="btn btn-outline" onclick="navigateTo('health-risk')" style="width:100%">🧠 Run Health Analysis</button>
        <button class="btn btn-outline" onclick="navigateTo('appointments')" style="width:100%">📅 Book Appointment</button>
        <button class="btn btn-outline" onclick="navigateTo('doctor-recs')" style="width:100%">👨‍⚕️ Find Doctor</button>
      </div></div>
    </div>`;
}

// ===== Upload Report =====
function renderUploadReport() {
  return `<div class="page-header"><h1>📤 Upload Medical Report</h1><p>Upload your reports for AI-powered analysis</p></div>
    <div class="card"><div class="card-body">
      <div class="form-group"><label>Report Type</label><select id="reportType">
        <option value="blood_report">Blood Report</option><option value="prescription">Prescription</option>
        <option value="scan">Medical Scan</option><option value="discharge">Discharge Summary</option>
        <option value="image_format">Image Format</option>
      </select></div>
      <div class="upload-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()">
        <div class="icon">📁</div><p>Click or drag file to upload</p><p style="font-size:0.8rem;margin-top:4px">PDF, JPG, PNG up to 10MB</p>
        <input type="file" id="fileInput" style="display:none" accept=".pdf,.jpg,.png,.jpeg,image/*" onchange="handleFileUpload(event)">
      </div>
      <div id="uploadResult" style="margin-top:20px"></div>
    </div></div>
    <div class="card" style="margin-top:20px"><div class="card-header"><h3>📋 Previous Reports</h3></div><div class="card-body"><div id="reportsList"><div class="spinner"></div></div></div></div>`;
}

async function handleFileUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('report_type', document.getElementById('reportType').value);
  document.getElementById('uploadResult').innerHTML = '<div class="spinner"></div>';
  try {
    const result = await api.upload('/patients/reports/upload', formData);
    document.getElementById('uploadResult').innerHTML = `<div class="card" style="border-color:rgba(20,184,166,0.3)"><div class="card-header"><h3>✅ AI Analysis Complete</h3></div><div class="card-body ai-text">${renderMarkdown(result.ai_summary)}</div></div>`;
    showToast('Report uploaded and analyzed!');
    loadReports();
  } catch (err) { showToast(err.message, 'error'); document.getElementById('uploadResult').innerHTML = ''; }
}

async function loadReports() {
  const el = document.getElementById('reportsList'); if (!el) return;
  try {
    const reports = await api.get('/patients/reports');
    el.innerHTML = reports.length ? `<div class="table-wrap"><table><thead><tr><th>File</th><th>Type</th><th>Date</th><th>Action</th></tr></thead><tbody>${reports.map(r => `<tr><td>${r.file_name}</td><td><span class="badge badge-info">${r.report_type}</span></td><td>${formatDate(r.uploaded_at)}</td><td><button class="btn btn-sm btn-outline" onclick="viewReport(${JSON.stringify(r).replace(/"/g,'&quot;')})">View Summary</button></td></tr>`).join('')}</tbody></table></div>` : '<p style="color:var(--text-muted)">No reports uploaded yet.</p>';
  } catch { el.innerHTML = '<p style="color:var(--text-muted)">Failed to load reports.</p>'; }
}

function viewReport(report) {
  const modal = document.getElementById('dynamicModal');
  modal.querySelector('.modal').innerHTML = `<h2>${report.file_name}</h2><p class="subtitle">${report.report_type} — ${formatDate(report.uploaded_at)}</p><div class="ai-text" style="max-height:400px;overflow-y:auto">${renderMarkdown(report.ai_summary)}</div><br><button class="btn btn-outline" onclick="closeModal()">Close</button>`;
  modal.classList.add('active');
}

// ===== Health Risk Analysis =====
function renderHealthRisk() {
  return `<div class="page-header"><h1>🧠 AI Health Risk Analysis</h1><p>Enter your vitals for ML-powered disease risk prediction</p></div>
    <div class="grid-2"><div class="card"><div class="card-header"><h3>Enter Your Vitals</h3></div><div class="card-body">
      <div class="form-row"><div class="form-group"><label>Age</label><input type="number" id="rAge" value="35"></div><div class="form-group"><label>Gender</label><select id="rGender"><option>Male</option><option>Female</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>BMI</label><input type="number" id="rBmi" step="0.1" value="25.5"></div><div class="form-group"><label>Glucose (mg/dL)</label><input type="number" id="rGlucose" value="105"></div></div>
      <div class="form-row"><div class="form-group"><label>BP Systolic</label><input type="number" id="rBpSys" value="130"></div><div class="form-group"><label>BP Diastolic</label><input type="number" id="rBpDia" value="85"></div></div>
      <div class="form-row"><div class="form-group"><label>Cholesterol (mg/dL)</label><input type="number" id="rChol" value="210"></div><div class="form-group"><label>Exercise hrs/week</label><input type="number" id="rExercise" step="0.5" value="3"></div></div>
      <div class="form-row"><div class="form-group"><label><input type="checkbox" id="rSmoking"> Smoking</label></div><div class="form-group"><label><input type="checkbox" id="rFamDiabetes"> Family History: Diabetes</label></div></div>
      <div class="form-group"><label><input type="checkbox" id="rFamHeart"> Family History: Heart Disease</label></div>
      <button class="btn btn-primary" onclick="runRiskAnalysis()" style="width:100%;margin-top:8px">🔍 Analyze Risk</button>
    </div></div>
    <div id="riskResult"><div class="card"><div class="card-body" style="text-align:center;padding:60px;color:var(--text-muted)"><p>Fill in your vitals and click Analyze to see your risk assessment.</p></div></div></div></div>`;
}

async function runRiskAnalysis() {
  const data = { age: +document.getElementById('rAge').value, gender: document.getElementById('rGender').value, bmi: +document.getElementById('rBmi').value, glucose_level: +document.getElementById('rGlucose').value, blood_pressure_systolic: +document.getElementById('rBpSys').value, blood_pressure_diastolic: +document.getElementById('rBpDia').value, cholesterol: +document.getElementById('rChol').value, exercise_hours_per_week: +document.getElementById('rExercise').value, smoking: document.getElementById('rSmoking').checked, family_history_diabetes: document.getElementById('rFamDiabetes').checked, family_history_heart: document.getElementById('rFamHeart').checked };
  document.getElementById('riskResult').innerHTML = '<div class="spinner"></div>';
  try {
    const result = await api.post('/patients/health-risk', data);
    const specs = (result.recommended_specialists || []).map(s => `<div class="alert-item"><div class="alert-dot" style="background:${s.urgency==='high'?'var(--accent-red)':'var(--accent-amber)'}"></div><div><strong>${s.type}</strong><br><span style="font-size:0.8rem;color:var(--text-secondary)">${s.reason}</span></div></div>`).join('');
    document.getElementById('riskResult').innerHTML = `<div class="card" style="border-color:${riskColor(result.risk_level)}40"><div class="card-header"><h3>Risk Assessment ${riskBadge(result.risk_level)}</h3><span style="font-size:0.85rem">Score: ${(result.overall_risk_score*100).toFixed(0)}%</span></div><div class="card-body">
      <div style="margin-bottom:16px"><span>Diabetes: ${(result.diabetes_risk*100).toFixed(0)}%</span><div class="risk-bar"><div class="risk-bar-fill" style="width:${result.diabetes_risk*100}%;background:var(--accent-amber)"></div></div></div>
      <div style="margin-bottom:16px"><span>Heart Disease: ${(result.heart_disease_risk*100).toFixed(0)}%</span><div class="risk-bar"><div class="risk-bar-fill" style="width:${result.heart_disease_risk*100}%;background:var(--accent-red)"></div></div></div>
      <div style="margin-bottom:16px"><span>Hypertension: ${(result.hypertension_risk*100).toFixed(0)}%</span><div class="risk-bar"><div class="risk-bar-fill" style="width:${result.hypertension_risk*100}%;background:var(--accent-purple)"></div></div></div>
      <div style="margin-bottom:16px"><span>Obesity: ${(result.obesity_risk*100).toFixed(0)}%</span><div class="risk-bar"><div class="risk-bar-fill" style="width:${result.obesity_risk*100}%;background:var(--accent-blue)"></div></div></div>
      <hr style="border-color:var(--border-glass);margin:20px 0"><h4 style="margin-bottom:12px">🩺 Recommended Specialists</h4>${specs}
      <hr style="border-color:var(--border-glass);margin:20px 0"><div class="ai-text">${renderMarkdown(result.explanation)}</div>
    </div></div>`;
    showToast('Risk analysis complete!');
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== Appointments =====
async function renderAppointments() {
  let html = `<div class="page-header"><h1>📅 Appointments</h1><p>Book and manage your appointments</p></div>`;
  try {
    const apts = await api.get('/patients/appointments');
    html += `<div class="card"><div class="card-header"><h3>Your Appointments</h3><button class="btn btn-primary btn-sm" onclick="navigateTo('doctor-recs')">+ Book New</button></div><div class="card-body">`;
    if (apts.length) {
      html += `<div class="table-wrap"><table><thead><tr><th>Doctor</th><th>Specialization</th><th>Date</th><th>Time</th><th>Status</th></tr></thead><tbody>${apts.map(a => `<tr><td>${a.doctor_name}</td><td>${a.specialization}</td><td>${a.date}</td><td>${a.time}</td><td>${a.status==='pending'?'<span class="badge badge-warning">PENDING</span>':a.status==='confirmed'?'<span class="badge badge-success">CONFIRMED</span>':a.status==='completed'?'<span class="badge badge-info">COMPLETED</span>':'<span class="badge badge-danger">CANCELLED</span>'}</td></tr>`).join('')}</tbody></table></div>`;
    } else { html += '<p style="color:var(--text-muted)">No appointments yet. Find a doctor to book one!</p>'; }
    html += '</div></div>';
  } catch { html += '<p>Failed to load appointments.</p>'; }
  return html;
}

// ===== Doctor Recommendations =====
async function renderDoctorRecs() {
  let html = `<div class="page-header"><h1>👨‍⚕️ Find a Doctor</h1><p>AI-ranked doctor recommendations</p></div>
    <div class="card" style="margin-bottom:20px"><div class="card-body" style="display:flex;gap:12px"><input type="text" id="conditionInput" placeholder="Enter condition (e.g., diabetes, heart, general)" style="flex:1;padding:12px 16px;background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:8px;color:var(--text-primary)"><button class="btn btn-primary" onclick="searchDoctors()">🔍 Search</button></div></div>
    <div id="doctorResults"><div class="spinner"></div></div>`;
  setTimeout(() => searchDoctors(), 100);
  return html;
}

async function searchDoctors() {
  const condition = document.getElementById('conditionInput')?.value || 'general';
  const el = document.getElementById('doctorResults'); if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const docs = await api.get(`/patients/doctor-recommendations?condition=${encodeURIComponent(condition)}`);
    el.innerHTML = docs.map(d => `<div class="card" style="margin-bottom:12px"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
      <div><h3 style="margin-bottom:4px">${d.name}</h3><span class="badge badge-info">${d.specialization}</span> <span style="font-size:0.85rem;color:var(--text-secondary);margin-left:8px">${d.experience_years} yrs exp</span>
      <div style="margin-top:8px;font-size:0.85rem;color:var(--text-secondary)">⭐ ${d.rating}/5 · ✅ ${d.success_rate}% success · 🏥 ${d.hospital}</div></div>
      <div style="text-align:right"><div style="font-size:0.8rem;color:var(--text-muted)">Match Score</div><div style="font-size:1.5rem;font-weight:700;color:var(--accent-teal)">${d.match_score}</div>
      <button class="btn btn-primary btn-sm" onclick="bookAppointment(${d.id},'${d.name}')" style="margin-top:8px">Book →</button></div>
    </div></div>`).join('') || '<p style="color:var(--text-muted)">No doctors found.</p>';
  } catch (err) { el.innerHTML = `<p style="color:var(--accent-red)">${err.message}</p>`; }
}

async function bookAppointment(docId, docName) {
  const date = prompt(`Book appointment with ${docName}\nEnter date (YYYY-MM-DD):`, new Date(Date.now()+86400000).toISOString().split('T')[0]);
  if (!date) return;
  const time = prompt('Enter preferred time:', '10:00');
  const reason = prompt('Reason for visit:', '');
  try {
    await api.post('/patients/appointments', { doctor_id: docId, date, time: time||'10:00', reason: reason||'' });
    showToast(`Appointment booked with ${docName}!`);
    navigateTo('appointments');
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== Prescriptions =====
async function renderPrescriptions() {
  let html = `<div class="page-header"><h1>💊 My Prescriptions</h1><p>View your prescribed medications</p></div>`;
  try {
    const rxs = await api.get('/patients/prescriptions');
    if (rxs.length) {
      html += rxs.map(rx => `<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Dr. ${rx.doctor_name}</h3><span style="font-size:0.8rem;color:var(--text-muted)">${formatDate(rx.created_at)}</span></div><div class="card-body">
        <p style="margin-bottom:12px"><strong>Diagnosis:</strong> ${rx.diagnosis || 'N/A'}</p>
        <div class="table-wrap"><table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${(rx.medicines||[]).map(m => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join('')}</tbody></table></div>
        ${rx.instructions ? `<p style="margin-top:12px;font-size:0.85rem;color:var(--text-secondary)"><strong>Instructions:</strong> ${rx.instructions}</p>` : ''}
        <p style="margin-top:8px">${rx.is_dispensed ? '<span class="badge badge-success">DISPENSED</span>' : '<span class="badge badge-warning">PENDING</span>'}</p>
      </div></div>`).join('');
    } else { html += '<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text-muted)">No prescriptions yet.</div></div>'; }
  } catch { html += '<p>Failed to load prescriptions.</p>'; }
  return html;
}
