/**
 * teacher.js — Teacher dashboard logic
 */

let reportChart = null;
let qrTimerInterval = null;
let selectedClassId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  const user = requireAuth('teacher');
  if (!user) return;
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('teacher-info').textContent =
    `Employee ID: ${user.employeeId || 'N/A'} | ${user.department || 'N/A'}`;

  await loadClasses();
  await loadSessions();
  await loadAllStudents();
});

// ── Tab Switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    const tabs = ['classes', 'sessions', 'attendance', 'students'];
    b.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.tab-content').forEach((tc) => tc.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function logout()      { clearAuth(); window.location.href = 'index.html'; }

// ── Load Classes ──────────────────────────────────────────────────────────────
let teacherClasses = [];
async function loadClasses() {
  try {
    const data = await api.getTeacherClasses();
    teacherClasses = data.classes;
    renderClassCards(teacherClasses);
    populateSelects(teacherClasses);
  } catch (err) { showToast('Failed to load classes: ' + err.message, 'error'); }
}

function renderClassCards(classes) {
  document.getElementById('classes-loading').style.display = 'none';
  const grid = document.getElementById('classes-grid');
  grid.style.display = 'grid';

  if (!classes.length) {
    grid.innerHTML = `<div class="empty col-12"><div class="empty-icon">📭</div><p>No classes yet. Create your first class!</p></div>`;
    return;
  }
  grid.innerHTML = classes.map(cls => `
    <div class="card">
      <div class="card-header">
        <h3>${cls.subjectName} <span class="stat-badge badge-blue" style="font-size:0.7rem;">${cls.subjectCode}</span></h3>
      </div>
      <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:16px;">
        📁 ${cls.department || 'N/A'} &nbsp;|&nbsp; Sem ${cls.semester || '—'}
      </div>
      <div class="stat-grid" style="grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:800; color:var(--accent-blue);">${cls.studentIds?.length || 0}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Students</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:800; color:var(--accent-purple);">${cls.totalSessions || 0}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Sessions</div>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" style="width:100%;" onclick="quickStartSession('${cls._id}', '${cls.subjectName}')">
        📡 Start Session
      </button>
    </div>`).join('');
}

function populateSelects(classes) {
  const qrSel   = document.getElementById('qr-class-select');
  const rptSel  = document.getElementById('report-class-select');
  const enrlSel = document.getElementById('enroll-class-select');
  const opts = classes.map(c => `<option value="${c._id}">${c.subjectName} (${c.subjectCode})</option>`).join('');
  qrSel.innerHTML   = opts || '<option>No classes yet</option>';
  rptSel.innerHTML  = `<option value="">-- Select a class --</option>` + opts;
  enrlSel.innerHTML = opts || '<option>No classes yet</option>';
}

// ── Create Class ──────────────────────────────────────────────────────────────
async function createClass(e) {
  e.preventDefault();
  const alertEl = document.getElementById('class-form-alert');
  try {
    await api.createClass({
      subjectName: document.getElementById('cls-name').value,
      subjectCode: document.getElementById('cls-code').value,
      department:  document.getElementById('cls-dept').value,
      semester:    parseInt(document.getElementById('cls-sem').value),
    });
    showToast('Class created!', 'success');
    closeModal('create-class-modal');
    await loadClasses();
  } catch (err) {
    alertEl.className = 'alert alert-error';
    alertEl.textContent = err.message;
    alertEl.style.display = 'block';
  }
}

