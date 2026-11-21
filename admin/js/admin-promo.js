// ==========================================================================
// HENGKI HONDA JPA
// admin-promo.js - Kelola 5 Slot Banner Promo Hero (Auto-Crop WebP, Urutan & Hapus)
// ==========================================================================

import { 
  db, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc 
} from "../../js/firebase-config.js";

import { adminAlert, adminConfirm } from "./admin-dialogs.js";
import { 
  processPromoImage, 
  uploadWithFallback, 
  formatAdminImageUrl 
} from "./image-utils.js";

const DEFAULT_PROMOS = [
  { id: "promo-1", url: "promo/promo-1.webp", alt: "Promo Honda 1", active: true },
  { id: "promo-2", url: "promo/promo-2.webp", alt: "Promo Honda 2", active: true },
  { id: "promo-3", url: "promo/promo-3.webp", alt: "Promo Honda 3", active: true },
  { id: "promo-4", url: "promo/promo-4.webp", alt: "Promo Honda 4", active: true },
  { id: "promo-5", url: "promo/promo-5.webp", alt: "Promo Honda 5", active: true }
];

let promoSlots = [];

export async function initAdminPromo() {
  const container = document.getElementById("promo-slots-container");
  const btnSave = document.getElementById("btn-save-promo-slots");
  if (!container) return;

  await loadPromoSlots();
  renderPromoSlots();

  if (btnSave) {
    btnSave.addEventListener("click", savePromoSlots);
  }
}

async function loadPromoSlots() {
  try {
    let snap;
    try {
      snap = await getDocFromServer(doc(db, "hero", "main"));
    } catch (e) {
      snap = await getDoc(doc(db, "hero", "main"));
    }

    if (snap.exists() && Array.isArray(snap.data().promoList) && snap.data().promoList.length > 0) {
      promoSlots = snap.data().promoList.slice(0, 5);
    } else {
      // Coba load dari default-settings.json
      try {
        const res = await fetch("../data/default-settings.json");
        const json = await res.json();
        if (json.hero && Array.isArray(json.hero.promoList)) {
          promoSlots = json.hero.promoList.slice(0, 5);
        }
      } catch (err) {}
    }
  } catch (err) {
    console.warn("Gagal memuat promoList dari Firestore:", err);
  }

  // Pastikan tepat 5 slot tersedia
  while (promoSlots.length < 5) {
    const idx = promoSlots.length + 1;
    const fallbackDef = DEFAULT_PROMOS[idx - 1] || { id: `promo-${idx}`, url: `promo/promo-${idx}.webp`, alt: `Promo Honda ${idx}`, active: true };
    promoSlots.push({ ...fallbackDef });
  }
}

function renderPromoSlots() {
  const container = document.getElementById("promo-slots-container");
  if (!container) return;

  container.innerHTML = "";

  promoSlots.forEach((slot, index) => {
    const slotCard = document.createElement("div");
    slotCard.className = "admin-promo-slot-card";
    slotCard.dataset.index = index;

    const displayUrl = slot.url ? formatAdminImageUrl(slot.url) : "../assets/img/logo/logo.png";
    const isActive = slot.active !== false;

    slotCard.innerHTML = `
      <div class="promo-slot-header">
        <div class="promo-slot-title">
          <span class="promo-slot-number">Slot #${index + 1}</span>
          <span class="promo-status-pill ${isActive && slot.url ? 'active' : 'inactive'}">
            ${isActive && slot.url ? '● Aktif Tampil' : '○ Kosong / Nonaktif'}
          </span>
        </div>
        <div class="promo-slot-actions">
          <button type="button" class="btn-slot-move btn-slot-up" data-index="${index}" title="Geser ke Atas" ${index === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button type="button" class="btn-slot-move btn-slot-down" data-index="${index}" title="Geser ke Bawah" ${index === promoSlots.length - 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-down"></i>
          </button>
        </div>
      </div>

      <div class="promo-preview-box">
        <img src="${displayUrl}" alt="${slot.alt || 'Promo Honda'}" class="promo-slot-preview-img" id="promo-preview-${index}" onerror="this.src='../assets/img/logo/logo.png'">
        <div class="promo-slot-tag"><i class="fa-solid fa-bolt"></i> PROMO SPESIAL</div>
      </div>

      <div class="promo-meta-info" id="promo-meta-${index}">
        <span class="promo-dim-badge"><i class="fa-solid fa-expand"></i> Ideal: 900×1260 px</span>
        <span class="promo-format-badge">WebP Otomatis</span>
      </div>

      <div class="promo-warning-box" id="promo-warn-${index}" style="display: none;"></div>

      <div class="promo-slot-controls">
        <label class="btn-admin-action btn-outline-action btn-upload-slot" for="file-promo-slot-${index}">
          <i class="fa-solid fa-cloud-arrow-up"></i> ${slot.url ? 'Ganti Foto' : 'Pilih Foto'}
        </label>
        <input type="file" id="file-promo-slot-${index}" class="input-promo-file" data-index="${index}" accept="image/*" style="display: none;">

        <button type="button" class="btn-admin-action btn-danger-action btn-delete-slot" data-index="${index}" title="Hapus foto dari slot ini">
          <i class="fa-solid fa-trash-can"></i> Hapus
        </button>
      </div>
    `;

    container.appendChild(slotCard);
  });

  setupSlotEvents();
}

