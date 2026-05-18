// ===== Pharmacy Dashboard =====
async function renderPharmacyDashboard() {
  const data = await api.get('/pharmacy/dashboard');
  if (!data) return '<div class="spinner"></div>';
  const s = data.stats;
  return `<div class="page-header"><h1>Pharmacy Dashboard 💊</h1><p>Inventory overview, billing and alerts</p></div>
    <div class="stats-grid">
      ${statCard('💊','Total Medicines', s.total_medicines, '#14b8a6')}
      ${statCard('⚠️','Low Stock', s.low_stock_count, '#ef4444')}
      ${statCard('📋','Pending Rx', s.pending_prescriptions, '#f59e0b')}
      ${statCard('💰','Today Revenue', '₹'+(s.today_revenue||0).toLocaleString(), '#8b5cf6')}
    </div>
    <div class="stats-grid">
      ${statCard('🧾','Total Bills', s.total_bills, '#3b82f6')}
      ${statCard('📦','Inventory Value', '₹'+s.inventory_value.toLocaleString(), '#10b981')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>⚠️ Low Stock Alerts</h3></div><div class="card-body">
        ${data.low_stock_alerts.length ? data.low_stock_alerts.map(m => `<div class="alert-item"><div class="alert-dot" style="background:var(--accent-red)"></div><div style="flex:1"><strong>${m.name}</strong><br><span style="font-size:0.8rem;color:var(--text-secondary)">Stock: ${m.stock} / Min: ${m.min_stock}</span></div><span class="badge badge-danger">LOW</span></div>`).join('') : '<p style="color:var(--text-muted)">All stock levels are healthy!</p>'}
      </div></div>
      <div class="card"><div class="card-header"><h3>⚡ Quick Actions</h3></div><div class="card-body" style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" onclick="navigateTo('pharma-billing')" style="width:100%">🧾 New Patient Bill</button>
        <button class="btn btn-outline" onclick="navigateTo('pharma-prescriptions')" style="width:100%">📋 Process Prescription</button>
        <button class="btn btn-outline" onclick="navigateTo('pharma-bills-list')" style="width:100%">💰 View Bill History</button>
        <button class="btn btn-outline" onclick="navigateTo('inventory')" style="width:100%">📦 Manage Inventory</button>
      </div></div>
    </div>`;
}

