// ==========================================================================
// HENGKI HONDA JPA
// admin-testimonials.js - CRUD Kelola Ulasan Testimoni Pelanggan (Text-Only)
// ==========================================================================

import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc 
} from "../../js/firebase-config.js";

import { adminAlert, adminConfirm } from "./admin-dialogs.js";

let testimonialsList = [];
let editingTestiId = null;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function initAdminTestimonials() {
  await loadTestimonialsTable();

  // Add Button
  const btnAdd = document.getElementById("btn-add-testi");
  if (btnAdd) {
    btnAdd.addEventListener("click", () => openTestiModal());
  }

  // Close Modal Button
  const btnClose = document.getElementById("modal-testi-close");
  const modal = document.getElementById("modal-testi");
  if (btnClose && modal) {
    btnClose.addEventListener("click", () => modal.classList.remove("active"));
  }

  // Form Submit
  const form = document.getElementById("form-testi");
  if (form) {
    form.addEventListener("submit", handleSaveTestimonial);
  }
}

async function loadTestimonialsTable() {
  const tbody = document.getElementById("tbody-testimonials");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat ulasan konsumen...</td></tr>';

  try {
    testimonialsList = [];
    if (db) {
      try {
        const snap = await getDocs(collection(db, "testimonials"));
        snap.forEach(d => {
          testimonialsList.push({ id: d.id, ...d.data() });
        });
      } catch (fbErr) {
        console.warn("Firestore testimonials load failed, using local seed fallback:", fbErr);
      }
    }

    if (testimonialsList.length === 0) {
      const res = await fetch("../data/seed-testimonials.json");
      testimonialsList = await res.json();
    }

  } catch (err) {
    console.error("Gagal memuat testimoni:", err);
    try {
      const res = await fetch("../data/seed-testimonials.json");
      testimonialsList = await res.json();
    } catch (e) {
      testimonialsList = [];
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: #B91C1C;">Gagal memuat ulasan konsumen.</td></tr>`;
      const badgeCount = document.getElementById("metric-testi-count");
      if (badgeCount) badgeCount.textContent = "—";
      return;
    }
  }

  // Update counter
  const badgeCount = document.getElementById("metric-testi-count");
  if (badgeCount) badgeCount.textContent = testimonialsList.length;

  renderTestimonialsTable();
}

function renderTestimonialsTable() {
  const tbody = document.getElementById("tbody-testimonials");
  if (!tbody) return;

  if (testimonialsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: #94A3B8;">Belum ada ulasan konsumen. Klik "+ Tambah Ulasan Baru" untuk menambahkan.</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  testimonialsList.forEach((t, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="width: 50px; text-align: center;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; margin: 0 auto;">
          <i class="fa-solid fa-user-check"></i>
        </div>
      </td>
      <td>
        <strong>${escapeHtml(t.nama || 'Konsumen')}</strong>
        <div style="font-size: 0.72rem; color: #10B981; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Konsumen Terverifikasi</div>
      </td>
      <td>
        <span style="color: #F59E0B; white-space: nowrap;">
          ${Array(t.rating || 5).fill('<i class="fa-solid fa-star"></i>').join("")}
        </span>
      </td>
      <td style="max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475569; font-style: italic;">
        "${escapeHtml(t.komentar || '')}"
      </td>
      <td>
        <div class="table-action-btns">
          <button type="button" class="btn-tbl-edit" data-id="${t.id}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button type="button" class="btn-tbl-delete" data-id="${t.id}"><i class="fa-solid fa-trash"></i> Hapus</button>
        </div>
      </td>
    `;

    tr.querySelector(".btn-tbl-edit").addEventListener("click", () => openTestiModal(t));
    tr.querySelector(".btn-tbl-delete").addEventListener("click", () => handleDeleteTesti(t.id));

    tbody.appendChild(tr);
  });
}

function openTestiModal(data = null) {
  const modal = document.getElementById("modal-testi");
  const modalTitle = document.getElementById("modal-testi-title");
  const inputNama = document.getElementById("testi-input-nama");
  const inputRating = document.getElementById("testi-input-rating");
  const inputKomentar = document.getElementById("testi-input-komentar");

  if (!modal) return;

  if (data) {
    editingTestiId = data.id;
    modalTitle.textContent = "Edit Ulasan Konsumen";
    inputNama.value = data.nama || "";
    inputRating.value = data.rating || 5;
    inputKomentar.value = data.komentar || "";
  } else {
    editingTestiId = null;
    modalTitle.textContent = "Tambah Ulasan Konsumen Baru";
    inputNama.value = "";
    inputRating.value = 5;
    inputKomentar.value = "";
  }

  modal.classList.add("active");
  setTimeout(() => inputNama && inputNama.focus(), 100);
}

async function handleSaveTestimonial(e) {
  e.preventDefault();
  const btnSave = document.getElementById("btn-save-testi");
  btnSave.disabled = true;
  btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const nama = document.getElementById("testi-input-nama").value.trim();
    const rating = parseInt(document.getElementById("testi-input-rating").value, 10);
    const komentar = document.getElementById("testi-input-komentar").value.trim();

    if (!nama || !komentar) {
      throw new Error("Nama dan komentar ulasan wajib diisi.");
    }

    const payload = {
      nama,
      rating,
      komentar,
      updatedAt: new Date().toISOString()
    };

    if (db) {
      if (editingTestiId && !editingTestiId.startsWith("testi-")) {
        await setDoc(doc(db, "testimonials", editingTestiId), payload, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, "testimonials"), payload);
        editingTestiId = docRef.id;
      }
    } else {
      // Local array update
      if (editingTestiId) {
        const idx = testimonialsList.findIndex(t => t.id === editingTestiId);
        if (idx >= 0) testimonialsList[idx] = { id: editingTestiId, ...payload };
      } else {
        testimonialsList.unshift({ id: `testi-${Date.now()}`, ...payload });
      }
    }

    document.getElementById("modal-testi").classList.remove("active");
    await adminAlert("Ulasan konsumen berhasil disimpan!", "Berhasil Disimpan", "success");
    await loadTestimonialsTable();

  } catch (err) {
    console.error("Gagal simpan testimoni:", err);
    await adminAlert("Gagal menyimpan ulasan: " + err.message, "Gagal Menyimpan", "error");
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Ulasan';
  }
}

async function handleDeleteTesti(id) {
  const confirmed = await adminConfirm(
    "Apakah Anda yakin ingin menghapus ulasan konsumen ini?",
    "Hapus Ulasan",
    "danger",
    "Ya, Hapus Ulasan"
  );
  if (!confirmed) return;

  try {
    if (db) {
      try {
        await deleteDoc(doc(db, "testimonials", id));
      } catch (e) {
        console.warn("Delete doc Firestore warning:", e);
      }
    }
    testimonialsList = testimonialsList.filter(t => t.id !== id);
    await adminAlert("Ulasan konsumen berhasil dihapus.", "Terhapus", "success");
    await loadTestimonialsTable();
  } catch (err) {
    console.error("Gagal menghapus ulasan:", err);
    await adminAlert("Gagal menghapus ulasan: " + err.message, "Gagal", "error");
  }
}
