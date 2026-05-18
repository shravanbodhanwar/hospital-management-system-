// ===== Receptionist Dashboard =====
async function renderReceptionistDashboard() {
  const data = await api.get('/receptionist/dashboard');
  if (!data) return '<div class="spinner"></div>';
  const s = data.stats;
  return `<div class="page-header"><h1>Welcome, ${data.user.name} 🏥</h1><p>Front desk management</p></div>
    <div class="stats-grid">
      ${statCard('📅','Today\'s Appointments', s.today_appointments, '#e8795a')}
      ${statCard('👥','Total Patients', s.total_patients, '#3b82f6')}
      ${statCard('👨‍⚕️','Doctors Available', s.total_doctors, '#0d9488')}
      ${statCard('⏳','Pending', s.pending_appointments, '#f59e0b')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>📋 Recent Appointments</h3></div><div class="card-body">
        ${data.recent_appointments.length ? data.recent_appointments.map(a => `<div class="alert-item">
          <div class="alert-dot" style="background:${a.status==='pending'?'var(--accent-amber)':a.status==='confirmed'?'var(--accent-emerald)':'var(--accent-blue)'}"></div>
          <div style="flex:1"><strong>${a.patient_name}</strong> → ${a.doctor_name}<br>
          <span style="font-size:0.8rem;color:var(--text-secondary)">${a.date} at ${a.time} · ${a.specialization}</span></div>
          <span class="badge ${a.status==='pending'?'badge-warning':a.status==='confirmed'?'badge-success':'badge-info'}">${a.status.toUpperCase()}</span>
        </div>`).join('') : '<p style="color:var(--text-muted)">No recent appointments.</p>'}
      </div></div>
      <div class="card"><div class="card-header"><h3>⚡ Quick Actions</h3></div><div class="card-body" style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" onclick="navigateTo('rec-register')" style="width:100%;background:linear-gradient(135deg,#e8795a,#f59e0b)">👤 Register New Patient</button>
        <button class="btn btn-outline" onclick="navigateTo('rec-book')" style="width:100%">📅 Book Appointment</button>
        <button class="btn btn-outline" onclick="navigateTo('rec-patients')" style="width:100%">👥 View All Patients</button>
        <button class="btn btn-outline" onclick="navigateTo('rec-appointments')" style="width:100%">📋 View All Appointments</button>
      </div></div>
    </div>`;
}

// ===== Register Patient =====
function renderRecRegister() {
  return `<div class="page-header"><h1>👤 Register New Patient</h1><p>Add a new patient to the system</p></div>
    <div class="card"><div class="card-body">
      <div class="form-row"><div class="form-group"><label>Full Name *</label><input type="text" id="rpName" placeholder="Patient full name" required></div><div class="form-group"><label>Email *</label><input type="email" id="rpEmail" placeholder="patient@email.com" required></div></div>
      <div class="form-row"><div class="form-group"><label>Phone</label><input type="text" id="rpPhone" placeholder="9876543210"></div><div class="form-group"><label>Age</label><input type="number" id="rpAge" placeholder="30"></div></div>
      <div class="form-row"><div class="form-group"><label>Gender</label><select id="rpGender"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div><div class="form-group"><label>Blood Group</label><select id="rpBlood"><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Height (cm)</label><input type="number" id="rpHeight" placeholder="170"></div><div class="form-group"><label>Weight (kg)</label><input type="number" id="rpWeight" placeholder="70"></div></div>
      <div class="form-group"><label>Medical History</label><textarea id="rpHistory" placeholder="Previous conditions, surgeries..."></textarea></div>
      <div class="form-row"><div class="form-group"><label>Allergies</label><input type="text" id="rpAllergies" placeholder="e.g., Penicillin"></div><div class="form-group"><label>Emergency Contact</label><input type="text" id="rpEmergency" placeholder="Contact number"></div></div>
      <div class="form-group"><label>Address</label><textarea id="rpAddress" placeholder="Full address"></textarea></div>
      <button class="btn btn-primary" onclick="submitRegisterPatient()" style="width:100%;margin-top:8px">✅ Register Patient</button>
      <div id="rpResult" style="margin-top:16px"></div>
    </div></div>`;
}

