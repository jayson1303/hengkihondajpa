// ==========================================================================
// HENGKI HONDA JPA
// admin-qna.js - Kelola Tanya Jawab Konsumen (Moderasi, Jawab, Filter & Hapus)
// Mendukung sinkronisasi realtime Cloud Firestore & LocalStorage (Multi-Mode)
// ==========================================================================

import { 
  db, 
  auth,
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from "../../js/firebase-config.js";

import { adminAlert, adminConfirm } from "./admin-dialogs.js";

let allQna = [];
let currentFilter = "all"; // 'all' | 'pending' | 'waiting' | 'answered'
let isSyncing = false;

export async function initAdminQna() {
  const tableBody = document.getElementById("qna-table-body");
  if (!tableBody) return;

  setupFilterEvents();
  setupRefreshButton();
  setupRealtimeQnaListener();
}

function setupFilterEvents() {
  const filterBtns = document.querySelectorAll(".btn-qna-filter");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter || "all";
      renderQnaTable();
    });
  });
}

function setupRefreshButton() {
  const btnRefresh = document.getElementById("btn-refresh-qna");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      btnRefresh.disabled = true;
      btnRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...';
      await loadCombinedQna();
      btnRefresh.disabled = false;
      btnRefresh.innerHTML = '<i class="fa-solid fa-rotate"></i> Segarkan Data';
      await adminAlert(`Berhasil memuat ${allQna.length} pertanyaan dari database!`, "Data Diperbarui", "success");
    });
  }
}

function updateBadgeCounts() {
  const pendingCount = allQna.filter(q => q.status === "pending").length;
  const waitingCount = allQna.filter(q => (!q.jawaban || q.jawaban.trim() === "")).length;
  const answeredCount = allQna.filter(q => q.jawaban && q.jawaban.trim() !== "").length;

  // Sidebar badge
  const sidebarBadge = document.getElementById("sidebar-badge-qna");
  if (sidebarBadge) {
    if (pendingCount > 0) {
      sidebarBadge.textContent = pendingCount;
      sidebarBadge.style.display = "inline-flex";
    } else {
      sidebarBadge.style.display = "none";
    }
  }

  // Dashboard metric jika ada
  const dashQnaMetric = document.getElementById("metric-qna-count");
  if (dashQnaMetric) {
    dashQnaMetric.textContent = allQna.length;
  }

  // Filter pills count
  const countAll = document.getElementById("qna-count-all");
  const countPending = document.getElementById("qna-count-pending");
  const countWaiting = document.getElementById("qna-count-waiting");
  const countAnswered = document.getElementById("qna-count-answered");

  if (countAll) countAll.textContent = allQna.length;
  if (countPending) countPending.textContent = pendingCount;
  if (countWaiting) countWaiting.textContent = waitingCount;
  if (countAnswered) countAnswered.textContent = answeredCount;
}

// 1. Penggabung data Cloud Firestore dan LocalStorage
function mergeLocalAndFirestore(firestoreList = []) {
  let localList = [];
  try {
    localList = JSON.parse(localStorage.getItem("offline_qna") || "[]");
  } catch (e) {
    localList = [];
  }

  // Pastikan setiap data di lokal memiliki ID valid
  let localNeedsSave = false;
  localList.forEach((item, idx) => {
    if (!item.id) {
      item.id = "qna_" + (item.createdAt ? new Date(item.createdAt).getTime() : Date.now()) + "_" + idx;
      localNeedsSave = true;
    }
  });

  if (localNeedsSave) {
    try {
      localStorage.setItem("offline_qna", JSON.stringify(localList));
    } catch (e) {}
  }

  const map = new Map();

  // Masukkan item dari Firestore
  firestoreList.forEach(item => {
    map.set(item.id, { ...item, source: "cloud" });
  });

  // Masukkan item lokal yang belum ada di Firestore
  localList.forEach(item => {
    if (!map.has(item.id)) {
      map.set(item.id, { ...item, source: "local" });
    }
  });

  allQna = Array.from(map.values());
  // Urutkan tanggal terbaru
  allQna.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  updateBadgeCounts();
  renderQnaTable();

  // Sinkronkan data lokal ke cloud jika admin sedang login
  if (!isSyncing && db && auth && auth.currentUser) {
    autoSyncLocalToFirestore(localList);
  }
}

async function autoSyncLocalToFirestore(localList) {
  isSyncing = true;
  try {
    for (const item of localList) {
      if (item.syncedToCloud !== true && item.id) {
        try {
          await setDoc(doc(db, "qna", item.id), {
            id: item.id,
            nama: item.nama,
            kontak: item.kontak || "",
            topik: item.topik || "Umum",
            pertanyaan: item.pertanyaan,
            jawaban: item.jawaban || "",
            status: item.status || "pending",
            createdAt: item.createdAt || new Date().toISOString(),
            answeredAt: item.answeredAt || null
          }, { merge: true });
          item.syncedToCloud = true;
        } catch (err) {
          console.warn("Gagal auto-sync item:", item.id, err);
        }
      }
    }
    localStorage.setItem("offline_qna", JSON.stringify(localList));
  } catch (e) {
    console.warn("Auto sync error:", e);
  } finally {
    isSyncing = false;
  }
}

