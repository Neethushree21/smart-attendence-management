/**
 * auth.js — Login and Registration logic
 */

let selectedRole = 'student';

// ── Role Selector ─────────────────────────────────────────────────────────────
function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  // Show/hide conditional fields
  document.getElementById('student-fields').style.display = role === 'student' ? 'block' : 'none';
  document.getElementById('teacher-fields').style.display = role === 'teacher' ? 'block' : 'none';
}

// ── Tab Switch ────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('login-form').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('auth-alert').style.display = 'none';
}

// ── Show Alert ────────────────────────────────────────────────────────────────
function showAlert(message, type = 'error') {
  const el = document.getElementById('auth-alert');
  el.className = `alert alert-${type}`;
  el.innerHTML = (type === 'error' ? '❌ ' : '✅ ') + message;
  el.style.display = 'flex';
}

// ── Redirect After Login ──────────────────────────────────────────────────────
function redirectByRole(role) {
  const pages = { student: 'student.html', teacher: 'teacher.html', admin: 'admin.html' };
  window.location.href = pages[role] || 'index.html';
}

// ── Login Handler ─────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Logging in…';

  try {
    const data = await api.login({
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value,
    });
    setAuth(data.token, data.user);
    showAlert('Login successful! Redirecting…', 'success');
    setTimeout(() => redirectByRole(data.user.role), 800);
  } catch (err) {
    showAlert(err.message || 'Login failed. Check credentials.');
    btn.disabled = false;
    btn.textContent = '🔐 Login';
  }
});

// ── Register Handler ──────────────────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  const payload = {
    name: document.getElementById('reg-name').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
    role: selectedRole,
    department: document.getElementById('reg-department').value.trim(),
  };

  if (selectedRole === 'student') {
    payload.rollNumber = document.getElementById('reg-roll').value.trim();
    payload.semester = parseInt(document.getElementById('reg-semester').value);
  }
  if (selectedRole === 'teacher') {
    payload.employeeId = document.getElementById('reg-empid').value.trim();
  }

  try {
    const data = await api.register(payload);
    setAuth(data.token, data.user);
    showAlert('Account created! Redirecting…', 'success');
    setTimeout(() => redirectByRole(data.user.role), 800);
  } catch (err) {
    showAlert(err.message || 'Registration failed.');
    btn.disabled = false;
    btn.textContent = '✨ Create Account';
  }
});

// ── On Page Load: redirect if already logged in ───────────────────────────────
window.addEventListener('load', () => {
  const user = getUser();
  const token = getToken();
  if (user && token) redirectByRole(user.role);
});
