/**
 * admin.js — Admin dashboard logic
 */

let dailyChart = null, subjectChart = null;
let allUsers = [];
let currentFilter = '';

window.addEventListener('load', async () => {
  const user = requireAuth('admin');
  if (!user) return;
  document.getElementById('user-name').textContent = user.name;
  await loadStats();
});

function switchTab(tab) {
  const tabs = ['overview', 'users', 'classes-tab', 'low-att'];
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', tabs[i] === tab));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
}

function logout() { clearAuth(); window.location.href = 'index.html'; }

// ── Stats & Charts ────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await api.adminStats();
    const s = data.stats;
    document.getElementById('stat-students').textContent = s.totalStudents;
    document.getElementById('stat-teachers').textContent = s.totalTeachers;
    document.getElementById('stat-classes').textContent  = s.totalClasses;
    document.getElementById('stat-sessions').textContent = s.totalSessions;
    document.getElementById('stat-rate').textContent     = s.overallRate + '%';
    document.getElementById('rate-badge').textContent    = s.overallRate >= 75 ? '✅ Good' : '⚠️ Low';

    renderDailyChart(data.dailyTrend);
    renderSubjectChart(data.subjectAttendance);
  } catch (err) { showToast('Failed to load stats: ' + err.message, 'error'); }
}

function renderDailyChart(trend) {
  if (dailyChart) dailyChart.destroy();
  const ctx = document.getElementById('dailyChart').getContext('2d');
  dailyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.map(d => d._id),
      datasets: [{
        label: 'Students Present',
        data: trend.map(d => d.count),
        borderColor: '#6c63ff',
        backgroundColor: 'rgba(108,99,255,0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6c63ff',
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  });
}

function renderSubjectChart(subjects) {
  if (subjectChart) subjectChart.destroy();
  const ctx = document.getElementById('subjectChart').getContext('2d');
  const palette = ['#6c63ff','#a855f7','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316','#8b5cf6'];

  subjectChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: subjects.map(s => s.subjectCode),
      datasets: [{
        label: 'Attendance Count',
        data: subjects.map(s => s.presentCount),
        backgroundColor: subjects.map((_, i) => palette[i % palette.length] + 'aa'),
        borderColor: subjects.map((_, i) => palette[i % palette.length]),
        borderWidth: 2, borderRadius: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers(role) {
  currentFilter = role || '';
  document.getElementById('users-loading').style.display = 'block';
  document.getElementById('users-table-container').style.display = 'none';
  try {
    const data = await api.adminUsers(currentFilter);
    allUsers = data.users;
    renderUsers(allUsers);
  } catch (err) { showToast('Failed to load users', 'error'); }
}

function filterUsers(role) { loadUsers(role); }

function renderUsers(users) {
  document.getElementById('users-loading').style.display = 'none';
  document.getElementById('users-table-container').style.display = 'block';

  if (!users.length) {
    document.getElementById('users-table').innerHTML =
      `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No users found</td></tr>`;
    return;
  }
  const roleIcon = { student: '🧑‍🎓', teacher: '👩‍🏫', admin: '🔴' };
  const roleBadge = { student: 'badge-green', teacher: 'badge-blue', admin: 'badge-red' };

  document.getElementById('users-table').innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td style="color:var(--text-muted);">${u.email}</td>
      <td><span class="stat-badge ${roleBadge[u.role]}">${roleIcon[u.role]} ${u.role}</span></td>
      <td style="font-size:0.8rem; color:var(--text-muted);">${u.rollNumber || u.employeeId || '—'}</td>
      <td style="font-size:0.8rem;">${fmtDate(u.createdAt)}</td>
      <td>${u.isActive
        ? `<span class="stat-badge badge-green">Active</span>`
        : `<span class="stat-badge badge-red">Inactive</span>`}</td>
      <td><button class="btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}" onclick="toggleUser('${u._id}')">
        ${u.isActive ? 'Deactivate' : 'Activate'}
      </button></td>
    </tr>`).join('');
}

async function toggleUser(userId) {
  try {
    await api.toggleUserStatus(userId);
    showToast('User status updated', 'success');
    await loadUsers(currentFilter);
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

// ── Classes ───────────────────────────────────────────────────────────────────
async function loadClasses() {
  document.getElementById('all-classes-loading').style.display = 'block';
  document.getElementById('all-classes-container').style.display = 'none';
  try {
    const data = await api.adminClasses();
    document.getElementById('all-classes-loading').style.display = 'none';
    document.getElementById('all-classes-container').style.display = 'block';

    if (!data.classes.length) {
      document.getElementById('all-classes-table').innerHTML =
        `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No classes found</td></tr>`;
      return;
    }

    document.getElementById('all-classes-table').innerHTML = data.classes.map(c => `
      <tr>
        <td>${c.subjectName}</td>
        <td><span class="stat-badge badge-blue">${c.subjectCode}</span></td>
        <td>${c.teacherId?.name || 'N/A'}</td>
        <td>${c.department || '—'}</td>
        <td>${c.semester || '—'}</td>
        <td>${c.totalEnrolled}</td>
        <td>${c.totalSessions}</td>
      </tr>`).join('');
  } catch (err) { showToast('Failed to load classes', 'error'); }
}

// ── Low Attendance ────────────────────────────────────────────────────────────
async function loadLowAttendance() {
  const threshold = document.getElementById('threshold-select').value;
  document.getElementById('low-loading').style.display = 'block';
  document.getElementById('low-container').style.display = 'none';
  try {
    const data = await api.lowAttendance(threshold);
    document.getElementById('low-loading').style.display = 'none';
    document.getElementById('low-container').style.display = 'block';

    const infoEl = document.getElementById('low-count-info');
    infoEl.innerHTML = data.count > 0
      ? `⚠️ Found <strong>${data.count}</strong> student-subject combination(s) below ${threshold}%`
      : `✅ No students below ${threshold}% attendance`;
    infoEl.className = data.count > 0 ? 'alert alert-warning' : 'alert alert-success';

    if (!data.students.length) {
      document.getElementById('low-table').innerHTML =
        `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No low attendance found 🎉</td></tr>`;
      return;
    }

    document.getElementById('low-table').innerHTML = data.students.map(item => `
      <tr>
        <td>${item.student.name}</td>
        <td>${item.student.rollNumber || 'N/A'}</td>
        <td>${item.subjectName} <span style="color:var(--text-muted);">(${item.subjectCode})</span></td>
        <td>${item.attended}</td>
        <td>${item.totalSessions}</td>
        <td>
          <span class="stat-badge ${item.percentage < 60 ? 'badge-red' : 'badge-orange'}">
            ${item.percentage}%
          </span>
          <div class="attendance-bar">
            <div class="attendance-bar-fill ${barColor(item.percentage)}" style="width:${item.percentage}%"></div>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    showToast('Failed to load low attendance: ' + err.message, 'error');
    document.getElementById('low-loading').style.display = 'none';
  }
}