function setupSlotEvents() {
  const container = document.getElementById("promo-slots-container");
  if (!container) return;

  // 1. Move Up
  container.querySelectorAll(".btn-slot-up").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (idx > 0) {
        const temp = promoSlots[idx];
        promoSlots[idx] = promoSlots[idx - 1];
        promoSlots[idx - 1] = temp;
        renderPromoSlots();
      }
    });
  });

  // 2. Move Down
  container.querySelectorAll(".btn-slot-down").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      if (idx < promoSlots.length - 1) {
        const temp = promoSlots[idx];
        promoSlots[idx] = promoSlots[idx + 1];
        promoSlots[idx + 1] = temp;
        renderPromoSlots();
      }
    });
  });

  // 3. Delete / Clear Slot
  container.querySelectorAll(".btn-delete-slot").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.index, 10);
      const confirmed = await adminConfirm(
        `Kosongkan foto di Slot #${idx + 1}? Slot ini tidak akan dimunculkan di kartu promo beranda.`,
        "Kosongkan Slot Promo",
        "warning",
        "Ya, Kosongkan"
      );
      if (confirmed) {
        promoSlots[idx].url = "";
        promoSlots[idx].active = false;
        promoSlots[idx]._file = null;
        promoSlots[idx]._dataUrl = null;
        renderPromoSlots();
      }
    });
  });

  // 4. File Upload with Auto-Crop & WebP Compression
  container.querySelectorAll(".input-promo-file").forEach(input => {
    input.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const idx = parseInt(input.dataset.index, 10);
      const previewImg = document.getElementById(`promo-preview-${idx}`);
      const warnBox = document.getElementById(`promo-warn-${idx}`);
      const metaBox = document.getElementById(`promo-meta-${idx}`);

      if (previewImg) previewImg.style.opacity = "0.5";

      try {
        // Otomatis crop & resize ke WebP 900x1260px berkualitas tinggi
        const processed = await processPromoImage(file, {
          targetWidth: 900,
          targetHeight: 1260,
          quality: 0.90
        });

        promoSlots[idx]._file = processed.blob;
        promoSlots[idx]._dataUrl = processed.dataUrl;
        promoSlots[idx].url = processed.dataUrl; // Preview live
        promoSlots[idx].active = true;

        if (previewImg) {
          previewImg.src = processed.dataUrl;
          previewImg.style.opacity = "1";
        }

        // Tampilkan metadata resolusi & ukuran file
        if (metaBox) {
          const kbSize = Math.round(processed.size / 1024);
          metaBox.innerHTML = `
            <span class="promo-dim-badge"><i class="fa-solid fa-check"></i> 900×1260 px</span>
            <span class="promo-format-badge">WebP (~${kbSize} KB)</span>
          `;
        }

        // Tampilkan warning jika gambar asli terlalu kecil
        if (warnBox) {
          if (processed.isLowRes) {
            warnBox.textContent = `⚠️ ${processed.warningMessage}`;
            warnBox.style.display = "block";
          } else {
            warnBox.style.display = "none";
          }
        }

      } catch (err) {
        console.error("Gagal memproses gambar promo:", err);
        await adminAlert("Gagal memproses gambar: " + err.message, "Format Tidak Valid", "error");
        if (previewImg) previewImg.style.opacity = "1";
      }
    });
  });
}

async function savePromoSlots() {
  const btnSave = document.getElementById("btn-save-promo-slots");
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Promo...';
  }

  try {
    const updatedTimestamp = new Date().toISOString();
    const finalSlots = [];

    for (let i = 0; i < promoSlots.length; i++) {
      const slot = promoSlots[i];
      let finalUrl = slot.url;

      // Jika ada file gambar baru yang diunggah, simpan via Storage atau Base64 fallback
      if (slot._file) {
        try {
          const path = `promo/promo-${i + 1}-${Date.now()}.webp`;
          finalUrl = await uploadWithFallback(slot._file, path, {
            maxWidth: 900,
            maxHeight: 1260,
            quality: 0.90
          });
        } catch (upErr) {
          console.warn(`Gagal upload slot #${i + 1}, memakai dataURL:`, upErr);
          finalUrl = slot._dataUrl || slot.url;
        }
      }

      finalSlots.push({
        id: `promo-${i + 1}`,
        url: finalUrl || "",
        alt: `Promo Honda ${i + 1}`,
        active: Boolean(finalUrl)
      });
    }

    // Simpan ke Firestore document 'hero/main'
    await setDoc(doc(db, "hero", "main"), {
      promoList: finalSlots,
      promoImageUrl: finalSlots[0]?.url || "",
      updatedAt: updatedTimestamp
    }, { merge: true });

    // Simpan juga ke koleksi settings/promo untuk referensi cadangan
    await setDoc(doc(db, "settings", "promo"), {
      slots: finalSlots,
      updatedAt: updatedTimestamp
    }, { merge: true });

    // Update state & re-render
    promoSlots = finalSlots;
    renderPromoSlots();

    await adminAlert(
      "Berhasil menyimpan 5 foto promo! Foto terbaru akan langsung tampil di kartu melayang beranda tanpa cache lama saat halaman dimuat.",
      "Promo Disimpan",
      "success"
    );

  } catch (err) {
    console.error("Gagal menyimpan banner promo:", err);
    await adminAlert("Gagal menyimpan promo: " + err.message, "Simpan Gagal", "error");
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Semua Banner Promo';
    }
  }
}
