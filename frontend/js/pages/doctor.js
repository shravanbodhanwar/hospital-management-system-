// ===== Doctor Dashboard =====
async function renderDoctorDashboard() {
  const data = await api.get('/doctors/dashboard');
  if (!data) return '<div class="spinner"></div>';
  const s = data.stats;
  return `<div class="page-header"><h1>Welcome, ${data.user.name} 🩺</h1><p>Your practice overview</p></div>
    <div class="stats-grid">
      ${statCard('📅','Today\'s Appointments', s.today_appointments, '#3b82f6')}
      ${statCard('⏳','Pending', s.pending_appointments, '#f59e0b')}
      ${statCard('👥','Total Patients', s.total_patients, '#14b8a6')}
      ${statCard('📝','Prescriptions', s.total_prescriptions, '#8b5cf6')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>⚠️ High-Risk Patient Alerts</h3></div><div class="card-body">
        ${data.risk_alerts.length ? data.risk_alerts.map(a => `<div class="alert-item">
          <div class="alert-dot" style="background:${a.risk_level==='critical'?'#dc2626':'var(--accent-red)'}"></div>
          <div style="flex:1"><strong>${a.patient_name}</strong><br><span style="font-size:0.8rem;color:var(--text-secondary)">Score: ${(a.overall_score*100).toFixed(0)}%</span></div>
          ${riskBadge(a.risk_level)}
          <button class="btn btn-sm btn-outline" onclick="viewPatientDetail(${a.patient_id})">View</button>
        </div>`).join('') : '<p style="color:var(--text-muted)">No high-risk alerts.</p>'}
      </div></div>
      <div class="card"><div class="card-header"><h3>⚡ Quick Actions</h3></div><div class="card-body" style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" onclick="navigateTo('doc-patients')" style="width:100%;background:var(--gradient-blue)">👥 View Patients</button>
        <button class="btn btn-outline" onclick="navigateTo('doc-appointments')" style="width:100%">📅 Manage Appointments</button>
        <button class="btn btn-outline" onclick="navigateTo('doc-prescribe')" style="width:100%">📝 Write Prescription</button>
      </div></div>
    </div>`;
}

