// ==========================================================================
// HENGKI HONDA JPA
// stats-tracker.js - Pencatatan Statistik Pengunjung Ringkas & Non-Blocking
// ==========================================================================

import { 
  db, 
  doc, 
  setDoc, 
  increment,
  googleAnalyticsConfig 
} from "./firebase-config.js";

/**
 * Cek apakah sesi saat ini adalah admin yang sedang login
 * (Admin tidak dihitung dalam statistik pengunjung)
 */
function isAdminSession() {
  try {
    if (sessionStorage.getItem("admin_session_auth")) return true;
    if (localStorage.getItem("admin_logged_in") === "true") return true;
    if (window.location.pathname.includes("/admin/")) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Dapatkan ID tanggal format YYYY-MM-DD sesuai waktu lokal
 */
function getTodayDateId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Catat cadangan statistik lokal (berguna saat offline atau pengujian lokal)
 */
function recordOfflineStats(today, type, key, isUnique = false) {
  try {
    const raw = localStorage.getItem("offline_stats") || "{}";
    const stats = JSON.parse(raw);
    if (!stats[today]) {
      stats[today] = {
        date: today,
        totalViews: 0,
        uniqueVisitors: 0,
        pages: {},
        products: {},
        clicks: { whatsapp: 0, promo_consult: 0 },
        updatedAt: new Date().toISOString()
      };
    }

    const dayStat = stats[today];
    dayStat.updatedAt = new Date().toISOString();

    if (type === "view") {
      dayStat.totalViews = (dayStat.totalViews || 0) + 1;
      if (isUnique) {
        dayStat.uniqueVisitors = (dayStat.uniqueVisitors || 0) + 1;
      }
      if (key) {
        dayStat.pages[key] = (dayStat.pages[key] || 0) + 1;
      }
    } else if (type === "product") {
      if (key) {
        dayStat.products[key] = (dayStat.products[key] || 0) + 1;
      }
    } else if (type === "click") {
      if (key) {
        if (!dayStat.clicks) dayStat.clicks = {};
        dayStat.clicks[key] = (dayStat.clicks[key] || 0) + 1;
      }
    }

    localStorage.setItem("offline_stats", JSON.stringify(stats));
  } catch (e) {
    // Abaikan error localStorage jika quota penuh
  }
}

/**
 * Catat Kunjungan Halaman (Page View) & Pengunjung Unik Harian
 * @param {string} pageName - Nama halaman ('home', 'tanya_jawab', dll)
 */
export async function trackPageView(pageName = "home") {
  if (isAdminSession()) {
    console.debug("[Stats] Kunjungan admin login diabaikan.");
    return;
  }

  const today = getTodayDateId();

  // Pengunjung unik per hari menggunakan ID acak tanpa data pribadi
  let deviceId = localStorage.getItem("stats_device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    try { localStorage.setItem("stats_device_id", deviceId); } catch (e) {}
  }

  const lastVisitDate = localStorage.getItem("stats_last_visit_date");
  const isUniqueToday = lastVisitDate !== today;
  if (isUniqueToday) {
    try { localStorage.setItem("stats_last_visit_date", today); } catch (e) {}
  }

  // Simpan ke offline cache terlebih dahulu
  recordOfflineStats(today, "view", pageName, isUniqueToday);

  // Kirim ke Firestore secara async di latar belakang
  if (db) {
    try {
      const payload = {
        date: today,
        totalViews: increment(1),
        pages: {
          [pageName]: increment(1)
        },
        updatedAt: new Date().toISOString()
      };

      if (isUniqueToday) {
        payload.uniqueVisitors = increment(1);
      }

      await setDoc(doc(db, "stats", today), payload, { merge: true });
    } catch (err) {
      console.warn("[Stats] Gagal update Firestore:", err.message);
    }
  }
}

/**
 * Catat View Produk saat Konsumen Membuka Modal Detail Motor
 * @param {string} productName - Nama model motor
 */
export async function trackProductView(productName) {
  if (isAdminSession() || !productName) return;

  const today = getTodayDateId();
  // Bersihkan karakter khusus untuk key Firestore map
  const safeKey = String(productName).replace(/[./#$\[\]]/g, "_").trim().substring(0, 50);
  if (!safeKey) return;

  recordOfflineStats(today, "product", safeKey, false);

  if (db) {
    try {
      await setDoc(doc(db, "stats", today), {
        date: today,
        products: {
          [safeKey]: increment(1)
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("[Stats] Gagal update product view:", err.message);
    }
  }
}

/**
 * Catat Klik Tombol Aksi (WhatsApp & Konsultasi Promo)
 * @param {'whatsapp'|'promo_consult'} clickType - Tipe klik
 */
export async function trackClick(clickType) {
  if (isAdminSession() || !clickType) return;

  const today = getTodayDateId();
  recordOfflineStats(today, "click", clickType, false);

  if (db) {
    try {
      await setDoc(doc(db, "stats", today), {
        date: today,
        clicks: {
          [clickType]: increment(1)
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("[Stats] Gagal update click:", err.message);
    }
  }
}

/**
 * Inisialisasi Otomatis Pendeteksi Klik Tombol WhatsApp & Promo
 */
export function initAutoClickTracking() {
  if (isAdminSession()) return;

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;

    // 1. Cek Klik Tombol Konsultasi Promo
    const promoBtn = target.closest("#hero-wa-btn, .hero-promo-card, [data-track='promo_consult']");
    if (promoBtn) {
      trackClick("promo_consult");
      return;
    }

    // 2. Cek Klik Tombol WhatsApp / Chat Sales Umum
    const waBtn = target.closest(
      "a[href*='wa.me'], #nav-wa-cta, #mobile-wa-cta, #social-wa, #floating-wa-btn, .btn-wa-direct, .btn-wa-order, [data-track='whatsapp']"
    );
    if (waBtn) {
      trackClick("whatsapp");
    }
  }, { passive: true });
}

/**
 * Inisialisasi Google Analytics 4 (GA4) - Hanya jika Measurement ID diisi
 */
export function initGoogleAnalytics() {
  const measurementId = googleAnalyticsConfig?.measurementId?.trim();
  if (!measurementId || measurementId === "G-XXXXXXXXXX" || !measurementId.startsWith("G-")) {
    return;
  }

  if (document.getElementById("ga4-script")) return;

  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: true });
  console.info("[GA4] Google Analytics 4 aktif:", measurementId);
}
