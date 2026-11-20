// ==========================================================================
// HENGKI HONDA JPA
// admin-auth.js - Otentikasi Admin Firebase
// ==========================================================================

import { 
  auth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  isFirebaseConfigured,
  firebaseConfig
} from "../../js/firebase-config.js";

import { adminConfirm } from "./admin-dialogs.js";

// Check current page
const isLoginPage = window.location.pathname.endsWith("login.html") || 
                    window.location.pathname.endsWith("login") || 
                    window.location.pathname.includes("login.html");

// Pre-fill remembered email on login page
const emailInput = document.getElementById("admin-email");
if (emailInput && isLoginPage) {
  const savedEmail = localStorage.getItem("admin_last_email");
  if (savedEmail) {
    emailInput.value = savedEmail;
  }
}

// Password show/hide toggle
const togglePwdBtn = document.getElementById("btn-toggle-pwd");
const pwdInput = document.getElementById("admin-password");
const togglePwdIcon = document.getElementById("toggle-pwd-icon");
if (togglePwdBtn && pwdInput) {
  togglePwdBtn.addEventListener("click", () => {
    if (pwdInput.type === "password") {
      pwdInput.type = "text";
      if (togglePwdIcon) togglePwdIcon.className = "fa-regular fa-eye-slash";
    } else {
      pwdInput.type = "password";
      if (togglePwdIcon) togglePwdIcon.className = "fa-regular fa-eye";
    }
  });
}

// Auth State Observer
if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (isLoginPage) {
        window.location.href = "index.html";
      } else {
        const emailDisplay = document.getElementById("admin-user-email");
        if (emailDisplay) emailDisplay.textContent = user.email || "Admin";
      }
    } else {
      const localSess = sessionStorage.getItem("admin_session_auth");
      if (!localSess && !isLoginPage) {
        window.location.href = "login.html";
      }
    }
  });
} else {
  // Offline or Firebase config incomplete (Waiting for Web API Key)
  if (!isLoginPage) {
    const localSess = sessionStorage.getItem("admin_session_auth");
    if (!localSess) {
      window.location.href = "login.html";
    } else {
      const emailDisplay = document.getElementById("admin-user-email");
      if (emailDisplay) emailDisplay.textContent = localStorage.getItem("admin_last_email") || "Admin (Mode Konfigurasi)";
    }
  }
}

// Handle Login Form on login.html
const loginForm = document.getElementById("admin-login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;
    const rememberMe = document.getElementById("admin-remember")?.checked;
    const alertBox = document.getElementById("login-alert");
    const alertText = document.getElementById("login-alert-text");
    const btnLogin = document.getElementById("btn-login");
    const btnText = document.getElementById("btn-login-text");
    const btnSpinner = document.getElementById("btn-login-spinner");

    alertBox.style.display = "none";
    btnLogin.disabled = true;
    btnText.style.display = "none";
    btnSpinner.style.display = "inline-block";

    try {
      if (auth && isFirebaseConfigured) {
        // Authenticate with Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // If Firebase API Key is not yet filled, allow setup session with credentials
        if (!password || password.length < 4) {
          throw new Error("Silakan masukkan password yang valid.");
        }
        sessionStorage.setItem("admin_session_auth", "active");
      }

      if (rememberMe) {
        localStorage.setItem("admin_last_email", email);
      } else {
        localStorage.removeItem("admin_last_email");
      }

      window.location.href = "index.html";
    } catch (err) {
      console.error("Login failed:", err);
      btnLogin.disabled = false;
      btnText.style.display = "inline-block";
      btnSpinner.style.display = "none";

      let msg = "Terjadi kesalahan saat masuk. Silakan coba lagi.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Email atau kata sandi salah. Pastikan akun telah didaftarkan di Firebase Console Authentication.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Format email tidak valid. Periksa penulisan email Anda.";
      } else if (err.code === "auth/user-disabled") {
        msg = "Akun administrator ini dinonaktifkan di Firebase Console.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat lagi.";
      } else if (err.code === "auth/network-request-failed") {
        msg = "Gagal terhubung ke Firebase. Periksa koneksi internet Anda.";
      } else if (err.message) {
        msg = err.message;
      }

      alertText.textContent = msg;
      alertBox.style.display = "flex";
    }
  });
}

// Handle Logout Button
const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const confirmed = await adminConfirm(
      "Apakah Anda yakin ingin keluar dari Dashboard Administrator HENGKI HONDA JPA?",
      "Konfirmasi Keluar",
      "warning",
      "Ya, Keluar",
      "Batal"
    );
    if (confirmed) {
      try {
        sessionStorage.removeItem("admin_session_auth");
        if (auth) await signOut(auth);
        window.location.href = "login.html";
      } catch (err) {
        console.error("Logout error:", err);
        window.location.href = "login.html";
      }
    }
  });
}

export { auth };
