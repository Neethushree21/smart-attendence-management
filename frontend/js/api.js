/**
 * api.js — Shared API utility
 * Handles all fetch calls to the backend with JWT auth headers
 */

const API_BASE =
  window.location.protocol === "file:"
    ? "http://localhost:5001/api"
    : `${window.location.origin}/api`;

// ── Token Storage ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("token");
const getUser = () => JSON.parse(localStorage.getItem("user") || "null");

const setAuth = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// ── Base Fetch ───────────────────────────────────────────────────────────────
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch (error) {
    throw new Error(
      "Cannot connect to the server. Start the backend and try again.",
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

// ── Auth Helpers ─────────────────────────────────────────────────────────────
const api = {
  // Auth
  register: (body) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  getMe: () => apiFetch("/auth/me"),

  // Student
  studentDashboard: () => apiFetch("/student/dashboard"),
  studentAttendance: (classId) => apiFetch(`/student/attendance/${classId}`),

  // Teacher
  createClass: (body) =>
    apiFetch("/teacher/classes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getTeacherClasses: () => apiFetch("/teacher/classes"),
  addStudents: (id, body) =>
    apiFetch(`/teacher/classes/${id}/students`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSessions: () => apiFetch("/teacher/sessions"),
  getClassAttendance: (classId) => apiFetch(`/teacher/attendance/${classId}`),
  getAllStudents: () => apiFetch("/teacher/students"),

  // QR
  generateQR: (body) =>
    apiFetch("/qr/generate", { method: "POST", body: JSON.stringify(body) }),
  verifyQR: (token) =>
    apiFetch("/qr/verify", {
      method: "POST",
      body: JSON.stringify({ qrToken: token }),
    }),

  // Attendance
  markAttendance: (qrToken) =>
    apiFetch("/attendance/mark", {
      method: "POST",
      body: JSON.stringify({ qrToken }),
    }),
  getAttendance: (studentId) => apiFetch(`/attendance/${studentId}`),

  // Admin
  adminStats: () => apiFetch("/admin/stats"),
  adminUsers: (role) => apiFetch(`/admin/users${role ? `?role=${role}` : ""}`),
  adminClasses: () => apiFetch("/admin/classes"),
  lowAttendance: (threshold) =>
    apiFetch(`/admin/low-attendance?threshold=${threshold || 75}`),
  toggleUserStatus: (userId) =>
    apiFetch(`/admin/users/${userId}/toggle`, { method: "PUT" }),
};

// ── Toast Notifications ──────────────────────────────────────────────────────
const showToast = (message, type = "success") => {
  const container =
    document.getElementById("toast-container") ||
    (() => {
      const el = document.createElement("div");
      el.id = "toast-container";
      document.body.appendChild(el);
      return el;
    })();

  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// ── Route Guard ──────────────────────────────────────────────────────────────
const requireAuth = (expectedRole) => {
  const user = getUser();
  const token = getToken();
  if (!token || !user) {
    window.location.href = "/index.html";
    return false;
  }
  if (expectedRole && user.role !== expectedRole) {
    showToast("Access denied for your role", "error");
    window.location.href = "/index.html";
    return false;
  }
  return user;
};

// ── Format helpers ───────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
const pctColor = (p) =>
  p >= 75 ? "pct-green" : p >= 60 ? "pct-orange" : "pct-red";
const barColor = (p) =>
  p >= 75 ? "fill-green" : p >= 60 ? "fill-orange" : "fill-red";