function setupRealtimeQnaListener() {
  if (!db) {
    console.info("[Admin QnA] Mode offline/lokal aktif.");
    mergeLocalAndFirestore([]);
    return;
  }

  try {
    const q = query(collection(db, "qna"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      mergeLocalAndFirestore(list);
    }, (err) => {
      console.warn("Firestore onSnapshot qna warning:", err);
      loadCombinedQna();
    });
  } catch (err) {
    console.warn("Error setting up QnA listener:", err);
    loadCombinedQna();
  }
}

async function loadCombinedQna() {
  let firestoreList = [];
  if (db) {
    try {
      const snap = await getDocs(collection(db, "qna"));
      snap.forEach(d => firestoreList.push({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("getDocs qna failed, relying on local:", e);
    }
  }
  mergeLocalAndFirestore(firestoreList);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoStr) {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return isoStr;
  }
}

function formatWaUrl(phone, nama, pertanyaan) {
  if (!phone) return null;
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.substring(1);
  }
  const text = encodeURIComponent(`Halo ${nama || 'Bpk/Ibu'}, kami dari Hengki Honda JPA merespon pertanyaan Anda: "${pertanyaan.substring(0, 80)}..."`);
  return `https://wa.me/${clean}?text=${text}`;
}

function renderQnaTable() {
  const tableBody = document.getElementById("qna-table-body");
  if (!tableBody) return;

  let filtered = allQna;
  if (currentFilter === "pending") {
    filtered = allQna.filter(q => q.status === "pending");
  } else if (currentFilter === "waiting") {
    filtered = allQna.filter(q => (!q.jawaban || q.jawaban.trim() === ""));
  } else if (currentFilter === "answered") {
    filtered = allQna.filter(q => q.jawaban && q.jawaban.trim() !== "");
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #64748B;">
          <i class="fa-solid fa-clipboard-check" style="font-size: 2.2rem; color: #CBD5E1; margin-bottom: 12px; display: block;"></i>
          <strong>Tidak ada pertanyaan pada filter ini.</strong>
          <p style="font-size: 0.85rem; color: #94A3B8; margin-top: 4px;">Pertanyaan yang diajukan konsumen dari halaman beranda atau form tanya jawab akan otomatis muncul di sini.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  filtered.forEach((item, index) => {
    const isApproved = item.status === "approved";
    const waUrl = formatWaUrl(item.kontak, item.nama, item.pertanyaan);
    const charLen = (item.pertanyaan || "").length;

    html += `
      <tr class="qna-row ${item.status === 'pending' ? 'row-pending' : ''}">
        <td style="width: 50px; text-align: center; color: #64748B; font-weight: 700;">
          ${index + 1}
        </td>

        <td style="width: 240px; vertical-align: top;">
          <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px; font-size: 0.95rem;">
            <i class="fa-solid fa-user-circle" style="color: #64748B; margin-right: 5px;"></i>${escapeHtml(item.nama)}
          </div>
          
          <div style="font-size: 0.78rem; color: #64748B; margin-bottom: 6px;">
            <i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${formatDate(item.createdAt)}
          </div>

          ${item.topik ? `
            <div style="margin-bottom: 6px;">
              <span class="qna-badge-topic" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #DBEAFE; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 700;">
                <i class="fa-solid fa-tag"></i> ${escapeHtml(item.topik)}
              </span>
            </div>
          ` : ''}

          ${waUrl ? `
            <div style="margin-bottom: 8px;">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 5px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; text-decoration: none;">
                <i class="fa-brands fa-whatsapp"></i> ${escapeHtml(item.kontak)}
              </a>
            </div>
          ` : ''}

          <div style="margin-top: 6px;">
            ${isApproved
              ? '<span class="qna-badge-status approved"><i class="fa-solid fa-circle-check"></i> Disetujui (Publik)</span>'
              : '<span class="qna-badge-status pending"><i class="fa-solid fa-shield-halved"></i> Perlu Persetujuan</span>'
            }
          </div>
        </td>

        <td style="vertical-align: top;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 0.76rem; font-weight: 700; color: #64748B; text-transform: uppercase;">
              <i class="fa-regular fa-comment-dots"></i> Isi Pertanyaan Konsumen:
            </span>
            <span style="font-size: 0.74rem; color: #94A3B8; font-weight: 600;">
              ${charLen} / 500 Karakter
            </span>
          </div>

          <div style="font-size: 0.92rem; color: #1E293B; line-height: 1.55; margin-bottom: 14px; font-weight: 500; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px;">
            ${escapeHtml(item.pertanyaan)}
          </div>

          <!-- Kolom Jawaban -->
          <div class="qna-answer-editor">
            <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 5px; margin-bottom: 6px;">
              <i class="fa-solid fa-reply" style="color: #DC2626;"></i> Tanggapan / Jawaban Resmi Sales:
              ${item.answeredAt ? `<span style="font-weight: 400; color: #94A3B8;">(Dijawab: ${formatDate(item.answeredAt)})</span>` : ''}
            </label>
            <textarea class="form-control qna-answer-input" id="answer-input-${item.id}" rows="2" placeholder="Tuliskan jawaban resmi untuk konsumen di sini...">${escapeHtml(item.jawaban || "")}</textarea>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <small style="font-size: 0.74rem; color: #64748B;">Menyimpan jawaban akan otomatis menyetujui pertanyaan tampil di beranda.</small>
              <button type="button" class="btn-admin-action btn-primary-action btn-save-answer" data-id="${item.id}" style="padding: 6px 14px; font-size: 0.8rem;">
                <i class="fa-solid fa-paper-plane"></i> Simpan Jawaban
              </button>
            </div>
          </div>
        </td>

        <td style="width: 140px; text-align: center; vertical-align: top;">
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            <button type="button" class="btn-admin-action ${isApproved ? 'btn-outline-action' : 'btn-success-action'} btn-toggle-approve" data-id="${item.id}" data-current="${item.status}">
              <i class="fa-solid ${isApproved ? 'fa-eye-slash' : 'fa-check'}"></i> ${isApproved ? 'Sembunyikan' : 'Setujui'}
            </button>
            
            <button type="button" class="btn-admin-action btn-danger-action btn-delete-qna" data-id="${item.id}">
              <i class="fa-solid fa-trash-can"></i> Hapus
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
  attachQnaActionEvents();
}

function attachQnaActionEvents() {
  const tableBody = document.getElementById("qna-table-body");
  if (!tableBody) return;

  // 1. Simpan Jawaban
  tableBody.querySelectorAll(".btn-save-answer").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const textarea = document.getElementById(`answer-input-${id}`);
      const jawaban = textarea ? textarea.value.trim() : "";

      if (!jawaban) {
        await adminAlert("Silakan tuliskan jawaban terlebih dahulu sebelum menyimpan!", "Jawaban Kosong", "warning");
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

      const nowIso = new Date().toISOString();

      // Update Firestore
      if (db) {
        try {
          await setDoc(doc(db, "qna", id), {
            jawaban: jawaban,
            answeredAt: nowIso,
            status: "approved"
          }, { merge: true });
        } catch (err) {
          console.warn("Firestore save failed, persisting locally:", err);
        }
      }

      // Always update localStorage
      try {
        const local = JSON.parse(localStorage.getItem("offline_qna") || "[]");
        const match = local.find(q => q.id === id);
        if (match) {
          match.jawaban = jawaban;
          match.answeredAt = nowIso;
          match.status = "approved";
          localStorage.setItem("offline_qna", JSON.stringify(local));
        }
      } catch (e) {}

      // Update in memory
      const item = allQna.find(q => q.id === id);
      if (item) {
        item.jawaban = jawaban;
        item.answeredAt = nowIso;
        item.status = "approved";
      }

      updateBadgeCounts();
      renderQnaTable();
      await adminAlert("Jawaban berhasil disimpan dan otomatis dipublikasikan ke beranda!", "Jawaban Tersimpan", "success");
    });
  });

  // 2. Toggle Setujui / Sembunyikan
  tableBody.querySelectorAll(".btn-toggle-approve").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const current = btn.dataset.current;
      const nextStatus = current === "approved" ? "pending" : "approved";

      btn.disabled = true;

      if (db) {
        try {
          await setDoc(doc(db, "qna", id), {
            status: nextStatus
          }, { merge: true });
        } catch (err) {
          console.warn("Firestore update status failed, persisting locally:", err);
        }
      }

      try {
        const local = JSON.parse(localStorage.getItem("offline_qna") || "[]");
        const match = local.find(q => q.id === id);
        if (match) {
          match.status = nextStatus;
          localStorage.setItem("offline_qna", JSON.stringify(local));
        }
      } catch (e) {}

      const item = allQna.find(q => q.id === id);
      if (item) item.status = nextStatus;

      updateBadgeCounts();
      renderQnaTable();
    });
  });

  // 3. Hapus Pertanyaan
  tableBody.querySelectorAll(".btn-delete-qna").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const confirmed = await adminConfirm(
        "Apakah Anda yakin ingin menghapus pertanyaan ini secara permanen dari database?",
        "Hapus Pertanyaan",
        "warning",
        "Ya, Hapus"
      );
      if (!confirmed) return;

      btn.disabled = true;

      if (db) {
        try {
          await deleteDoc(doc(db, "qna", id));
        } catch (err) {
          console.warn("Firestore delete failed:", err);
        }
      }

      try {
        const local = JSON.parse(localStorage.getItem("offline_qna") || "[]");
        const updated = local.filter(q => q.id !== id);
        localStorage.setItem("offline_qna", JSON.stringify(updated));
      } catch (e) {}

      allQna = allQna.filter(q => q.id !== id);
      updateBadgeCounts();
      renderQnaTable();
    });
  });
}
