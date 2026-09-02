/**
 * student.js — Student dashboard logic
 */

let subjectChart = null;
let qrScanner = null;
let scannerActive = false;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  const user = requireAuth('student');
  if (!user) return;

  document.getElementById('user-name').textContent = user.name;
  document.getElementById('student-info').textContent =
    `${user.rollNumber || 'N/A'} | ${user.department || 'N/A'} | Semester ${user.semester || 'N/A'}`;

  await loadDashboard();
});

async function loadDashboard() {
  try {
    const data = await api.studentDashboard();
    renderStats(data.stats);
    renderSubjectTable(data.classes);
    renderChart(data.classes);
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function renderStats(stats) {
  document.getElementById('stat-classes').textContent = stats.totalClasses;
  document.getElementById('stat-avg').textContent = stats.avgAttendance + '%';
  document.getElementById('stat-low').textContent = stats.lowAttendanceCount;

  if (stats.lowAttendanceCount > 0) {
    document.getElementById('low-alert').style.display = 'flex';
    document.getElementById('low-badge').style.display = 'block';
  }
}

// ── Subject Table ─────────────────────────────────────────────────────────────
function renderSubjectTable(classes) {
  document.getElementById('subjects-loading').style.display = 'none';
  document.getElementById('subjects-list').style.display = 'block';
  const tbody = document.getElementById('subjects-table');

  if (!classes.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Not enrolled in any class yet</td></tr>`;
    return;
  }

  tbody.innerHTML = classes.map(cls => {
    const color = barColor(cls.percentage);
    const pcolor = pctColor(cls.percentage);
    const status = cls.isLow
      ? `<span class="stat-badge badge-red">⚠️ Low</span>`
      : `<span class="stat-badge badge-green">✅ Good</span>`;
    return `
      <tr>
        <td>${cls.subjectName}</td>
        <td><span class="stat-badge badge-blue">${cls.subjectCode}</span></td>
        <td>${cls.teacher}</td>
        <td>${cls.attended}</td>
        <td>${cls.totalSessions}</td>
        <td>
          <div class="pct-ring">
            <span class="${pcolor} pct-val" style="font-size:1rem;">${cls.percentage}%</span>
          </div>
          <div class="attendance-bar">
            <div class="attendance-bar-fill ${color}" style="width:${cls.percentage}%;"></div>
          </div>
        </td>
        <td>${status}</td>
        <td><button class="btn btn-outline btn-sm" onclick="viewHistory('${cls.classId}','${cls.subjectName}')">History</button></td>
      </tr>`;
  }).join('');
}

// ── Chart ─────────────────────────────────────────────────────────────────────
function renderChart(classes) {
  if (!classes.length) return;
  const ctx = document.getElementById('subjectChart').getContext('2d');

  if (subjectChart) subjectChart.destroy();

  const colors = classes.map(c => c.percentage >= 75 ? '#10b981' : c.percentage >= 60 ? '#f59e0b' : '#ef4444');

  subjectChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: classes.map(c => c.subjectCode),
      datasets: [{
        label: 'Attendance %',
        data: classes.map(c => c.percentage),
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => classes[items[0].dataIndex]?.subjectName || '',
            label: (item) => ` Attendance: ${item.raw}%`,
          }
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: {
          ticks: { color: '#94a3b8', callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.05)' },
          min: 0, max: 100,
        }
      }
    }
  });
}

// ── Attendance History Modal ───────────────────────────────────────────────────
async function viewHistory(classId, subjectName) {
  document.getElementById('history-title').textContent = `📋 ${subjectName} — Attendance History`;
  document.getElementById('history-content').innerHTML = '<div class="spinner"></div>';
  document.getElementById('history-modal').classList.add('open');

  try {
    const data = await api.studentAttendance(classId);
    const records = data.records;
    if (!records.length) {
      document.getElementById('history-content').innerHTML =
        '<div class="empty"><div class="empty-icon">📭</div><p>No attendance records yet</p></div>';
      return;
    }
    document.getElementById('history-content').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Session</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${r.sessionId?.sessionTitle || 'Session'}</td>
                <td>${fmtDate(r.date)}</td>
                <td>${fmtTime(r.markedAt)}</td>
                <td><span class="stat-badge badge-green">✅ Present</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    document.getElementById('history-content').innerHTML = `<div class="alert alert-error">Failed to load: ${err.message}</div>`;
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── QR Scanner ────────────────────────────────────────────────────────────────
function toggleScanner() {
  if (scannerActive) stopScanner();
  else startScanner();
}

function startScanner() {
  document.getElementById('scan-result').style.display = 'none';
  document.getElementById('scan-btn').textContent = 'Stop Scanner';
  scannerActive = true;

  qrScanner = new Html5Qrcode('qr-reader');
  qrScanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decodedText) => onQRScanned(decodedText),
    () => {} // ignore scan errors
  ).catch((err) => {
    showToast('Camera access denied: ' + err, 'error');
    stopScanner();
  });
}

function stopScanner() {
  if (qrScanner) {
    qrScanner.stop().catch(() => {});
    qrScanner.clear();
    qrScanner = null;
  }
  document.getElementById('scan-btn').textContent = 'Start Scanner';
  scannerActive = false;
}

async function onQRScanned(raw) {
  stopScanner();

  let token;
  try {
    const parsed = JSON.parse(raw);
    token = parsed.token;
  } catch {
    token = raw; // if raw token (not JSON)
  }

  const resultEl = document.getElementById('scan-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<div class="spinner"></div>';

  try {
    const data = await api.markAttendance(token);
    resultEl.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
    showToast('Attendance marked successfully!', 'success');
    setTimeout(loadDashboard, 1500);
  } catch (err) {
    resultEl.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
    showToast(err.message, 'error');
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  clearAuth();
  window.location.href = 'index.html';
}