async function submitRegisterPatient() {
  const name = document.getElementById('rpName').value.trim();
  const email = document.getElementById('rpEmail').value.trim();
  if (!name || !email) return showToast('Name and email are required', 'error');

  const payload = {
    full_name: name,
    email: email,
    phone: document.getElementById('rpPhone').value,
    age: document.getElementById('rpAge').value ? +document.getElementById('rpAge').value : null,
    gender: document.getElementById('rpGender').value || null,
    blood_group: document.getElementById('rpBlood').value || null,
    height_cm: document.getElementById('rpHeight').value ? +document.getElementById('rpHeight').value : null,
    weight_kg: document.getElementById('rpWeight').value ? +document.getElementById('rpWeight').value : null,
    medical_history: document.getElementById('rpHistory').value,
    allergies: document.getElementById('rpAllergies').value,
    emergency_contact: document.getElementById('rpEmergency').value,
    address: document.getElementById('rpAddress').value,
  };

  try {
    const result = await api.post('/receptionist/register-patient', payload);
    document.getElementById('rpResult').innerHTML = `<div class="card" style="border-color:rgba(16,185,129,0.3)"><div class="card-body">
      <h3>✅ ${result.message}</h3>
      <p style="margin-top:8px"><strong>Patient ID:</strong> ${result.patient_id}</p>
      <p><strong>Email:</strong> ${result.email}</p>
      <p><strong>Default Password:</strong> <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px">${result.default_password}</code></p>
    </div></div>`;
    showToast('Patient registered successfully!');
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== Book Appointment =====
async function renderRecBook() {
  let doctorsHtml = '';
  let patientsHtml = '';
  try {
    const doctors = await api.get('/receptionist/doctors');
    doctorsHtml = doctors.map(d => `<option value="${d.id}">${d.name} — ${d.specialization} (⭐${d.rating})</option>`).join('');
  } catch { doctorsHtml = '<option>Error loading doctors</option>'; }

  try {
    const patients = await api.get('/receptionist/patients');
    patientsHtml = patients.map(p => `<option value="${p.id}">${p.name} — ${p.email}${p.blood_group ? ' ('+p.blood_group+')' : ''}</option>`).join('');
  } catch { patientsHtml = '<option>Error loading patients</option>'; }

  const tomorrow = new Date(Date.now()+86400000).toISOString().split('T')[0];

  return `<div class="page-header"><h1>📅 Book Appointment</h1><p>Assign a patient to a doctor</p></div>
    <div class="card"><div class="card-body">
      <div class="form-group"><label>Select Patient *</label><select id="baPatient">${patientsHtml}</select></div>
      <div class="form-group"><label>Select Doctor *</label><select id="baDoctor">${doctorsHtml}</select></div>
      <div class="form-row"><div class="form-group"><label>Date *</label><input type="date" id="baDate" value="${tomorrow}"></div><div class="form-group"><label>Time *</label><input type="time" id="baTime" value="10:00"></div></div>
      <div class="form-group"><label>Reason for Visit</label><textarea id="baReason" placeholder="Symptoms, check-up, follow-up..."></textarea></div>
      <button class="btn btn-primary" onclick="submitBookAppointment()" style="width:100%;margin-top:8px">📅 Book Appointment</button>
      <div id="baResult" style="margin-top:16px"></div>
    </div></div>`;
}

async function submitBookAppointment() {
  const patientId = document.getElementById('baPatient').value;
  const doctorId = document.getElementById('baDoctor').value;
  const date = document.getElementById('baDate').value;
  const time = document.getElementById('baTime').value;
  if (!patientId || !doctorId || !date) return showToast('Patient, doctor, and date are required', 'error');

  try {
    const result = await api.post('/receptionist/appointments', {
      patient_id: +patientId,
      doctor_id: +doctorId,
      date: date,
      time: time || '10:00',
      reason: document.getElementById('baReason').value,
    });
    document.getElementById('baResult').innerHTML = `<div class="card" style="border-color:rgba(16,185,129,0.3)"><div class="card-body"><h3>✅ ${result.message}</h3><p style="margin-top:4px">Appointment ID: ${result.appointment_id}</p></div></div>`;
    showToast('Appointment booked!');
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== All Patients =====
async function renderRecPatients() {
  let html = `<div class="page-header"><h1>👥 All Patients</h1><p>Registered patients in the system</p></div>
    <div style="display:flex;gap:12px;margin-bottom:20px"><input type="text" id="recPatSearch" placeholder="Search by name..." style="flex:1;padding:12px 16px;background:#f8fafc;border:1px solid var(--border-light);border-radius:10px;color:var(--text-primary);outline:none" oninput="searchRecPatients()"><button class="btn btn-primary" onclick="navigateTo('rec-register')">+ Add Patient</button></div>`;
  try {
    const patients = await api.get('/receptionist/patients');
    window._recPatients = patients;
    html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Age</th><th>Gender</th><th>Blood</th><th>Action</th></tr></thead><tbody id="recPatTable">${renderRecPatRows(patients)}</tbody></table></div></div></div>`;
  } catch { html += '<p>Failed to load patients.</p>'; }
  return html;
}

function renderRecPatRows(patients) {
  return patients.map(p => `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td>${p.email}</td><td>${p.phone||'—'}</td><td>${p.age||'—'}</td><td>${p.gender||'—'}</td><td>${p.blood_group||'—'}</td><td><button class="btn btn-sm btn-primary" onclick="quickBookForPatient(${p.id},'${p.name}')">Book →</button></td></tr>`).join('');
}

function searchRecPatients() {
  const q = document.getElementById('recPatSearch').value.toLowerCase();
  const filtered = (window._recPatients||[]).filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  document.getElementById('recPatTable').innerHTML = renderRecPatRows(filtered);
}

function quickBookForPatient(id, name) {
  navigateTo('rec-book');
  setTimeout(() => {
    const sel = document.getElementById('baPatient');
    if (sel) sel.value = id;
  }, 300);
}

// ===== All Appointments =====
async function renderRecAppointments() {
  let html = `<div class="page-header"><h1>📋 All Appointments</h1><p>View and track all appointments</p></div>
    <div style="display:flex;gap:12px;margin-bottom:20px"><input type="date" id="recAptDate" style="padding:12px 16px;background:#f8fafc;border:1px solid var(--border-light);border-radius:10px;color:var(--text-primary);outline:none" onchange="filterRecAppointments()"><button class="btn btn-outline" onclick="document.getElementById('recAptDate').value='';filterRecAppointments()">Clear Filter</button><button class="btn btn-primary" onclick="navigateTo('rec-book')" style="margin-left:auto">+ New Appointment</button></div>`;
  try {
    const apts = await api.get('/receptionist/appointments');
    window._recAppointments = apts;
    html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Specialization</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th></tr></thead><tbody id="recAptTable">${renderRecAptRows(apts)}</tbody></table></div></div></div>`;
  } catch { html += '<p>Failed to load appointments.</p>'; }
  return html;
}

function renderRecAptRows(apts) {
  return apts.map(a => `<tr>
    <td>${a.id}</td><td><strong>${a.patient_name}</strong></td><td>${a.doctor_name}</td><td><span class="badge badge-info">${a.specialization||'—'}</span></td>
    <td>${a.date}</td><td>${a.time}</td><td>${a.reason||'—'}</td>
    <td>${a.status==='pending'?'<span class="badge badge-warning">PENDING</span>':a.status==='confirmed'?'<span class="badge badge-success">CONFIRMED</span>':a.status==='completed'?'<span class="badge badge-info">COMPLETED</span>':'<span class="badge badge-danger">CANCELLED</span>'}</td>
  </tr>`).join('');
}

async function filterRecAppointments() {
  const date = document.getElementById('recAptDate').value;
  try {
    const apts = await api.get('/receptionist/appointments' + (date ? `?date_filter=${date}` : ''));
    document.getElementById('recAptTable').innerHTML = renderRecAptRows(apts);
  } catch {}
}