// ===== Inventory =====
async function renderInventory() {
  let html = `<div class="page-header"><h1>📦 Medicine Inventory</h1><p>Manage your medicine stock</p></div>
    <div style="display:flex;gap:12px;margin-bottom:20px"><input type="text" id="invSearch" placeholder="Search medicines..." style="flex:1;padding:12px 16px;background:#f8fafc;border:1px solid var(--border-light);border-radius:8px;color:var(--text-primary);outline:none" oninput="filterInventory()"><button class="btn btn-primary" onclick="showAddMedicine()">+ Add Medicine</button></div>`;
  try {
    const meds = await api.get('/pharmacy/inventory');
    window._inventoryData = meds;
    html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Stock</th><th>Price</th><th>Expiry</th><th>Eco</th><th>Actions</th></tr></thead><tbody id="invTable">${renderInvRows(meds)}</tbody></table></div></div></div>`;
  } catch { html += '<p>Failed to load inventory.</p>'; }
  return html;
}

function renderInvRows(meds) {
  return meds.map(m => `<tr><td><strong>${m.name}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${m.generic_name||''}</span></td><td><span class="badge badge-info">${m.category}</span></td><td style="color:${m.stock<=m.min_stock_level?'var(--accent-red)':'var(--text-primary)'};font-weight:600">${m.stock}</td><td>₹${m.unit_price}</td><td>${m.expiry_date||'N/A'}</td><td>${m.is_eco_friendly?'🌱':''}</td><td><button class="btn btn-sm btn-outline" onclick="restockMed(${m.id},${m.stock},'${m.name}')">Restock</button></td></tr>`).join('');
}

function filterInventory() {
  const q = document.getElementById('invSearch').value.toLowerCase();
  const filtered = (window._inventoryData||[]).filter(m => m.name.toLowerCase().includes(q) || (m.category||'').toLowerCase().includes(q));
  document.getElementById('invTable').innerHTML = renderInvRows(filtered);
}

async function restockMed(id, currentStock, name) {
  const qty = prompt(`Restock ${name}\nCurrent stock: ${currentStock}\nEnter new total stock:`);
  if (!qty) return;
  try { await api.put(`/pharmacy/inventory/${id}`, { stock: +qty }); showToast(`${name} restocked!`); navigateTo('inventory'); }
  catch (err) { showToast(err.message, 'error'); }
}

function showAddMedicine() {
  const modal = document.getElementById('dynamicModal');
  modal.querySelector('.modal').innerHTML = `<h2>Add New Medicine</h2><p class="subtitle">Add medicine to inventory</p>
    <div class="form-group"><label>Name</label><input type="text" id="addMedName"></div>
    <div class="form-row"><div class="form-group"><label>Category</label><select id="addMedCat"><option>Analgesic</option><option>Antibiotic</option><option>Antidiabetic</option><option>Antihypertensive</option><option>Antacid</option><option>Antihistamine</option><option>NSAID</option><option>Statin</option><option>General</option></select></div><div class="form-group"><label>Stock</label><input type="number" id="addMedStock" value="100"></div></div>
    <div class="form-row"><div class="form-group"><label>Unit Price (₹)</label><input type="number" id="addMedPrice" step="0.5" value="5"></div><div class="form-group"><label>Expiry Date</label><input type="date" id="addMedExpiry"></div></div>
    <div class="form-group"><label>Manufacturer</label><input type="text" id="addMedMfg"></div>
    <div class="form-group"><label><input type="checkbox" id="addMedEco"> Eco-Friendly</label></div>
    <div style="display:flex;gap:12px;margin-top:16px"><button class="btn btn-primary" onclick="submitAddMedicine()" style="flex:1">Add Medicine</button><button class="btn btn-outline" onclick="closeModal()" style="flex:1">Cancel</button></div>`;
  modal.classList.add('active');
}

async function submitAddMedicine() {
  try {
    await api.post('/pharmacy/inventory', { name: document.getElementById('addMedName').value, category: document.getElementById('addMedCat').value, stock: +document.getElementById('addMedStock').value, unit_price: +document.getElementById('addMedPrice').value, expiry_date: document.getElementById('addMedExpiry').value, manufacturer: document.getElementById('addMedMfg').value, is_eco_friendly: document.getElementById('addMedEco').checked });
    showToast('Medicine added!'); closeModal(); navigateTo('inventory');
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== Pharmacy Prescriptions =====
async function renderPharmaPrescriptions() {
  let html = `<div class="page-header"><h1>📋 Pending Prescriptions</h1><p>Online prescriptions waiting to be dispensed</p></div>`;
  try {
    const rxs = await api.get('/pharmacy/prescriptions');
    if (rxs.length) {
      html += rxs.map(rx => `<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Rx #${rx.id} — ${rx.patient_name}</h3><div style="display:flex;gap:8px;align-items:center"><span class="badge badge-info">ONLINE</span><span style="font-size:0.8rem;color:var(--text-muted)">By ${rx.doctor_name}</span></div></div><div class="card-body">
        <p style="margin-bottom:8px"><strong>Diagnosis:</strong> ${rx.diagnosis||'N/A'}</p>
        <div class="table-wrap"><table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${(rx.medicines||[]).map(m=>`<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join('')}</tbody></table></div>
        <div style="display:flex;gap:12px;margin-top:12px">
          <button class="btn btn-primary" onclick="dispensePrescription(${rx.id})">✓ Mark Dispensed</button>
          <button class="btn btn-outline" onclick="billFromPrescription(${rx.id},'${rx.patient_name}',${JSON.stringify(rx.medicines||[]).replace(/'/g,'&#39;')})">🧾 Generate Bill</button>
        </div>
      </div></div>`).join('');
    } else { html += '<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text-muted)">No pending prescriptions! 🎉</div></div>'; }
  } catch { html += '<p>Failed to load.</p>'; }
  return html;
}

