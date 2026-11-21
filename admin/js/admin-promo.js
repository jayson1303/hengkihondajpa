// ==========================================================================
// HENGKI HONDA JPA
// admin-promo.js - Kelola 5 Slot Banner Promo Hero (Auto-Crop WebP, Urutan & Simpan)
// Mendukung penyimpanan individual per-slot, batch, serta LocalStorage & Cloud
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
  const btnSaveTop = document.getElementById("btn-save-promo-slots");
  const btnSaveBottom = document.getElementById("btn-save-promo-slots-bottom");

  if (!container) return;

  await loadPromoSlots();
  renderPromoSlots();

  if (btnSaveTop) {
    btnSaveTop.addEventListener("click", () => savePromoSlots());
  }

  if (btnSaveBottom) {
    btnSaveBottom.addEventListener("click", () => savePromoSlots());
  }
}

async function loadPromoSlots() {
  let loaded = false;

  // 1. Coba baca dari Firestore cloud
  if (db) {
    try {
      let snap;
      try {
        snap = await getDocFromServer(doc(db, "hero", "main"));
      } catch (e) {
        snap = await getDoc(doc(db, "hero", "main"));
      }

      if (snap && snap.exists() && Array.isArray(snap.data().promoList) && snap.data().promoList.length > 0) {
        promoSlots = snap.data().promoList.slice(0, 5);
        loaded = true;
      }
    } catch (err) {
      console.warn("Gagal memuat promoList dari Firestore:", err);
    }
  }

  // 2. Coba baca dari LocalStorage cache admin jika Firestore belum ada / offline
  if (!loaded) {
    try {
      const stored = localStorage.getItem("admin_promo_slots");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          promoSlots = parsed.slice(0, 5);
          loaded = true;
        }
      }
    } catch (e) {}
  }

  // 3. Fallback ke data/default-settings.json jika masih belum ada
  if (!loaded) {
    try {
      const res = await fetch("../data/default-settings.json");
      const json = await res.json();
      if (json.hero && Array.isArray(json.hero.promoList)) {
        promoSlots = json.hero.promoList.slice(0, 5);
        loaded = true;
      }
    } catch (err) {}
  }

  // 4. Pastikan tepat 5 slot tersedia
  while (promoSlots.length < 5) {
    const idx = promoSlots.length + 1;
    const fallbackDef = DEFAULT_PROMOS[idx - 1] || { 
      id: `promo-${idx}`, 
      url: `promo/promo-${idx}.webp`, 
      alt: `Promo Honda ${idx}`, 
      active: true 
    };
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
    const isActive = slot.active !== false && Boolean(slot.url);
    const needsSave = Boolean(slot._needsSave);

    slotCard.innerHTML = `
      <div class="promo-slot-header">
        <div class="promo-slot-title">
          <span class="promo-slot-number">Slot #${index + 1}</span>
          <span class="promo-status-pill ${isActive ? 'active' : 'inactive'}">
            ${isActive ? '● Aktif Tampil' : '○ Kosong / Nonaktif'}
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

      <!-- KONTROL LENGKAP TIAP KARTU: TOMBOL PILIH FOTO, KOSONGKAN & TOMBOL SIMPAN SLOT -->
      <div class="promo-slot-controls">
        <div class="promo-slot-controls-row">
          <label class="btn-admin-action btn-outline-action btn-upload-slot" for="file-promo-slot-${index}">
            <i class="fa-solid fa-cloud-arrow-up"></i> ${slot.url ? 'Ganti Foto' : 'Pilih Foto'}
          </label>
          <input type="file" id="file-promo-slot-${index}" class="input-promo-file" data-index="${index}" accept="image/*" style="display: none;">

          <button type="button" class="btn-admin-action btn-danger-action btn-delete-slot" data-index="${index}" title="Kosongkan foto dari slot ini">
            <i class="fa-solid fa-trash-can"></i> Kosongkan
          </button>
        </div>

        <!-- Tombol Simpan Eksplisit untuk Slot Ini -->
        <button type="button" class="btn-save-slot ${needsSave ? 'needs-save' : ''}" data-index="${index}" id="btn-save-slot-${index}">
          <i class="fa-solid ${needsSave ? 'fa-triangle-exclamation' : 'fa-floppy-disk'}"></i> 
          ${needsSave ? `Simpan Foto Baru Slot #${index + 1}` : `Simpan Slot #${index + 1}`}
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
        promoSlots[idx]._needsSave = true;
        promoSlots[idx - 1]._needsSave = true;
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
        promoSlots[idx]._needsSave = true;
        promoSlots[idx + 1]._needsSave = true;
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
        promoSlots[idx]._needsSave = true;
        await saveSingleSlot(idx, true);
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
      const saveBtn = document.getElementById(`btn-save-slot-${idx}`);

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
        promoSlots[idx]._needsSave = true;

        if (previewImg) {
          previewImg.src = processed.dataUrl;
          previewImg.style.opacity = "1";
        }

        // Tampilkan metadata resolusi & ukuran file
        if (metaBox) {
          const kbSize = Math.round(processed.size / 1024);
          metaBox.innerHTML = `
            <span class="promo-dim-badge" style="color: #047857;"><i class="fa-solid fa-check"></i> 900×1260 px</span>
            <span class="promo-format-badge">WebP (~${kbSize} KB)</span>
          `;
        }

        // Tampilkan warning jika resolusi gambar asli terlalu kecil
        if (warnBox) {
          if (processed.isLowRes) {
            warnBox.textContent = `⚠️ ${processed.warningMessage}`;
            warnBox.style.display = "block";
          } else {
            warnBox.style.display = "none";
          }
        }

        // Update tombol simpan slot
        if (saveBtn) {
          saveBtn.classList.add("needs-save");
          saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan Slot #${idx + 1} (Klik di Sini!)`;
        }

        // Otomatis simpan langsung slot ini agar tidak perlu bingung mencari tombol
        await saveSingleSlot(idx, false);

      } catch (err) {
        console.error("Gagal memproses gambar promo:", err);
        await adminAlert("Gagal memproses gambar: " + err.message, "Format Tidak Valid", "error");
        if (previewImg) previewImg.style.opacity = "1";
      }
    });
  });

  // 5. Save Single Slot Button Click
  container.querySelectorAll(".btn-save-slot").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.index, 10);
      await saveSingleSlot(idx, true);
    });
  });
}

