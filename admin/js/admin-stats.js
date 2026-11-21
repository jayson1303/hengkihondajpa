// ==========================================================================
// HENGKI HONDA JPA
// admin/js/admin-stats.js - Modul Statistik Pengunjung & Interaksi
// ==========================================================================

import { 
  db, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  googleAnalyticsConfig
} from "../../js/firebase-config.js";

let allStatsRecords = {}; // keyed by "YYYY-MM-DD"
let currentFilterRange = "7d"; // "today" | "7d" | "30d" | "all"
let trafficChartInstance = null;

/**
 * Format tanggal YYYY-MM-DD ke format lokal singkat (contoh: 21 Nov)
 */
function formatDateShort(dateStr) {
  if (!dateStr || !dateStr.includes("-")) return dateStr || "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} ${months[monthIdx] || parts[1]}`;
}

/**
 * Dapatkan string tanggal YYYY-MM-DD hari ini
 */
function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Menghasilkan array tanggal YYYY-MM-DD untuk N hari terakhir hingga hari ini
 */
function getLastNDaysArray(n) {
  const dates = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

/**
 * Format angka ribuan (e.g. 1.250)
 */
function formatNumber(num) {
  if (!num || isNaN(num)) return "0";
  return Number(num).toLocaleString("id-ID");
}

/**
 * Muat data statistik dari Firestore dan gabungkan dengan cadangan lokal
 */
export async function loadStatsData() {
  const statsMap = {};

  // 1. Ambil data dari localStorage (offline_stats fallback)
  try {
    const rawLocal = localStorage.getItem("offline_stats");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      Object.keys(parsed).forEach(dateKey => {
        statsMap[dateKey] = {
          date: dateKey,
          totalViews: parsed[dateKey].totalViews || 0,
          uniqueVisitors: parsed[dateKey].uniqueVisitors || 0,
          pages: parsed[dateKey].pages || {},
          products: parsed[dateKey].products || {},
          clicks: parsed[dateKey].clicks || {}
        };
      });
    }
  } catch (err) {
    console.warn("[AdminStats] Gagal membaca offline_stats:", err);
  }

  // 2. Ambil data dari Firestore jika tersedia
  if (db) {
    try {
      const q = query(collection(db, "stats"), orderBy("date", "asc"));
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const dateKey = docSnap.id || data.date;
        if (dateKey) {
          // Gabungkan atau utamakan data Firestore jika lebih mutakhir
          const localItem = statsMap[dateKey] || {};
          statsMap[dateKey] = {
            date: dateKey,
            totalViews: Math.max(Number(data.totalViews || 0), Number(localItem.totalViews || 0)),
            uniqueVisitors: Math.max(Number(data.uniqueVisitors || 0), Number(localItem.uniqueVisitors || 0)),
            pages: mergeCounters(localItem.pages, data.pages),
            products: mergeCounters(localItem.products, data.products),
            clicks: mergeCounters(localItem.clicks, data.clicks)
          };
        }
      });
    } catch (fsErr) {
      console.warn("[AdminStats] Gagal mengambil koleksi stats dari Firestore:", fsErr);
    }
  }

  allStatsRecords = statsMap;
  return allStatsRecords;
}

function mergeCounters(a = {}, b = {}) {
  const res = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    res[k] = Math.max(Number(v || 0), Number(res[k] || 0));
  }
  return res;
}

/**
 * Hitung metrik ringkasan kartu (Hari Ini, 7 Hari, 30 Hari, Total)
 */
function calculateSummaryCards(records) {
  const todayStr = getTodayString();
  const last7Days = new Set(getLastNDaysArray(7));
  const last30Days = new Set(getLastNDaysArray(30));

  let todayViews = 0, todayUniques = 0;
  let views7d = 0, uniques7d = 0;
  let views30d = 0, uniques30d = 0;
  let totalViews = 0, totalUniques = 0;
  let totalWaClicks = 0, totalPromoClicks = 0;

  for (const [dateStr, item] of Object.entries(records)) {
    const v = Number(item.totalViews || 0);
    const u = Number(item.uniqueVisitors || 0);
    const wa = Number(item.clicks?.whatsapp || 0);
    const promo = Number(item.clicks?.promo_consult || 0);

    totalViews += v;
    totalUniques += u;
    totalWaClicks += wa;
    totalPromoClicks += promo;

    if (dateStr === todayStr) {
      todayViews += v;
      todayUniques += u;
    }
    if (last7Days.has(dateStr)) {
      views7d += v;
      uniques7d += u;
    }
    if (last30Days.has(dateStr)) {
      views30d += v;
      uniques30d += u;
    }
  }

  return {
    today: { views: todayViews, uniques: todayUniques },
    sevenDays: { views: views7d, uniques: uniques7d },
    thirtyDays: { views: views30d, uniques: uniques30d },
    total: { views: totalViews, uniques: totalUniques },
    clicks: { wa: totalWaClicks, promo: totalPromoClicks }
  };
}

