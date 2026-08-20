async function api(path, opts) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (res.status === 401) { window.location.href = 'index.html'; return null; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

let currentUser = null;

async function init() {
  currentUser = await api('/api/auth/me');
  if (!currentUser) return;
  document.getElementById('empDashboardName').textContent = currentUser.name;
  await loadTasks();
  
  // Update table every minute to refresh timers
  setInterval(renderTasksTable, 60000);
}

let allTasks = [];

async function loadTasks() {
  allTasks = await api('/api/employee/tasks');
  renderTasksTable();
}

function renderTasksTable() {
  const tbody = document.getElementById('empTasksTableBody');
  const filterStatus = document.getElementById('taskFilterStatus').value;
  
  let filteredTasks = allTasks;
  
  if (filterStatus !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }

  tbody.innerHTML = filteredTasks.length ? '' : '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--muted);">No tasks found.</td></tr>';
  filteredTasks.forEach(t => tbody.appendChild(renderTaskRow(t)));
}

document.getElementById('taskFilterStatus').addEventListener('change', renderTasksTable);

function renderTaskRow(t) {
  const tr = document.createElement('tr');
  
  let actionHtml = '';
  if (t.status === 'pending') {
    actionHtml = `
      <div style="display:flex; justify-content: flex-end;">
        <button class="btn-secondary btn-small" onclick="openTask('${t.id}')">Start Task</button>
      </div>
    `;
  } else if (t.status === 'open') {
    const updatedTime = new Date(t.updated_at).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    const diff = now - updatedTime;
    
    if (diff < tenMinutes) {
      const remainingMs = tenMinutes - diff;
      const remainingMin = Math.ceil(remainingMs / 60000);
      actionHtml = `
        <div style="display:flex; justify-content: flex-end;">
          <button class="btn-secondary btn-small" disabled title="Available in ${remainingMin}m">Wait ${remainingMin}m</button>
        </div>
      `;
    } else {
      actionHtml = `
        <div style="display:flex; justify-content: flex-end;">
          <button class="btn-secondary btn-small" onclick="completeTask('${t.id}')">Mark Complete</button>
        </div>
      `;
    }
  }

  tr.innerHTML = `
    <td>
      <div style="font-weight:600; color:#d8e6e3;">${escapeHtml(t.title)}</div>
    </td>
    <td><span class="status-badge status-${t.status}">${t.status}</span></td>
    <td style="max-width: 300px;">
      <div title="${escapeHtml(t.description || '')}" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size:12px; color:var(--muted); line-height: 1.4; position: relative;">
        ${escapeHtml(t.description || '')}
      </div>
    </td>
    <td style="font-size:12px; color:var(--muted-light);">${formatIST(t.updated_at, t.status)}</td>
    <td>${actionHtml}</td>
  `;

  return tr;
}

async function openTask(id) {
  await api(`/api/employee/tasks/${id}/open`, { method: 'POST' });
  await loadTasks();
}

async function completeTask(id) {
  await api(`/api/employee/tasks/${id}/complete`, { method: 'POST' });
  await loadTasks();
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatIST(isoString, status) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const formatted = date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const map = { 'pending': 'Assigned', 'open': 'Opened', 'completed': 'Completed', 'history': 'Reviewed' };
  return `${map[status] || 'Updated'}: ${formatted}`;
}

init();
