// ==========================================================================
// HENGKI HONDA JPA
// js/tanya-jawab.js - Logika Pengajuan Pertanyaan Konsumen (Maks. 500 Karakter)
// ==========================================================================

import { 
  db, 
  doc, 
  setDoc,
  collection 
} from "./firebase-config.js";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  initQuestionPage();
});

function initQuestionPage() {
  const form = document.getElementById("form-qna-page");
  const namaInput = document.getElementById("qna-nama");
  const kontakInput = document.getElementById("qna-kontak");
  const topikSelect = document.getElementById("qna-topik");
  const pertInput = document.getElementById("qna-pertanyaan");
  const charCount = document.getElementById("qna-char-count");
  const charRemaining = document.getElementById("qna-char-remaining");
  const charBar = document.getElementById("qna-char-bar");
  const charWarning = document.getElementById("qna-char-warning");
  const honeypot = document.getElementById("qna-honeypot");
  const alertBox = document.getElementById("qna-alert-box");
  const btnSubmit = document.getElementById("btn-submit-qna");

  const formCard = document.getElementById("qna-form-card");
  const successCard = document.getElementById("qna-success-card");
  const btnAskAnother = document.getElementById("btn-ask-another");

  // Success preview elements
  const previewNama = document.getElementById("success-preview-nama");
  const previewTopik = document.getElementById("success-preview-topik");
  const previewText = document.getElementById("success-preview-text");

  if (!form || !pertInput) return;

  const MAX_CHARS = 500;

  // 1. Live Character Counter & Visual Progress Bar
  function updateCharCounter() {
    let val = pertInput.value;
    if (val.length > MAX_CHARS) {
      val = val.substring(0, MAX_CHARS);
      pertInput.value = val;
    }

    const currentLen = val.length;
    const remaining = MAX_CHARS - currentLen;
    const percent = Math.min(100, Math.round((currentLen / MAX_CHARS) * 100));

    if (charCount) charCount.textContent = currentLen;
    if (charRemaining) charRemaining.textContent = remaining;

    if (charBar) {
      charBar.style.width = percent + "%";
      if (currentLen >= 450) {
        charBar.style.backgroundColor = "#EF4444"; // Red alert
      } else if (currentLen >= 350) {
        charBar.style.backgroundColor = "#F59E0B"; // Amber warning
      } else {
        charBar.style.backgroundColor = "#10B981"; // Fresh green
      }
    }

    if (charWarning) {
      if (currentLen >= MAX_CHARS) {
        charWarning.style.display = "block";
      } else {
        charWarning.style.display = "none";
      }
    }
  }

  pertInput.addEventListener("input", updateCharCounter);
  pertInput.addEventListener("keyup", updateCharCounter);
  pertInput.addEventListener("paste", () => setTimeout(updateCharCounter, 10));

  // Initialize counter at start
  updateCharCounter();

  function showAlert(msg, isSuccess = false) {
    if (!alertBox) return;
    alertBox.className = `qna-alert-msg ${isSuccess ? "alert-success" : "alert-danger"}`;
    alertBox.innerHTML = `<i class="fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> <span>${escapeHtml(msg)}</span>`;
    alertBox.style.display = "flex";
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = "none";
  }

  // 2. Submit Handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    // Check honeypot for bot detection
    if (honeypot && honeypot.value.trim() !== "") {
      showSuccessView({
        nama: namaInput.value.trim() || "Konsumen",
        topik: "Umum",
        pertanyaan: pertInput.value.trim()
      });
      return;
    }

    const nama = (namaInput.value || "").trim();
    const kontak = kontakInput ? (kontakInput.value || "").trim() : "";
    const topik = topikSelect ? (topikSelect.value || "Umum") : "Umum";
    const pertanyaan = (pertInput.value || "").trim();

    // Validation
    if (nama.length < 2 || nama.length > 50) {
      showAlert("Nama lengkap harus diisi antara 2 hingga 50 karakter.", false);
      namaInput.focus();
      return;
    }

    if (pertanyaan.length < 3) {
      showAlert("Pertanyaan terlalu singkat. Tuliskan minimal 3 karakter agar tim sales dapat memahaminya.", false);
      pertInput.focus();
      return;
    }

    if (pertanyaan.length > MAX_CHARS) {
      showAlert(`Pertanyaan maksimal ${MAX_CHARS} karakter. Silakan perpendek pertanyaan Anda.`, false);
      pertInput.focus();
      return;
    }

    // Rate-limiting: minimal 20 detik antar kiriman
    const lastSubmitTime = parseInt(localStorage.getItem("last_qna_submit_time") || "0", 10);
    const now = Date.now();
    if (now - lastSubmitTime < 20000) {
      const waitSec = Math.ceil((20000 - (now - lastSubmitTime)) / 1000);
      showAlert(`Mohon tunggu ${waitSec} detik lagi sebelum mengirim pertanyaan berikutnya (proteksi anti-spam).`, false);
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim Pertanyaan...';
    }

    // Unique ID
    const uniqueId = "qna_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const payload = {
      id: uniqueId,
      nama: nama,
      kontak: kontak,
      topik: topik,
      pertanyaan: pertanyaan,
      jawaban: "",
      status: "pending", // Memerlukan peninjauan/jawaban admin sebelum tampil publik
      createdAt: new Date().toISOString(),
      answeredAt: null
    };

    // 1. Simpan selalu ke LocalStorage (Cadangan Offline & Sinkron Admin)
    try {
      const localQna = JSON.parse(localStorage.getItem("offline_qna") || "[]");
      localQna.unshift(payload);
      localStorage.setItem("offline_qna", JSON.stringify(localQna));
      localStorage.setItem("last_qna_submit_time", now.toString());

      const myQna = JSON.parse(localStorage.getItem("my_submitted_qna") || "[]");
      myQna.unshift(uniqueId);
      localStorage.setItem("my_submitted_qna", JSON.stringify(myQna));
    } catch (localErr) {
      console.warn("Gagal menyimpan ke localStorage:", localErr);
    }

    // 2. Simpan ke Firestore jika database tersedia
    let firestoreSuccess = false;
    if (db) {
      try {
        await setDoc(doc(db, "qna", uniqueId), payload);
        firestoreSuccess = true;
        console.info("[QnA] Pertanyaan berhasil terkirim ke Firestore:", uniqueId);
      } catch (fsErr) {
        console.warn("[QnA] Firestore simpan gagal (data tetap tersimpan di lokal):", fsErr);
      }
    }

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Pertanyaan Sekarang';
    }

    // Tampilkan Layar Sukses
    showSuccessView(payload);
  });

  function showSuccessView(data) {
    if (previewNama) previewNama.textContent = data.nama;
    if (previewTopik) previewTopik.textContent = data.topik || "Umum";
    if (previewText) previewText.textContent = data.pertanyaan;

    if (formCard) formCard.style.display = "none";
    if (successCard) {
      successCard.style.display = "block";
      successCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // 3. Tombol Ajukan Pertanyaan Lain
  if (btnAskAnother) {
    btnAskAnother.addEventListener("click", () => {
      form.reset();
      updateCharCounter();
      hideAlert();
      if (successCard) successCard.style.display = "none";
      if (formCard) {
        formCard.style.display = "block";
        formCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (namaInput) namaInput.focus();
    });
  }
}