/**
 * Filter data rekaman berdasarkan rentang pilihan
 */
function getFilteredRecords(records, range) {
  const todayStr = getTodayString();
  let allowedDates = [];

  if (range === "today") {
    allowedDates = [todayStr];
  } else if (range === "7d") {
    allowedDates = getLastNDaysArray(7);
  } else if (range === "30d") {
    allowedDates = getLastNDaysArray(30);
  } else {
    // "all"
    allowedDates = Object.keys(records).sort();
    if (allowedDates.length === 0) {
      allowedDates = getLastNDaysArray(7);
    }
  }

  // Susun data per tanggal
  const result = [];
  allowedDates.forEach(dateStr => {
    const item = records[dateStr] || {
      date: dateStr,
      totalViews: 0,
      uniqueVisitors: 0,
      pages: {},
      products: {},
      clicks: {}
    };
    result.push(item);
  });

  return result;
}

/**
 * Render kartu ringkasan di tab Statistik
 */
function renderSummaryCards(summary) {
  const elTodayViews = document.getElementById("stats-metric-today-views");
  const elTodayUniques = document.getElementById("stats-metric-today-uniques");
  const el7dViews = document.getElementById("stats-metric-7d-views");
  const el7dUniques = document.getElementById("stats-metric-7d-uniques");
  const el30dViews = document.getElementById("stats-metric-30d-views");
  const el30dUniques = document.getElementById("stats-metric-30d-uniques");
  const elTotalViews = document.getElementById("stats-metric-total-views");
  const elTotalUniques = document.getElementById("stats-metric-total-uniques");
  const elTotalWa = document.getElementById("stats-metric-wa-clicks");
  const elTotalPromo = document.getElementById("stats-metric-promo-clicks");

  if (elTodayViews) elTodayViews.textContent = formatNumber(summary.today.views);
  if (elTodayUniques) elTodayUniques.textContent = `${formatNumber(summary.today.uniques)} unik`;

  if (el7dViews) el7dViews.textContent = formatNumber(summary.sevenDays.views);
  if (el7dUniques) el7dUniques.textContent = `${formatNumber(summary.sevenDays.uniques)} unik`;

  if (el30dViews) el30dViews.textContent = formatNumber(summary.thirtyDays.views);
  if (el30dUniques) el30dUniques.textContent = `${formatNumber(summary.thirtyDays.uniques)} unik`;

  if (elTotalViews) elTotalViews.textContent = formatNumber(summary.total.views);
  if (elTotalUniques) elTotalUniques.textContent = `${formatNumber(summary.total.uniques)} unik`;

  if (elTotalWa) elTotalWa.textContent = formatNumber(summary.clicks.wa);
  if (elTotalPromo) elTotalPromo.textContent = formatNumber(summary.clicks.promo);

  // Status Google Analytics 4
  const gaBadge = document.getElementById("stats-ga-badge");
  if (gaBadge) {
    if (googleAnalyticsConfig && googleAnalyticsConfig.measurementId && googleAnalyticsConfig.measurementId.trim() !== "") {
      gaBadge.className = "stats-ga-tag active";
      gaBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> GA4 Aktif (${googleAnalyticsConfig.measurementId})`;
    } else {
      gaBadge.className = "stats-ga-tag inactive";
      gaBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> GA4 Siap (Atur ID di firebase-config.js)`;
    }
  }
}

/**
 * Render Grafik Garis Pengunjung Harian menggunakan Chart.js
 */
