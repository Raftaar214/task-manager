let employees = [];
let allTasks = [];

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

async function init() {
  const me = await api('/api/auth/me');
  if (!me) return;
  document.getElementById('managerName').textContent = me.name;

  await loadEmployees();
  await loadTasks();
}

async function loadEmployees() {
  const rawEmployees = await api('/api/manager/employees');
  employees = rawEmployees.sort((a, b) => a.name.localeCompare(b.name));

  const manageSelect = document.getElementById('manageEmployeeSelect');
  manageSelect.innerHTML = '<option value="" disabled selected>Select an employee</option>' + 
    employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (@${escapeHtml(e.username)})</option>`).join('');

  const select = document.getElementById('taskEmployee');
  select.innerHTML = '<option value="" disabled selected>Select an employee</option>' + 
    employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  
  const filterSelect = document.getElementById('taskFilterEmployee');
  const currentFilter = filterSelect.value;
  filterSelect.innerHTML = '<option value="all">All Employees</option>' + 
    employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  filterSelect.value = currentFilter || 'all';
}

async function resetPassword(id, name) {
  const newPassword = prompt(`New password for ${name}:`);
  if (!newPassword) return;
  try {
    await api(`/api/manager/employees/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password: newPassword }),
    });
    alert(`Password updated. Share it with ${name} directly — it won't be shown again here.`);
    document.getElementById('manageEmployeeSelect').value = '';
  } catch (err) {
    alert(err.message);
  }
}

async function removeEmployee(id) {
  if (!confirm('Remove this employee? Their tasks will be deleted too.')) return;
  await api(`/api/manager/employees/${id}`, { method: 'DELETE' });
  await loadEmployees();
  await loadTasks();
}

async function loadTasks() {
  allTasks = await api('/api/manager/tasks');
  renderTasksTable();
}

function renderTasksTable() {
  const tbody = document.getElementById('managerTasksTableBody');
  const filterEmployeeId = document.getElementById('taskFilterEmployee').value;
  const filterStatus = document.getElementById('taskFilterStatus').value;
  
  let filteredTasks = allTasks;
  
  if (filterEmployeeId !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.employee_id == filterEmployeeId);
  }
  if (filterStatus !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }

  tbody.innerHTML = filteredTasks.length ? '' : '<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--muted);">No tasks found.</td></tr>';
  filteredTasks.forEach(t => tbody.appendChild(renderTaskRow(t)));
}

document.getElementById('taskFilterEmployee').addEventListener('change', renderTasksTable);
document.getElementById('taskFilterStatus').addEventListener('change', renderTasksTable);

function renderTaskRow(t) {
  const tr = document.createElement('tr');
  const empUsername = t.employees ? t.employees.username : '';
  const empName = t.employees ? t.employees.name : '';
  
  let actionHtml = '';
  if (t.status === 'completed') {
    actionHtml = `
      <div style="display:flex; justify-content: flex-end; gap: 8px;">
        <button class="btn-secondary btn-small" onclick="reviewTask('${t.id}', true)">Approve</button>
        <button class="btn-secondary btn-small" onclick="reviewTask('${t.id}', false)" style="color:var(--pink);border-color:rgba(239,115,156,0.2)">Send back</button>
        <button class="btn-secondary btn-small" onclick="deleteTask('${t.id}')" style="color:var(--pink);border-color:rgba(239,115,156,0.2)">Delete</button>
      </div>
    `;
  } else {
    actionHtml = `
      <div style="display:flex; justify-content: flex-end;">
        <button class="btn-secondary btn-small" onclick="deleteTask('${t.id}')" style="color:var(--pink);border-color:rgba(239,115,156,0.2)">Delete Task</button>
      </div>
    `;
  }
  
  tr.innerHTML = `
    <td>
      <div style="font-weight:500;">${escapeHtml(empName)}</div>
      <div style="font-size:11px; color:var(--muted);">@${escapeHtml(empUsername)}</div>
    </td>
    <td><span class="status-badge status-${t.status}">${t.status}</span></td>
    <td>
      <div style="font-weight:600; color:#d8e6e3;">${escapeHtml(t.title)}</div>
    </td>
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

async function reviewTask(id, approve) {
  await api(`/api/manager/tasks/${id}/review`, { method: 'POST', body: JSON.stringify({ approve }) });
  await loadTasks();
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to permanently delete this task?')) return;
  try {
    await api(`/api/manager/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('empName').value.trim();
  const username = document.getElementById('empUsername').value.trim();
  const password = document.getElementById('empPassword').value;
  try {
    await api('/api/manager/employees', { method: 'POST', body: JSON.stringify({ name, username, password }) });
    e.target.reset();
    await loadEmployees();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('globalResetBtn').addEventListener('click', () => {
    const select = document.getElementById('manageEmployeeSelect');
    const id = select.value;
    if (!id) return alert('Please select an employee first.');
    const emp = employees.find(e => e.id == id);
    if (emp) resetPassword(emp.id, emp.name);
});

document.getElementById('globalRemoveBtn').addEventListener('click', () => {
    const select = document.getElementById('manageEmployeeSelect');
    const id = select.value;
    if (!id) return alert('Please select an employee first.');
    removeEmployee(id);
});

document.getElementById('assignTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const employee_id = document.getElementById('taskEmployee').value;
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  try {
    await api('/api/manager/tasks', { method: 'POST', body: JSON.stringify({ employee_id, title, description }) });
    e.target.reset();
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
});

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