// ===== Doctor's Patient List =====
async function renderDocPatients() {
  let html = `<div class="page-header"><h1>👥 My Patients</h1><p>Patients who have appointments with you</p></div>`;
  try {
    const patients = await api.get('/doctors/patients');
    if (patients.length) {
      html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Blood Group</th><th>Risk</th><th>Action</th></tr></thead><tbody>${patients.map(p => `<tr><td>${p.name}</td><td>${p.age||'N/A'}</td><td>${p.gender||'N/A'}</td><td>${p.blood_group||'N/A'}</td><td>${riskBadge(p.risk_level)}</td><td><button class="btn btn-sm btn-outline" onclick="viewPatientDetail(${p.id})">Details</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
    } else { html += '<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text-muted)">No patients yet. Patients will appear here after they book appointments with you.</div></div>'; }
  } catch { html += '<p>Failed to load patients.</p>'; }
  return html;
}

// ===== Patient Detail View =====
async function viewPatientDetail(patientId) {
  const el = document.getElementById('app-content');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await api.get(`/doctors/patients/${patientId}`);
    const p = data.patient; const profile = p.profile;
    el.innerHTML = `<div class="page-header"><h1>${p.name}</h1><p>${p.email}</p></div>
      <div class="stats-grid">
        ${statCard('🎂','Age', profile?.age||'N/A', '#3b82f6')}
        ${statCard('🩸','Blood Group', profile?.blood_group||'N/A', '#ef4444')}
        ${statCard('📏','Height', profile?.height_cm?profile.height_cm+'cm':'N/A', '#14b8a6')}
        ${statCard('⚖️','Weight', profile?.weight_kg?profile.weight_kg+'kg':'N/A', '#f59e0b')}
      </div>
      ${data.risk_assessment ? `<div class="card" style="margin-bottom:20px;border-color:${riskColor(data.risk_assessment.risk_level)}40"><div class="card-header"><h3>Risk Assessment</h3>${riskBadge(data.risk_assessment.risk_level)}</div><div class="card-body ai-text">${renderMarkdown(data.risk_assessment.explanation||'')}</div></div>` : ''}
      <div class="grid-2">
        <div class="card"><div class="card-header"><h3>📋 Reports (${data.reports.length})</h3></div><div class="card-body">${data.reports.length ? data.reports.map(r => `<div class="alert-item"><div class="alert-dot" style="background:var(--accent-blue)"></div><div><strong>${r.file_name}</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">${r.type} — ${formatDate(r.date)}</span></div></div>`).join('') : '<p style="color:var(--text-muted)">No reports.</p>'}</div></div>
        <div class="card"><div class="card-header"><h3>💊 Prescriptions (${data.prescriptions.length})</h3></div><div class="card-body">${data.prescriptions.length ? data.prescriptions.map(rx => `<div class="alert-item"><div class="alert-dot" style="background:var(--accent-emerald)"></div><div><strong>${rx.diagnosis||'General'}</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">${(rx.medicines||[]).map(m=>m.name).join(', ')}</span></div></div>`).join('') : '<p style="color:var(--text-muted)">No prescriptions.</p>'}</div></div>
      </div>
      <button class="btn btn-outline" onclick="navigateTo('doc-patients')" style="margin-top:20px">← Back to Patients</button>`;
  } catch (err) { el.innerHTML = `<p style="color:var(--accent-red)">Error: ${err.message}</p>`; }
}

// ===== Doctor Appointments =====
async function renderDocAppointments() {
  let html = `<div class="page-header"><h1>📅 Appointments</h1><p>Manage your patient appointments</p></div>`;
  try {
    const apts = await api.get('/doctors/appointments');
    html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>${apts.map(a => `<tr><td>${a.patient_name}</td><td>${a.date}</td><td>${a.time}</td><td>${a.reason||'—'}</td><td>${a.status==='pending'?'<span class="badge badge-warning">PENDING</span>':a.status==='confirmed'?'<span class="badge badge-success">CONFIRMED</span>':'<span class="badge badge-info">${a.status.toUpperCase()}</span>'}</td><td style="display:flex;gap:6px">${a.status==='pending'?`<button class="btn btn-sm btn-primary" onclick="updateApt(${a.id},'confirmed')">✓</button><button class="btn btn-sm btn-danger" onclick="updateApt(${a.id},'cancelled')">✗</button>`:a.status==='confirmed'?`<button class="btn btn-sm btn-primary" onclick="updateApt(${a.id},'completed')">Complete</button>`:''}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  } catch { html += '<p>Failed to load.</p>'; }
  return html;
}

async function updateApt(id, status) {
  try { await api.put(`/doctors/appointments/${id}`, { status }); showToast('Appointment updated!'); navigateTo('doc-appointments'); }
  catch (err) { showToast(err.message, 'error'); }
}

// ===== Write Prescription =====
function renderDocPrescribe() {
  return `<div class="page-header"><h1>📝 Write Prescription</h1><p>Create a new prescription for a patient</p></div>
    <div class="card"><div class="card-body">
      <div class="form-group"><label>Patient ID</label><input type="number" id="rxPatientId" placeholder="Enter patient user ID"></div>
      <div class="form-group"><label>Diagnosis</label><input type="text" id="rxDiagnosis" placeholder="e.g., Type 2 Diabetes Mellitus"></div>
      <div id="rxMedicines"><div class="form-row" style="grid-template-columns:2fr 1fr 1fr 1fr;margin-bottom:8px"><div class="form-group"><label>Medicine</label><input type="text" class="med-name" placeholder="Medicine name"></div><div class="form-group"><label>Dosage</label><input type="text" class="med-dosage" placeholder="500mg"></div><div class="form-group"><label>Frequency</label><input type="text" class="med-freq" placeholder="Twice daily"></div><div class="form-group"><label>Duration</label><input type="text" class="med-dur" placeholder="7 days"></div></div></div>
      <button class="btn btn-outline btn-sm" onclick="addMedRow()" style="margin-bottom:16px">+ Add Medicine</button>
      <div class="form-group"><label>Instructions</label><textarea id="rxInstructions" placeholder="Special instructions for the patient..."></textarea></div>
      <button class="btn btn-primary" onclick="submitPrescription()" style="width:100%">Submit Prescription</button>
    </div></div>`;
}

function addMedRow() {
  const div = document.createElement('div');
  div.className = 'form-row'; div.style.cssText = 'grid-template-columns:2fr 1fr 1fr 1fr;margin-bottom:8px';
  div.innerHTML = `<div class="form-group"><input type="text" class="med-name" placeholder="Medicine name"></div><div class="form-group"><input type="text" class="med-dosage" placeholder="Dosage"></div><div class="form-group"><input type="text" class="med-freq" placeholder="Frequency"></div><div class="form-group"><input type="text" class="med-dur" placeholder="Duration"></div>`;
  document.getElementById('rxMedicines').appendChild(div);
}

async function submitPrescription() {
  const names = document.querySelectorAll('.med-name'), dosages = document.querySelectorAll('.med-dosage'), freqs = document.querySelectorAll('.med-freq'), durs = document.querySelectorAll('.med-dur');
  const medicines = [];
  names.forEach((n,i) => { if (n.value) medicines.push({ name: n.value, dosage: dosages[i]?.value||'', frequency: freqs[i]?.value||'', duration: durs[i]?.value||'' }); });
  if (!medicines.length) return showToast('Add at least one medicine', 'error');
  try {
    await api.post('/doctors/prescriptions', { patient_id: +document.getElementById('rxPatientId').value, diagnosis: document.getElementById('rxDiagnosis').value, medicines, instructions: document.getElementById('rxInstructions').value });
    showToast('Prescription created!'); navigateTo('doc-dashboard');
  } catch (err) { showToast(err.message, 'error'); }
}