/**
 * Simpan satu slot promo tertentu secara langsung
 */
async function saveSingleSlot(idx, showModal = true) {
  const saveBtn = document.getElementById(`btn-save-slot-${idx}`);
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Slot #${idx + 1}...`;
  }

  try {
    const slot = promoSlots[idx];
    let finalUrl = slot.url;

    // Jika ada file gambar baru yang diunggah
    if (slot._file) {
      try {
        const path = `promo/promo-${idx + 1}-${Date.now()}.webp`;
        finalUrl = await uploadWithFallback(slot._file, path, {
          maxWidth: 900,
          maxHeight: 1260,
          quality: 0.90
        });
      } catch (upErr) {
        console.warn(`Gagal upload storage slot #${idx + 1}, memakai dataURL:`, upErr);
        finalUrl = slot._dataUrl || slot.url;
      }
    }

    slot.url = finalUrl || "";
    slot.active = Boolean(finalUrl);
    slot._file = null;
    slot._dataUrl = null;
    slot._needsSave = false;

    // Bersihkan objek slots untuk disimpan (tanpa properti internal blob)
    const cleanSlots = getCleanSlots();
    const updatedTimestamp = new Date().toISOString();

    // 1. Simpan ke LocalStorage selalu (agar instan dan aman offline)
    try {
      localStorage.setItem("admin_promo_slots", JSON.stringify(cleanSlots));
      const cachedHero = JSON.parse(localStorage.getItem("asm_hero_cache") || "{}");
      cachedHero.promoList = cleanSlots;
      cachedHero.updatedAt = updatedTimestamp;
      localStorage.setItem("asm_hero_cache", JSON.stringify(cachedHero));
    } catch (e) {
      console.warn("Gagal simpan promo ke LocalStorage:", e);
    }

    // 2. Simpan ke Firestore jika tersedia
    if (db) {
      try {
        await setDoc(doc(db, "hero", "main"), {
          promoList: cleanSlots,
          promoImageUrl: cleanSlots[0]?.url || "",
          updatedAt: updatedTimestamp
        }, { merge: true });

        await setDoc(doc(db, "settings", "promo"), {
          slots: cleanSlots,
          updatedAt: updatedTimestamp
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore setDoc hero gagal (data tetap tersimpan di lokal):", fsErr);
      }
    }

    renderPromoSlots();

    if (showModal) {
      await adminAlert(
        `Slot Promo #${idx + 1} berhasil disimpan! Foto terbaru langsung aktif tampil pada kartu melayang di beranda.`,
        "Slot Berhasil Disimpan",
        "success"
      );
    }

  } catch (err) {
    console.error("Gagal simpan slot promo:", err);
    if (showModal) {
      await adminAlert("Gagal menyimpan slot: " + err.message, "Gagal", "error");
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }
}

/**
 * Simpan semua 5 slot banner promo sekaligus
 */
async function savePromoSlots() {
  const btnSaveTop = document.getElementById("btn-save-promo-slots");
  const btnSaveBottom = document.getElementById("btn-save-promo-slots-bottom");

  const setButtonsLoading = (isLoading) => {
    [btnSaveTop, btnSaveBottom].forEach(btn => {
      if (btn) {
        btn.disabled = isLoading;
        btn.innerHTML = isLoading 
          ? '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Semua...' 
          : '<i class="fa-solid fa-floppy-disk"></i> Simpan Semua 5 Banner Promo';
      }
    });
  };

  setButtonsLoading(true);

  try {
    const updatedTimestamp = new Date().toISOString();

    for (let i = 0; i < promoSlots.length; i++) {
      const slot = promoSlots[i];
      let finalUrl = slot.url;

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

      slot.url = finalUrl || "";
      slot.active = Boolean(finalUrl);
      slot._file = null;
      slot._dataUrl = null;
      slot._needsSave = false;
    }

    const cleanSlots = getCleanSlots();

    // 1. Simpan ke LocalStorage
    try {
      localStorage.setItem("admin_promo_slots", JSON.stringify(cleanSlots));
      const cachedHero = JSON.parse(localStorage.getItem("asm_hero_cache") || "{}");
      cachedHero.promoList = cleanSlots;
      cachedHero.updatedAt = updatedTimestamp;
      localStorage.setItem("asm_hero_cache", JSON.stringify(cachedHero));
    } catch (e) {
      console.warn("Gagal simpan promo ke LocalStorage:", e);
    }

    // 2. Simpan ke Firestore
    if (db) {
      try {
        await setDoc(doc(db, "hero", "main"), {
          promoList: cleanSlots,
          promoImageUrl: cleanSlots[0]?.url || "",
          updatedAt: updatedTimestamp
        }, { merge: true });

        await setDoc(doc(db, "settings", "promo"), {
          slots: cleanSlots,
          updatedAt: updatedTimestamp
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore save failed, fallback to local:", fsErr);
      }
    }

    renderPromoSlots();

    await adminAlert(
      "Berhasil menyimpan seluruh 5 Banner Promo! Foto promo terbaru langsung aktif ditampilkan di beranda.",
      "Semua Promo Disimpan",
      "success"
    );

  } catch (err) {
    console.error("Gagal menyimpan banner promo:", err);
    await adminAlert("Gagal menyimpan promo: " + err.message, "Simpan Gagal", "error");
  } finally {
    setButtonsLoading(false);
  }
}

function getCleanSlots() {
  return promoSlots.map((s, idx) => ({
    id: `promo-${idx + 1}`,
    url: s.url || "",
    alt: s.alt || `Promo Honda ${idx + 1}`,
    active: Boolean(s.url)
  }));
}