// ── Load Sessions ─────────────────────────────────────────────────────────────
async function loadSessions() {
  try {
    const data = await api.getSessions();
    document.getElementById('sessions-loading').style.display = 'none';
    document.getElementById('sessions-list').style.display = 'block';
    const tbody = document.getElementById('sessions-table');
    if (!data.sessions.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No sessions yet</td></tr>`;
      return;
    }
    tbody.innerHTML = data.sessions.map(s => {
      const expired = s.isExpired || !s.isActive;
      const badge = expired
        ? `<span class="stat-badge badge-red">Expired</span>`
        : `<span class="stat-badge badge-green">Active</span>`;
      return `<tr>
        <td>${s.classId?.subjectName || 'N/A'} <span style="color:var(--text-muted);">(${s.classId?.subjectCode})</span></td>
        <td>${s.sessionTitle}</td>
        <td>${fmtDate(s.createdAt)} ${fmtTime(s.createdAt)}</td>
        <td>${fmtDate(s.expiresAt)} ${fmtTime(s.expiresAt)}</td>
        <td>${s.attendanceCount || 0}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  } catch (err) { showToast('Failed to load sessions', 'error'); }
}

// ── Generate QR ────────────────────────────────────────────────────────────────
async function generateQR() {
  const classId = document.getElementById('qr-class-select').value;
  const title   = document.getElementById('qr-session-title').value;
  if (!classId) return showToast('Please select a class', 'error');

  try {
    const data = await api.generateQR({ classId, sessionTitle: title || undefined });
    const session = data.session;

    document.getElementById('qr-form-section').style.display = 'none';
    document.getElementById('qr-display-section').style.display = 'block';
    document.getElementById('qr-image').src = session.qrImage;

    startQRTimer(session.expiresAt, session.id);
    await loadSessions();
    showToast('Session started! QR code is live.', 'success');
  } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

function quickStartSession(classId, name) {
  document.getElementById('qr-class-select').value = classId;
  document.getElementById('qr-session-title').value = `Session - ${new Date().toLocaleDateString()}`;
  document.getElementById('qr-form-section').style.display = 'block';
  document.getElementById('qr-display-section').style.display = 'none';
  openModal('generate-qr-modal');
}

function startQRTimer(expiresAt, sessionId) {
  const countdown = document.getElementById('qr-countdown');

  qrTimerInterval = setInterval(async () => {
    const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    countdown.textContent = `${m}:${s}`;

    if (remaining === 0) {
      stopTimer();
      countdown.classList.add('expired');
      countdown.textContent = 'EXPIRED';
    }

    // Live attendance count every 10s
    if (remaining % 10 === 0 && sessionId) {
      try {
        const data = await api.getSessions();
        const sess = data.sessions.find(s => s._id === sessionId);
        if (sess) document.getElementById('live-count').textContent = sess.attendanceCount || 0;
      } catch {}
    }
  }, 1000);
}

function stopTimer() {
  if (qrTimerInterval) { clearInterval(qrTimerInterval); qrTimerInterval = null; }
  // Reset modal
  document.getElementById('qr-form-section').style.display = 'block';
  document.getElementById('qr-display-section').style.display = 'none';
  document.getElementById('qr-countdown').classList.remove('expired');
}

// ── Attendance Report ─────────────────────────────────────────────────────────
let currentReportClassId = null;
async function loadReport() {
  const classId = document.getElementById('report-class-select').value;
  if (!classId) return;
  currentReportClassId = classId;

  document.getElementById('report-loading').style.display = 'block';
  document.getElementById('report-container').style.display = 'none';

  try {
    const data = await api.getClassAttendance(classId);
    document.getElementById('report-loading').style.display = 'none';
    document.getElementById('report-container').style.display = 'block';
    document.getElementById('report-title').textContent =
      `📋 ${data.class?.subjectName} (${data.class?.subjectCode})`;

    renderReportTable(data.attendance);
    renderReportChart(data.attendance);
  } catch (err) {
    document.getElementById('report-loading').style.display = 'none';
    showToast('Failed to load report', 'error');
  }
}

function renderReportTable(rows) {
  const tbody = document.getElementById('report-table');
  tbody.innerHTML = rows.map(r => {
    const cls = r.percentage >= 75 ? 'badge-green' : r.percentage >= 60 ? 'badge-orange' : 'badge-red';
    return `<tr>
      <td>${r.student.name}</td>
      <td>${r.student.rollNumber || 'N/A'}</td>
      <td>${r.totalPresent}</td>
      <td>${r.totalSessions}</td>
      <td>
        <span class="stat-badge ${cls}">${r.percentage}%</span>
        <div class="attendance-bar"><div class="attendance-bar-fill ${barColor(r.percentage)}" style="width:${r.percentage}%"></div></div>
      </td>
      <td>${r.percentage >= 75
        ? `<span class="stat-badge badge-green">✅ Good</span>`
        : `<span class="stat-badge badge-red">⚠️ Low</span>`}</td>
    </tr>`;
  }).join('');
}

function renderReportChart(rows) {
  if (reportChart) reportChart.destroy();
  const ctx = document.getElementById('reportChart').getContext('2d');
  reportChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Above 75%', '60–74%', 'Below 60%'],
      datasets: [{
        data: [
          rows.filter(r => r.percentage >= 75).length,
          rows.filter(r => r.percentage >= 60 && r.percentage < 75).length,
          rows.filter(r => r.percentage < 60).length,
        ],
        backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'],
        borderColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 13 } }
        }
      }
    }
  });
}

function downloadCSV() {
  if (!currentReportClassId) return;
  const url = `http://localhost:5000/api/teacher/attendance/${currentReportClassId}?download=csv`;
  const a = document.createElement('a');
  a.href = url + `&token=${getToken()}`;
  // Use Authorization in header for the real download — fallback to window open
  window.open(`http://localhost:5000/api/teacher/attendance/${currentReportClassId}?download=csv`, '_blank');
}

// ── Load All Students for enrollment ──────────────────────────────────────────
let allStudents = [];
async function loadAllStudents() {
  try {
    const data = await api.getAllStudents();
    allStudents = data.students;
    document.getElementById('students-loading').style.display = 'none';
    const grid = document.getElementById('students-grid');
    grid.style.display = 'grid';
    grid.innerHTML = allStudents.map(s => `
      <label style="display:flex; align-items:center; gap:10px; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:12px; cursor:pointer; transition:var(--transition);">
        <input type="checkbox" value="${s._id}" style="width:16px;height:16px;accent-color:var(--accent-blue);" />
        <div>
          <div style="font-weight:600; font-size:0.88rem;">${s.name}</div>
          <div style="font-size:0.76rem; color:var(--text-muted);">${s.rollNumber || 'N/A'} | ${s.department || 'N/A'}</div>
        </div>
      </label>`).join('');
  } catch (err) { showToast('Failed to load students', 'error'); }
}

async function enrollStudents() {
  const classId = document.getElementById('enroll-class-select').value;
  if (!classId) return showToast('Select a class first', 'error');

  const checked = [...document.querySelectorAll('#students-grid input[type=checkbox]:checked')];
  if (!checked.length) return showToast('Select at least one student', 'error');

  try {
    await api.addStudents(classId, { studentIds: checked.map(c => c.value) });
    showToast(`${checked.length} student(s) enrolled!`, 'success');
    checked.forEach(c => c.checked = false);
    await loadClasses();
  } catch (err) { showToast('Enrollment failed: ' + err.message, 'error'); }
}