function renderLineChart(filteredData) {
  const canvas = document.getElementById("stats-traffic-chart");
  const emptyState = document.getElementById("stats-chart-empty");
  if (!canvas) return;

  // Cek apakah Chart.js tersedia
  if (typeof Chart === "undefined") {
    console.warn("[AdminStats] CDN Chart.js tidak termuat.");
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.innerHTML = `<div style="text-align:center; padding: 30px; color: #64748B;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #F59E0B; margin-bottom: 8px;"></i>
        <p>Modul Chart.js sedang dimuat atau koneksi CDN terhalang.</p>
      </div>`;
    }
    return;
  }

  const labels = filteredData.map(d => formatDateShort(d.date));
  const viewsSeries = filteredData.map(d => Number(d.totalViews || 0));
  const uniquesSeries = filteredData.map(d => Number(d.uniqueVisitors || 0));

  const totalViewsInRange = viewsSeries.reduce((acc, curr) => acc + curr, 0);

  if (emptyState) {
    emptyState.style.display = totalViewsInRange === 0 ? "flex" : "none";
  }

  // Hancurkan instance sebelumnya jika sudah ada
  if (trafficChartInstance) {
    trafficChartInstance.destroy();
    trafficChartInstance = null;
  }

  const ctx = canvas.getContext("2d");

  // Gradien Honda Red untuk Total Views
  const redGradient = ctx.createLinearGradient(0, 0, 0, 300);
  redGradient.addColorStop(0, "rgba(220, 38, 38, 0.25)");
  redGradient.addColorStop(1, "rgba(220, 38, 38, 0.0)");

  // Gradien Honda Blue untuk Pengunjung Unik
  const blueGradient = ctx.createLinearGradient(0, 0, 0, 300);
  blueGradient.addColorStop(0, "rgba(37, 99, 235, 0.2)");
  blueGradient.addColorStop(1, "rgba(37, 99, 235, 0.0)");

  trafficChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Tampilan (Page Views)",
          data: viewsSeries,
          borderColor: "#DC2626",
          backgroundColor: redGradient,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: "#DC2626",
          pointHoverRadius: 6,
          pointRadius: labels.length > 20 ? 2 : 4
        },
        {
          label: "Pengunjung Unik (Device Unik)",
          data: uniquesSeries,
          borderColor: "#2563EB",
          backgroundColor: blueGradient,
          borderWidth: 2,
          borderDash: [4, 4],
          tension: 0.35,
          fill: true,
          pointBackgroundColor: "#2563EB",
          pointHoverRadius: 6,
          pointRadius: labels.length > 20 ? 2 : 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            boxWidth: 14,
            font: {
              family: "'Inter', sans-serif",
              size: 12,
              weight: "600"
            },
            color: "#334155"
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleFont: { size: 13, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { size: 11 },
            color: "#64748B",
            maxRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: { size: 11 },
            color: "#64748B"
          },
          grid: {
            color: "#F1F5F9"
          }
        }
      }
    }
  });
}

/**
 * Render Tabel 10 Produk Terbanyak Dilihat
 */
function renderTopProducts(filteredData) {
  const container = document.getElementById("stats-top-products-list");
  if (!container) return;

  // Agregasi views produk
  const productCounts = {};
  filteredData.forEach(item => {
    for (const [prodName, count] of Object.entries(item.products || {})) {
      productCounts[prodName] = (productCounts[prodName] || 0) + Number(count || 0);
    }
  });

  const sortedProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedProducts.length === 0) {
    container.innerHTML = `
      <div class="stats-empty-box">
        <i class="fa-solid fa-motorcycle" style="font-size: 1.8rem; color: #CBD5E1; margin-bottom: 8px;"></i>
        <p>Belum ada produk sepeda motor yang dilihat pada rentang tanggal ini.</p>
      </div>
    `;
    return;
  }

  const maxViews = Math.max(...sortedProducts.map(p => p[1]), 1);

  let html = `<div class="stats-top-table">`;
  sortedProducts.forEach(([name, count], idx) => {
    const rank = idx + 1;
    const percent = Math.min(100, Math.round((count / maxViews) * 100));
    
    // Badge ranking 1, 2, 3 warna khusus
    let rankBadgeClass = "rank-other";
    if (rank === 1) rankBadgeClass = "rank-gold";
    else if (rank === 2) rankBadgeClass = "rank-silver";
    else if (rank === 3) rankBadgeClass = "rank-bronze";

    html += `
      <div class="stats-top-row">
        <div class="stats-rank ${rankBadgeClass}">${rank}</div>
        <div class="stats-prod-info">
          <div class="stats-prod-head">
            <span class="stats-prod-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
            <span class="stats-prod-count"><strong>${formatNumber(count)}</strong> <small>views</small></span>
          </div>
          <div class="stats-bar-track">
            <div class="stats-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      </div>
    `;
  });
  html += `</div>`;

  container.innerHTML = html;
}

/**
 * Render Distribusi Halaman & Interaksi Klik
 */