async function dispensePrescription(id) {
  if (!confirm('Mark this prescription as dispensed?')) return;
  try { await api.post(`/pharmacy/dispense/${id}`, {}); showToast('Prescription dispensed!'); navigateTo('pharma-prescriptions'); }
  catch (err) { showToast(err.message, 'error'); }
}

function billFromPrescription(rxId, patientName, medicines) {
  window._prefillBill = { rxId, patientName, medicines, type: 'online' };
  navigateTo('pharma-billing');
}

// ===== Billing =====
async function renderPharmaBilling() {
  let medsHtml = '';
  try {
    const meds = await api.get('/pharmacy/inventory');
    window._inventoryData = meds;
    medsHtml = meds.map(m => `<option value="${m.name}" data-price="${m.unit_price}" data-stock="${m.stock}">${m.name} — ₹${m.unit_price} (Stock: ${m.stock})</option>`).join('');
  } catch { medsHtml = '<option>Error loading medicines</option>'; }

  // Check if prefilled from prescription
  const prefill = window._prefillBill || null;
  const patientNameVal = prefill ? prefill.patientName : '';
  const rxType = prefill ? 'online' : 'offline';

  let html = `<div class="page-header"><h1>🧾 Patient Billing</h1><p>Create a bill for dispensed medicines</p></div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>Patient & Prescription Info</h3></div><div class="card-body">
        <div class="form-group"><label>Patient Name *</label><input type="text" id="billPatient" value="${patientNameVal}" placeholder="Patient name or Walk-in"></div>
        <div class="form-group"><label>Prescription Type</label>
          <select id="billRxType">
            <option value="offline" ${rxType==='offline'?'selected':''}>🏥 Offline (Walk-in)</option>
            <option value="online" ${rxType==='online'?'selected':''}>💻 Online (Doctor Rx)</option>
          </select></div>
        <div class="form-row">
          <div class="form-group"><label>Payment Method</label><select id="billPayment"><option>Cash</option><option>UPI</option><option>Card</option><option>Insurance</option></select></div>
          <div class="form-group"><label>Discount (%)</label><input type="number" id="billDiscount" value="0" min="0" max="100" oninput="recalcBill()"></div>
        </div>
        <div class="form-group"><label>Tax (%)</label><input type="number" id="billTax" value="5" min="0" max="30" oninput="recalcBill()"></div>
        <div class="form-group"><label>Notes</label><textarea id="billNotes" placeholder="Additional notes..."></textarea></div>
      </div></div>

      <div class="card"><div class="card-header"><h3>💊 Bill Summary</h3></div><div class="card-body">
        <div id="billSummary" style="font-size:0.9rem">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Subtotal</span><span id="summSubtotal">₹0.00</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Discount</span><span id="summDiscount" style="color:var(--accent-emerald)">-₹0.00</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Tax</span><span id="summTax">+₹0.00</span></div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:1.3rem;font-weight:700;color:var(--accent-teal)"><span>TOTAL</span><span id="summTotal">₹0.00</span></div>
        </div>
        <button class="btn btn-primary" onclick="submitBill()" style="width:100%;margin-top:8px;background:var(--gradient-teal)">🖨️ Generate Bill</button>
        <div id="billResult" style="margin-top:16px"></div>
      </div></div>
    </div>

    <div class="card" style="margin-top:20px"><div class="card-header"><h3>➕ Add Medicines to Bill</h3></div><div class="card-body">
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <select id="billMedSel" style="flex:2;padding:10px;background:#f8fafc;border:1px solid var(--border-light);border-radius:8px;color:var(--text-primary)">${medsHtml}</select>
        <input type="number" id="billMedQty" value="1" min="1" style="flex:0.5;padding:10px;background:#f8fafc;border:1px solid var(--border-light);border-radius:8px;color:var(--text-primary)" placeholder="Qty">
        <button class="btn btn-primary" onclick="addBillItem()">+ Add</button>
      </div>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Medicine</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Remove</th></tr></thead><tbody id="billItemsTable"><tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No items added yet</td></tr></tbody></table></div>
    </div></div>`;

  window._billItems = [];
  window._prefillBill = null;

  // Prefill from prescription
  if (prefill && prefill.medicines) {
    setTimeout(async () => {
      for (const med of prefill.medicines) {
        const meds = window._inventoryData || [];
        const found = meds.find(m => m.name === med.name);
        window._billItems.push({ name: med.name, qty: 1, unit_price: found ? found.unit_price : 0 });
      }
      renderBillTable();
      recalcBill();
    }, 100);
  }
  return html;
}

