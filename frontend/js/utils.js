// ===== Utility functions =====

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function formatDate(d) {
  if (!d || d === 'None') return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function riskColor(level) {
  const colors = { low: 'var(--accent-emerald)', moderate: 'var(--accent-amber)', high: 'var(--accent-red)', critical: '#dc2626' };
  return colors[level] || 'var(--text-muted)';
}

function riskBadge(level) {
  const cls = { low: 'badge-success', moderate: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' };
  return `<span class="badge ${cls[level] || 'badge-info'}">${(level || 'N/A').toUpperCase()}</span>`;
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/^• (.*$)/gm, '<li>$1</li>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
}

function statCard(icon, label, value, color, change = '') {
  return `<div class="stat-card">
    <div class="stat-header">
      <span class="stat-label">${label}</span>
      <div class="stat-icon" style="background:${color}20;color:${color}">${icon}</div>
    </div>
    <div class="stat-value">${value}</div>
    ${change ? `<div class="stat-change">${change}</div>` : ''}
  </div>`;
}