function renderPagesAndInteractions(filteredData) {
  const pagesContainer = document.getElementById("stats-pages-list");
  const clicksContainer = document.getElementById("stats-clicks-list");

  // 1. Pages
  if (pagesContainer) {
    const pageCounts = {};
    filteredData.forEach(item => {
      for (const [pName, count] of Object.entries(item.pages || {})) {
        pageCounts[pName] = (pageCounts[pName] || 0) + Number(count || 0);
      }
    });

    const sortedPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]);
    if (sortedPages.length === 0) {
      pagesContainer.innerHTML = `<p class="text-muted" style="font-size: 0.85rem;">Belum ada kunjungan halaman tercatat.</p>`;
    } else {
      let pHtml = `<div class="stats-distribution-list">`;
      const pageLabels = {
        "home": "Beranda Dealer (Landing Page)",
        "tanya_jawab": "Halaman Tanya Jawab Konsumen"
      };

      sortedPages.forEach(([p, count]) => {
        const displayName = pageLabels[p] || p;
        pHtml += `
          <div class="stats-dist-row">
            <div class="stats-dist-name"><i class="fa-regular fa-file-lines" style="color: #64748B;"></i> ${escapeHtml(displayName)}</div>
            <div class="stats-dist-val">${formatNumber(count)} views</div>
          </div>
        `;
      });
      pHtml += `</div>`;
      pagesContainer.innerHTML = pHtml;
    }
  }

  // 2. Clicks
  if (clicksContainer) {
    let waClicks = 0;
    let promoClicks = 0;
    let otherClicks = 0;

    filteredData.forEach(item => {
      for (const [cName, count] of Object.entries(item.clicks || {})) {
        const val = Number(count || 0);
        if (cName === "whatsapp") waClicks += val;
        else if (cName === "promo_consult") promoClicks += val;
        else otherClicks += val;
      }
    });

    clicksContainer.innerHTML = `
      <div class="stats-click-cards">
        <div class="stats-click-box click-wa">
          <div class="click-icon"><i class="fa-brands fa-whatsapp"></i></div>
          <div class="click-details">
            <div class="click-title">WhatsApp / Chat Sales</div>
            <div class="click-number">${formatNumber(waClicks)} <small>klik</small></div>
            <div class="click-sub">Konsumen menghubungi sales</div>
          </div>
        </div>

        <div class="stats-click-box click-promo">
          <div class="click-icon"><i class="fa-solid fa-bullhorn"></i></div>
          <div class="click-details">
            <div class="click-title">Konsultasi Promo Banner</div>
            <div class="click-number">${formatNumber(promoClicks)} <small>klik</small></div>
            <div class="click-sub">Tertarik pada 5 banner promo</div>
          </div>
        </div>
      </div>
    `;
  }
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

/**
 * Update seluruh UI tab statistik berdasarkan rentang aktif
 */
export function updateStatsView() {
  const summary = calculateSummaryCards(allStatsRecords);
  renderSummaryCards(summary);

  const filteredData = getFilteredRecords(allStatsRecords, currentFilterRange);
  renderLineChart(filteredData);
  renderTopProducts(filteredData);
  renderPagesAndInteractions(filteredData);
}

/**
 * Inisialisasi Modul Statistik Admin
 */
export async function initAdminStats() {
  // Bind Tombol Filter Rentang Tanggal
  const filterButtons = document.querySelectorAll(".btn-stats-filter");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilterRange = btn.dataset.range || "7d";
      updateStatsView();
    });
  });

  // Tombol Refresh Statistik
  const refreshBtn = document.getElementById("btn-refresh-stats");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      const icon = refreshBtn.querySelector("i");
      if (icon) icon.classList.add("fa-spin");
      
      try {
        await loadStatsData();
        updateStatsView();
      } finally {
        setTimeout(() => {
          refreshBtn.disabled = false;
          if (icon) icon.classList.remove("fa-spin");
        }, 500);
      }
    });
  }

  // Muat data awal
  await loadStatsData();
  updateStatsView();

  // Resize listener agar chart tetap responsif saat ukuran jendela berubah
  window.addEventListener("resize", () => {
    if (trafficChartInstance) {
      trafficChartInstance.resize();
    }
  });

  // Hook global saat tab Statistik dibuka agar chart ter-render sempurna
  window.onStatsTabOpen = () => {
    setTimeout(() => {
      if (trafficChartInstance) {
        trafficChartInstance.resize();
      } else {
        updateStatsView();
      }
    }, 50);
  };
}