window._billItems = [];

function addBillItem() {
  const sel = document.getElementById('billMedSel');
  const name = sel.value;
  const price = parseFloat(sel.selectedOptions[0]?.dataset.price || 0);
  const qty = parseInt(document.getElementById('billMedQty').value) || 1;
  const existing = window._billItems.findIndex(i => i.name === name);
  if (existing >= 0) { window._billItems[existing].qty += qty; }
  else { window._billItems.push({ name, qty, unit_price: price }); }
  renderBillTable();
  recalcBill();
}

function removeBillItem(idx) {
  window._billItems.splice(idx, 1);
  renderBillTable();
  recalcBill();
}

function renderBillTable() {
  const tbody = document.getElementById('billItemsTable');
  if (!tbody) return;
  if (!window._billItems.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No items added yet</td></tr>'; return; }
  tbody.innerHTML = window._billItems.map((item, i) => `<tr>
    <td>${i+1}</td><td><strong>${item.name}</strong></td>
    <td><input type="number" value="${item.qty}" min="1" style="width:60px;padding:4px 8px;border:1px solid var(--border-light);border-radius:6px;background:#f8fafc" onchange="window._billItems[${i}].qty=+this.value;recalcBill()"></td>
    <td>₹${item.unit_price.toFixed(2)}</td>
    <td><strong>₹${(item.qty*item.unit_price).toFixed(2)}</strong></td>
    <td><button class="btn btn-sm btn-danger" onclick="removeBillItem(${i})">✕</button></td>
  </tr>`).join('');
}

function recalcBill() {
  const items = window._billItems || [];
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const discountPct = parseFloat(document.getElementById('billDiscount')?.value || 0);
  const taxPct = parseFloat(document.getElementById('billTax')?.value || 5);
  const discount = subtotal * discountPct / 100;
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * taxPct / 100;
  const total = afterDiscount + tax;
  const f = v => '₹' + v.toFixed(2);
  const el = id => document.getElementById(id);
  if(el('summSubtotal')) el('summSubtotal').textContent = f(subtotal);
  if(el('summDiscount')) el('summDiscount').textContent = '-' + f(discount);
  if(el('summTax')) el('summTax').textContent = '+' + f(tax);
  if(el('summTotal')) el('summTotal').textContent = f(total);
}

async function submitBill() {
  const items = window._billItems || [];
  if (!items.length) return showToast('Add at least one medicine to the bill', 'error');
  const patientName = document.getElementById('billPatient').value.trim() || 'Walk-in';
  try {
    const result = await api.post('/pharmacy/bills', {
      patient_name: patientName,
      prescription_type: document.getElementById('billRxType').value,
      items: items.map(i => ({ name: i.name, qty: i.qty, unit_price: i.unit_price })),
      discount_pct: parseFloat(document.getElementById('billDiscount').value) || 0,
      tax_pct: parseFloat(document.getElementById('billTax').value) || 5,
      payment_method: document.getElementById('billPayment').value,
      notes: document.getElementById('billNotes').value,
    });
    document.getElementById('billResult').innerHTML = renderBillReceipt(result, patientName);
    window._billItems = [];
    renderBillTable();
    recalcBill();
    showToast('Bill generated!');
  } catch (err) { showToast(err.message, 'error'); }
}

function renderBillReceipt(r, patientName) {
  return `<div class="card" style="border-color:rgba(13,148,136,0.3)"><div class="card-header" style="background:var(--gradient-teal);color:#fff"><h3>🧾 ${r.bill_number}</h3><span>${new Date().toLocaleString()}</span></div><div class="card-body">
    <p><strong>Patient:</strong> ${patientName}</p>
    <div class="table-wrap" style="margin:12px 0"><table><thead><tr><th>Medicine</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${r.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.unit_price}</td><td>₹${i.total}</td></tr>`).join('')}</tbody></table></div>
    <div style="text-align:right;border-top:2px solid var(--border-light);padding-top:12px">
      <p>Subtotal: ₹${r.subtotal}</p>
      <p style="color:var(--accent-emerald)">Discount: -₹${r.discount}</p>
      <p>Tax: +₹${r.tax}</p>
      <p style="font-size:1.3rem;font-weight:700;color:var(--accent-teal)">TOTAL: ₹${r.total}</p>
    </div>
  </div></div>`;
}

// ===== Bill History =====
async function renderBillHistory() {
  let html = `<div class="page-header"><h1>💰 Bill History</h1><p>All pharmacy bills</p></div>`;
  try {
    const bills = await api.get('/pharmacy/bills');
    if (bills.length) {
      html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Bill #</th><th>Patient</th><th>Type</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th></tr></thead><tbody>
        ${bills.map(b => `<tr><td><strong>${b.bill_number}</strong></td><td>${b.patient_name}</td><td><span class="badge ${b.prescription_type==='online'?'badge-info':'badge-success'}">${b.prescription_type.toUpperCase()}</span></td><td>${(b.items||[]).length} items</td><td style="font-weight:700;color:var(--accent-teal)">₹${b.total_amount}</td><td>${b.payment_method}</td><td>${formatDate(b.billed_at)}</td></tr>`).join('')}
      </tbody></table></div></div></div>`;
    } else { html += '<div class="card"><div class="card-body" style="text-align:center;color:var(--text-muted);padding:40px">No bills yet. Create one from the Billing section!</div></div>'; }
  } catch { html += '<p>Failed to load bills.</p>'; }
  return html;
}

// ===== Demand Forecast =====
async function renderDemandForecast() {
  let html = `<div class="page-header"><h1>📊 Demand Forecast</h1><p>ML-powered medicine demand predictions</p></div>`;
  try {
    const forecasts = await api.get('/pharmacy/demand-forecast');
    html += `<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Medicine</th><th>Current Stock</th><th>Daily Usage</th><th>30-Day Demand</th><th>Days to Stockout</th><th>Reorder?</th><th>Recommended Order</th></tr></thead><tbody>${forecasts.map(f => `<tr><td><strong>${f.medicine_name}</strong></td><td>${f.current_stock}</td><td>${f.predicted_daily_usage}</td><td>${f.predicted_30day_demand}</td><td style="color:${f.days_until_stockout<14?'var(--accent-red)':'var(--text-primary)'}">${f.days_until_stockout}</td><td>${f.reorder_needed?'<span class="badge badge-danger">YES</span>':'<span class="badge badge-success">NO</span>'}</td><td>${f.recommended_order_qty}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  } catch { html += '<p>Failed to load forecasts.</p>'; }
  return html;
}
