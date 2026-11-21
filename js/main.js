// ==========================================================================
// HENGKI HONDA JPA
// main.js - Rendering Landing Page dari Firestore dengan Fallback Cerdas
// ==========================================================================

import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  getDocFromServer,
  onSnapshot,
  addDoc,
  query,
  orderBy
} from "./firebase-config.js";

import { 
  openProductModal, 
  initModalListeners, 
  formatRupiah,
  showToast 
} from "./product-detail.js";

// Global App State
let allProducts = [];
let allTestimonials = [];
let appSettings = null;
let currentCategory = "all";
let searchKeyword = "";

// DOM Elements
const productsGrid = document.getElementById("products-grid");
const searchInput = document.getElementById("search-input");
const categoryTabs = document.getElementById("category-tabs");
const mobileToggle = document.getElementById("mobile-toggle");
const mobileDrawer = document.getElementById("mobile-menu-drawer");

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  initModalListeners();
  initMobileMenu();
  initCategoryFilters();
  initSearch();
  initScrollSpy();
  initPromoStack();
  initQna();

  // Load All Data
  await Promise.all([
    loadSettings(),
    loadProducts(),
    loadTestimonials()
  ]);
});

// ==========================================================================
// 1. Settings, Hero, About & Contact Loader
// ==========================================================================
async function loadSettings() {
  let defaults = {};
  try {
    const defaultsResponse = await fetch("data/default-settings.json");
    defaults = await defaultsResponse.json();
  } catch (err) {
    console.warn("Pengaturan default tidak dapat dimuat:", err);
  }

  try {
    // Try fetching from Firestore
    const readFresh = async (reference) => {
      try {
        return await getDocFromServer(reference);
      } catch (error) {
        console.warn("Server Firestore tidak tersedia, gunakan cache:", error.message);
        return await getDoc(reference);
      }
    };
    const [contactSnap, waTemplateSnap, heroSnap, aboutSnap] = await Promise.all([
      readFresh(doc(db, "settings", "contact")),
      readFresh(doc(db, "settings", "waTemplate")),
      readFresh(doc(db, "hero", "main")),
      readFresh(doc(db, "about", "main"))
    ]);

    // Merge per section: creating one Firestore settings document must not
    // discard defaults for the other sections or blank legacy hero fields.
    const settings = {
      ...defaults,
      contact: { ...(defaults.contact || {}), ...(contactSnap.exists() ? contactSnap.data() : {}) },
      waTemplate: { ...(defaults.waTemplate || {}), ...(waTemplateSnap.exists() ? waTemplateSnap.data() : {}) },
      hero: { ...(defaults.hero || {}), ...(heroSnap.exists() ? heroSnap.data() : {}) },
      about: { ...(defaults.about || {}), ...(aboutSnap.exists() ? aboutSnap.data() : {}) }
    };

    // Sinkronisasi cadangan promo lokal jika ada update dari admin
    try {
      const cachedPromo = localStorage.getItem("admin_promo_slots");
      if (cachedPromo) {
        const parsed = JSON.parse(cachedPromo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          settings.hero.promoList = parsed;
        }
      }
    } catch (e) {}

    // Sinkronisasi cadangan kontak lokal
    try {
      const cachedContact = localStorage.getItem("admin_contact_settings");
      if (cachedContact) {
        settings.contact = { ...(settings.contact || {}), ...JSON.parse(cachedContact) };
      }
    } catch (e) {}

    if (!settings.hero.backgroundUrl) settings.hero.backgroundUrl = defaults.hero?.backgroundUrl || "";
    if (!settings.hero.promoImageUrl) settings.hero.promoImageUrl = defaults.hero?.promoImageUrl || "";

    appSettings = settings;
    renderHero(settings.hero);
    renderAbout(settings.about);
    renderContact(settings.contact);

    // Setup Realtime listeners for quick live updates if online
    setupRealtimeSettings();

  } catch (err) {
    console.warn("Firestore settings load failed, using fallback:", err);
    try {
      appSettings = defaults;
      try {
        const cachedPromo = localStorage.getItem("admin_promo_slots");
        if (cachedPromo) {
          const parsed = JSON.parse(cachedPromo);
          if (Array.isArray(parsed) && parsed.length > 0) {
            appSettings.hero = { ...(appSettings.hero || {}), promoList: parsed };
          }
        }
        const cachedContact = localStorage.getItem("admin_contact_settings");
        if (cachedContact) {
          appSettings.contact = { ...(appSettings.contact || {}), ...JSON.parse(cachedContact) };
        }
      } catch (e) {}

      renderHero(appSettings.hero || {});
      renderAbout(appSettings.about);
      renderContact(appSettings.contact);
    } catch (e) {
      console.error("Critical: Could not load default settings", e);
    }
  }
}

function setupRealtimeSettings() {
  try {
    onSnapshot(doc(db, "hero", "main"), (snap) => {
      // The first snapshot may come from an old local cache. The server read
      // above is authoritative; ignore cached events that could roll it back.
      if (snap.metadata.fromCache || !snap.exists()) return;
      appSettings.hero = { ...(appSettings.hero || {}), ...snap.data() };
      renderHero(appSettings.hero);
    }, (error) => console.warn("Listener hero gagal:", error));

    onSnapshot(doc(db, "about", "main"), (snap) => {
      if (snap.metadata.fromCache) return;
      if (snap.exists()) {
        appSettings.about = snap.data();
        renderAbout(appSettings.about);
      }
    }, (error) => console.warn("Listener about gagal:", error));

    onSnapshot(doc(db, "settings", "contact"), (snap) => {
      if (snap.metadata.fromCache) return;
      if (snap.exists()) {
        appSettings.contact = snap.data();
        renderContact(appSettings.contact);
      }
    }, (error) => console.warn("Listener kontak gagal:", error));

    onSnapshot(doc(db, "settings", "waTemplate"), (snap) => {
      if (snap.metadata.fromCache) return;
      if (snap.exists()) {
        appSettings.waTemplate = snap.data();
      }
    }, (error) => console.warn("Listener template gagal:", error));
  } catch (e) {
    console.log("Realtime listener disabled:", e.message);
  }
}

function renderHero(hero) {
  hero = hero || {};

  const heroSection = document.getElementById("beranda");
  const heroTitle = document.getElementById("hero-title");
  const heroTitleMain = document.getElementById("hero-title-main");
  const heroSubtitle = document.getElementById("hero-subtitle");
  const heroTagline = document.getElementById("hero-tagline");
  const heroCtaBtn = document.getElementById("hero-cta-btn");
  const heroPromoWrapper = document.getElementById("hero-promo-wrapper");

  // Jangan pernah tambahkan parameter cache-buster (?v=...) pada data: URI (base64)
  const withHeroVersion = (url) => {
    if (!url || !hero.updatedAt || url.startsWith("data:")) return url || "";
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(hero.updatedAt)}`;
  };

  const backgroundUrl = withHeroVersion(hero.backgroundUrl);
  const promoEnabled = hero.promoActive !== false;

  // Terapkan foto background hero dari Firebase atau aset lokal
  if (heroSection) {
    if (backgroundUrl) {
      heroSection.style.backgroundImage = `url("${backgroundUrl}")`;
    } else {
      heroSection.style.backgroundImage = `url("assets/img/hero/hero-bg.jpg")`;
    }
  }

  // Teks judul, subjudul, dan tagline
  if (hero.title) {
    if (heroTitleMain) {
      heroTitleMain.textContent = hero.title;
    } else if (heroTitle && heroTitle.childNodes.length > 0) {
      heroTitle.childNodes[0].textContent = hero.title + " ";
    }
  }
  if (hero.subtitle && heroSubtitle) {
    heroSubtitle.textContent = hero.subtitle;
  }
  if (hero.tagline && heroTagline) {
    heroTagline.textContent = hero.tagline;
  }
  if (hero.ctaText && heroCtaBtn) {
    heroCtaBtn.innerHTML = `<i class="fa-solid fa-motorcycle"></i> ${hero.ctaText}`;
  }

  // Tampilkan atau sembunyikan banner promo overlay
  if (heroPromoWrapper) {
    heroPromoWrapper.style.display = promoEnabled ? "flex" : "none";
  }

  // Terapkan daftar 5 foto promo jika tersedia dari Firestore / default settings
  if (Array.isArray(hero.promoList) && hero.promoList.length > 0) {
    const stack = document.getElementById("hero-promo-stack");
    if (stack) {
      const cards = stack.querySelectorAll(".hero-promo-card");
      hero.promoList.forEach((promoItem, idx) => {
        if (cards[idx]) {
          const img = cards[idx].querySelector("img");
          if (img && promoItem.url) {
            img.src = withHeroVersion(promoItem.url);
          }
        }
      });
    }
  } else if (hero.promoImageUrl) {
    const img0 = document.getElementById("hero-promo-img-0");
    if (img0) {
      img0.src = withHeroVersion(hero.promoImageUrl);
    }
  }
}

// ==========================================================================
// Inisialisasi 5 Kartu Banner Promo Bergantian (Flying 3D Floating Effect)
// ==========================================================================
function initPromoStack() {
  const stack = document.getElementById("hero-promo-stack");
  const wrapper = document.getElementById("hero-promo-wrapper");
  if (!stack || !wrapper) return;

  const cards = Array.from(stack.querySelectorAll(".hero-promo-card"));
  const dots = Array.from(wrapper.querySelectorAll(".promo-dot"));
  const prevBtn = document.getElementById("promo-prev-btn");
  const nextBtn = document.getElementById("promo-next-btn");

  const totalCards = cards.length;
  if (totalCards < 2) return;

  let currentIndex = 0;
  let autoPlayTimer = null;
  const ROTATE_INTERVAL = 4500; // 4.5 detik bergantian otomatis

  function updatePositions() {
    cards.forEach((card, index) => {
      // Hapus semua kelas posisi sebelumnya
      card.className = card.className.replace(/\bpromo-pos-\S+/g, "").trim();

      const offset = (index - currentIndex + totalCards) % totalCards;
      card.classList.add(`promo-pos-${offset}`);
      card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentIndex);
    });
  }

  function goTo(index) {
    currentIndex = (index + totalCards) % totalCards;
    updatePositions();
  }

  function next() {
    goTo(currentIndex + 1);
  }

  function prev() {
    goTo(currentIndex - 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setInterval(next, ROTATE_INTERVAL);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  // Klik kartu di stack
  cards.forEach((card, index) => {
    card.addEventListener("click", () => {
      if (currentIndex !== index) {
        // Klik kartu di belakang langsung memindahkannya ke posisi depan
        goTo(index);
        startAutoPlay();
      } else {
        // Klik kartu posisi depan membuka WhatsApp untuk konsultasi promo
        const waBtn = document.getElementById("hero-wa-btn") || document.getElementById("mobile-wa-cta");
        if (waBtn && waBtn.href) {
          window.open(waBtn.href, "_blank", "noopener,noreferrer");
        }
      }
    });
  });

  // Tombol navigasi panah
  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      next();
      startAutoPlay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      prev();
      startAutoPlay();
    });
  }

  // Tombol dots
  dots.forEach((dot, index) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      goTo(index);
      startAutoPlay();
    });
  });

  // Hentikan rotasi otomatis saat kursor berada di atas promo
  wrapper.addEventListener("mouseenter", stopAutoPlay);
  wrapper.addEventListener("mouseleave", startAutoPlay);

  // Swipe gesture untuk mobile
  let touchStartX = 0;
  let touchEndX = 0;

  wrapper.addEventListener("touchstart", (e) => {
    stopAutoPlay();
    if (e.changedTouches && e.changedTouches[0]) {
      touchStartX = e.changedTouches[0].screenX;
    }
  }, { passive: true });

  wrapper.addEventListener("touchend", (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 35) {
        if (diff > 0) {
          next();
        } else {
          prev();
        }
      }
    }
    startAutoPlay();
  }, { passive: true });

  // Tampilkan susunan awal & jalankan auto play
  updatePositions();
  startAutoPlay();
}

// ==========================================================================
// Tanya Jawab (QnA) Konsumen - Anti-Spam & Moderasi
// ==========================================================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatQnaDate(isoStr) {
  if (!isoStr) return "";
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

function initQna() {
  const listContainer = document.getElementById("qna-items-container");
  const countBadge = document.getElementById("qna-badge-count");
  const searchInput = document.getElementById("qna-search-input");
  const filterPills = document.querySelectorAll(".qna-filter-pill");

  if (!listContainer) return;

  let publicQnaList = [];
  let currentFilter = "all";
  let searchKeyword = "";

  // 1. Setup Filter Pills
  if (filterPills.length > 0) {
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentFilter = pill.dataset.qnaFilter || "all";
        applyFiltersAndRender();
      });
    });
  }

  // 2. Setup Live Search Input
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchKeyword = (searchInput.value || "").trim().toLowerCase();
      applyFiltersAndRender();
    });
  }

  function applyFiltersAndRender() {
    let filtered = publicQnaList;

    // Filter by status
    if (currentFilter === "answered") {
      filtered = filtered.filter(item => item.jawaban && item.jawaban.trim() !== "");
    } else if (currentFilter === "waiting") {
      filtered = filtered.filter(item => !item.jawaban || item.jawaban.trim() === "");
    }

    // Filter by search keyword
    if (searchKeyword) {
      filtered = filtered.filter(item => {
        const text = `${item.nama || ''} ${item.pertanyaan || ''} ${item.jawaban || ''} ${item.topik || ''}`.toLowerCase();
        return text.includes(searchKeyword);
      });
    }

    renderQnaList(filtered);
  }

  function renderQnaList(items) {
    if (!listContainer) return;

    if (countBadge) {
      countBadge.textContent = `${items.length} Pertanyaan`;
    }

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="qna-empty-state">
          <i class="fa-solid fa-comments"></i>
          <h4>Belum Ada Pertanyaan yang Sesuai</h4>
          <p>Belum ada diskusi untuk kata kunci atau filter ini. Jadilah yang pertama bertanya seputar motor Honda!</p>
          <a href="tanya-jawab.html" class="btn-primary" style="margin-top: 14px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; padding: 10px 22px; border-radius: 20px; font-weight: 700;">
            <i class="fa-solid fa-pen-to-square"></i> Tulis Pertanyaan Baru (Maks. 500 Karakter)
          </a>
        </div>
      `;
      return;
    }

    let html = "";
    items.forEach((item) => {
      const isAnswered = item.jawaban && item.jawaban.trim() !== "";
      const isPending = item.status === "pending";
      const avatarLetter = (item.nama || "K").charAt(0).toUpperCase();

      html += `
        <div class="qna-item-card">
          <div class="qna-item-top">
            <div class="qna-item-user">
              <div class="qna-user-avatar">${escapeHtml(avatarLetter)}</div>
              <div>
                <div class="qna-user-name">${escapeHtml(item.nama)}</div>
                <div class="qna-item-date">
                  <i class="fa-regular fa-clock" style="margin-right: 3px;"></i>${formatQnaDate(item.createdAt)}
                  ${item.topik ? ` &bull; <span class="qna-badge-topic">${escapeHtml(item.topik)}</span>` : ''}
                </div>
              </div>
            </div>
            <div>
              ${isAnswered 
                ? '<span class="qna-status-badge answered"><i class="fa-solid fa-circle-check"></i> Terjawab</span>' 
                : (isPending 
                    ? '<span class="qna-status-badge waiting"><i class="fa-solid fa-shield-halved"></i> Sedang Ditinjau Admin</span>'
                    : '<span class="qna-status-badge waiting"><i class="fa-solid fa-clock"></i> Menunggu Jawaban</span>'
                  )
              }
            </div>
          </div>
          <div class="qna-question-text">${escapeHtml(item.pertanyaan)}</div>
          ${isAnswered ? `
            <div class="qna-answer-box">
              <div class="qna-answer-header">
                <span class="qna-admin-tag"><i class="fa-solid fa-shield-halved"></i> Tanggapan Resmi Sales Hengki Honda JPA</span>
                <span class="qna-answer-date">${formatQnaDate(item.answeredAt)}</span>
              </div>
              <div class="qna-answer-text">${escapeHtml(item.jawaban)}</div>
            </div>
          ` : ""}
        </div>
      `;
    });

    listContainer.innerHTML = html;
  }

  // Gabungkan Firestore + LocalStorage
  function mergeAndDisplay(firestoreItems = []) {
    let localList = [];
    try {
      localList = JSON.parse(localStorage.getItem("offline_qna") || "[]");
    } catch (e) {
      localList = [];
    }

    let mySubmitted = [];
    try {
      mySubmitted = JSON.parse(localStorage.getItem("my_submitted_qna") || "[]");
    } catch (e) {
      mySubmitted = [];
    }

    const map = new Map();

    // 1. Tambahkan item Firestore yang berstatus approved
    firestoreItems.forEach(item => {
      if (item.status === "approved") {
        map.set(item.id, item);
      }
    });

    // 2. Tambahkan item lokal jika approved atau milik visitor saat ini
    localList.forEach(item => {
      const isMine = item.id && mySubmitted.includes(item.id);
      if (item.status === "approved" || isMine) {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      }
    });

    let combined = Array.from(map.values());

    // 3. Jika belum ada data sama sekali, gunakan seed demo data yang informatif
    if (combined.length === 0) {
      combined = getSeedQna();
    }

    // Urutkan berdasarkan waktu kirim terbaru
    combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    publicQnaList = combined;
    applyFiltersAndRender();
  }

  // Realtime Firestore Listener
  try {
    const q = query(collection(db, "qna"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      mergeAndDisplay(items);
    }, (err) => {
      console.warn("Firestore onSnapshot qna warning:", err);
      mergeAndDisplay([]);
    });
  } catch (err) {
    console.warn("Gagal inisialisasi query qna:", err);
    mergeAndDisplay([]);
  }
}

function getSeedQna() {
  return [
    {
      id: "qna-seed-1",
      nama: "Bpk. Hendra Pratama",
      topik: "Promo DP & Potongan Angsuran",
      pertanyaan: "Apakah ada promo DP ringan atau potongan tenor untuk pengambilan BeAT Sporty CBS lewat leasing FIF?",
      jawaban: "Halo Bpk. Hendra, di Hengki Honda JPA saat ini ada promo DP ringan mulai dari 1 jutaan dan potongan tenor spesial hingga 3 bulan untuk leasing FIF! Silakan hubungi WhatsApp sales kami untuk rincian hitungannya.",
      status: "approved",
      createdAt: "2026-11-20T10:30:00.000Z",
      answeredAt: "2026-11-20T11:15:00.000Z"
    },
    {
      id: "qna-seed-2",
      nama: "Ibu Nurul Aini",
      topik: "Persyaratan Berkas & KTP Luar Kota",
      pertanyaan: "Persyaratan kredit motor untuk wiraswasta apa saja ya? Apakah KTP luar daerah bisa diproses?",
      jawaban: "Halo Ibu Nurul, syarat cukup KTP Suami/Istri, Kartu Keluarga, dan bukti usaha/penghasilan. KTP luar daerah tetap kami bantu proses sampai motor diantar aman ke rumah. Terima kasih!",
      status: "approved",
      createdAt: "2026-11-20T14:20:00.000Z",
      answeredAt: "2026-11-20T15:00:00.000Z"
    },
    {
      id: "qna-seed-3",
      nama: "Bpk. Dedi Supriadi",
      topik: "Simulasi Kredit FIF & OTO",
      pertanyaan: "Untuk Honda Vario 160 CBS, berapa perbandingan angsuran per bulan antara leasing FIF dan OTO untuk tenor 35 bulan?",
      jawaban: "Halo Bpk. Dedi, perbandingan simulasi angsuran FIF dan OTO untuk Vario 160 CBS dapat dilihat langsung di katalog detail motor kami, atau tim sales siap mengirimkan perbandingan simulasi lengkap via WhatsApp.",
      status: "approved",
      createdAt: "2026-11-21T08:15:00.000Z",
      answeredAt: "2026-11-21T09:00:00.000Z"
    }
  ];
}

function renderAbout(about) {
  if (!about) return;

  const aboutImg = document.getElementById("about-img");
  const aboutTitle = document.getElementById("about-title");
  const aboutDesc = document.getElementById("about-desc");

  if (about.foto && aboutImg) aboutImg.src = about.foto;
  if (about.title && aboutTitle) {
    if (about.title.includes("HengkiHondaJPA")) {
      aboutTitle.innerHTML = about.title.replace("HengkiHondaJPA", "<span>HengkiHondaJPA</span>");
    } else {
      aboutTitle.innerHTML = about.title;
    }
  }
  if (about.deskripsi && aboutDesc) {
    aboutDesc.textContent = about.deskripsi;
  }
}

function renderContact(contact) {
  if (!contact) return;

  const addrEl = document.getElementById("contact-address");
  const hoursEl = document.getElementById("contact-hours");
  const mapsIframe = document.getElementById("contact-maps-iframe");

  if (contact.alamat && addrEl) addrEl.textContent = contact.alamat;
  if (contact.jamOperasional && hoursEl) hoursEl.innerHTML = contact.jamOperasional.replace(/ \| /g, "<br>");
  if (contact.googleMapsEmbed && mapsIframe) mapsIframe.src = contact.googleMapsEmbed;

  // WhatsApp Links
  let waHref = contact.whatsappLink || "https://wa.me/6281313133505";
  if (contact.whatsappNumber && contact.whatsappNumber.trim() !== "") {
    let cleanNum = contact.whatsappNumber.replace(/[^0-9]/g, "");
    if (cleanNum.startsWith("0")) cleanNum = "62" + cleanNum.substring(1);
    waHref = `https://wa.me/${cleanNum}?text=${encodeURIComponent("Halo Hengki Honda JPA, saya ingin tanya info motor Honda dan promo terbaru.")}`;
  }

  const phoneDisplay = document.getElementById("contact-phone-display");
  if (phoneDisplay && contact.whatsappNumber) {
    phoneDisplay.innerHTML = `<a href="${waHref}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-red); font-weight: 700;">+62 813-1313-3505 (${contact.whatsappNumber})</a>`;
  }

  const floatingWa = document.getElementById("floating-wa-btn");
  const navWa = document.getElementById("nav-wa-cta");
  const mobileWa = document.getElementById("mobile-wa-cta");
  const heroWa = document.getElementById("hero-wa-btn");
  const socialWa = document.getElementById("social-wa");

  if (floatingWa) floatingWa.href = waHref;
  if (navWa) navWa.href = waHref;
  if (mobileWa) mobileWa.href = waHref;
  if (heroWa) heroWa.href = waHref;
  if (socialWa) socialWa.href = waHref;

  // Social Links
  const igEl = document.getElementById("social-ig");
  const tiktokEl = document.getElementById("social-tiktok");
  const fbEl = document.getElementById("social-fb");

  if (igEl && contact.instagram) igEl.href = contact.instagram;
  if (tiktokEl && contact.tiktok) tiktokEl.href = contact.tiktok;
  if (fbEl) fbEl.href = contact.facebook || "https://www.facebook.com/share/1ER88rzYvK/";
}

// ==========================================================================
// 2. Products Loader & Renderer
// ==========================================================================
async function loadProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    const firestoreProducts = [];

    querySnapshot.forEach(productDoc => {
      firestoreProducts.push({ id: productDoc.id, ...productDoc.data() });
    });

    if (firestoreProducts.length > 0) {
      allProducts = firestoreProducts;
    } else {
      const response = await fetch("data/seed-products.json");
      allProducts = await response.json();
    }
  } catch (err) {
    console.warn("Firestore products load failed, loading fallback data:", err);
    try {
      const response = await fetch("data/seed-products.json");
      allProducts = await response.json();
    } catch (fallbackError) {
      console.error("Critical: Cannot load products fallback", fallbackError);
    }
  }

  // Ensure robust category normalization
  allProducts.forEach(p => {
    p.kategori = getProductCategory(p);
  });

  updateCategoryCounts();
  renderProducts();
}

function getProductCategory(p) {
  const VALID_SERIES = [
    "ADV Series",
    "Beat Series",
    "PCX Series",
    "Vario Series",
    "Scoopy Series",
    "Stylo Series",
    "Genio Series",
    "Supra Series",
    "Revo Series",
    "CBR Series",
    "CB150 Series",
    "CRF/Off-Road Series",
    "CB Verza Series",
    "Forza Series"
  ];

  const rawCat = (p.kategori || p.category || "").trim();
  const match = VALID_SERIES.find(s => s.toLowerCase() === rawCat.toLowerCase());
  if (match) return match;
  if (rawCat.toLowerCase().endsWith("series")) return rawCat;

  const up = ((p.folder || "") + " " + (p.namaMotor || "") + " " + (p.sheet || "") + " " + rawCat).toUpperCase();
  if (up.includes("ADV")) return "ADV Series";
  if (up.includes("BEAT")) return "Beat Series";
  if (up.includes("PCX")) return "PCX Series";
  if (up.includes("VARIO")) return "Vario Series";
  if (up.includes("SCOOPY")) return "Scoopy Series";
  if (up.includes("STYLO")) return "Stylo Series";
  if (up.includes("GENIO")) return "Genio Series";
  if (up.includes("SUPRA") || up.includes("SUPTA")) return "Supra Series";
  if (up.includes("REVO")) return "Revo Series";
  if (up.includes("CBR")) return "CBR Series";
  if (up.includes("CB150R") || up.includes("CB150X") || up.includes("CB 150R") || up.includes("CB 150X") || (up.includes("CB150") && !up.includes("VERZA"))) return "CB150 Series";
  if (up.includes("CRF")) return "CRF/Off-Road Series";
  if (up.includes("VERZA")) return "CB Verza Series";
  if (up.includes("FORZA")) return "Forza Series";

  return rawCat || "Beat Series";
}

function updateCategoryCounts() {
  const countAll = allProducts.length;
  const elAll = document.getElementById("count-all");
  if (elAll) elAll.textContent = countAll;

  // Calculate product counts per category
  const counts = {};
  allProducts.forEach(p => {
    const cat = (p.kategori || "").toLowerCase();
    counts[cat] = (counts[cat] || 0) + 1;
  });

  // Dynamic category tabs for custom categories added in admin
  if (categoryTabs) {
    const existingCats = new Set([...categoryTabs.querySelectorAll(".tab-btn")].map(b => (b.dataset.category || "").toLowerCase()));
    allProducts.forEach(p => {
      const origCat = p.kategori ? p.kategori.trim() : "";
      if (origCat && !existingCats.has(origCat.toLowerCase())) {
        existingCats.add(origCat.toLowerCase());
        const newBtn = document.createElement("button");
        newBtn.className = "tab-btn";
        newBtn.dataset.category = origCat;
        newBtn.innerHTML = `${origCat} <span class="tab-count">${counts[origCat.toLowerCase()] || 0}</span>`;
        newBtn.addEventListener("click", () => {
          categoryTabs.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
          newBtn.classList.add("active");
          currentCategory = origCat;
          renderProducts();
        });
        categoryTabs.appendChild(newBtn);
      }
    });
  }

  // Update count in tab buttons
  const buttons = categoryTabs?.querySelectorAll(".tab-btn");
  buttons?.forEach(btn => {
    const cat = btn.dataset.category;
    if (!cat || cat === "all") return;
    const badge = btn.querySelector(".tab-count");
    if (badge) {
      badge.textContent = counts[cat.toLowerCase()] || 0;
    }
  });
}

function renderProducts() {
  if (!productsGrid) return;

  // Filter by category
  let filtered = allProducts;
  if (currentCategory !== "all") {
    filtered = filtered.filter(p => (p.kategori || "").toLowerCase() === currentCategory.toLowerCase());
  }

  // Filter by search keyword
  if (searchKeyword.trim() !== "") {
    const kw = searchKeyword.toLowerCase();
    filtered = filtered.filter(p => 
      (p.namaMotor || "").toLowerCase().includes(kw) ||
      (p.kategori || "").toLowerCase().includes(kw) ||
      (p.deskripsiSingkat || "").toLowerCase().includes(kw)
    );
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-motorcycle"></i>
        <h3>Motor Tidak Ditemukan</h3>
        <p>Silakan coba kata kunci pencarian lain atau pilih kategori lain.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = "";

  filtered.forEach(product => {
    // Determine main photo
    const mainPhoto = (product.warna && product.warna.length > 0 && product.warna[0].foto) 
      ? product.warna[0].foto 
      : "assets/img/logo/logo.png";

    // Determine leasing badges
    const hasFif = Array.isArray(product.simulasiKreditFif) && product.simulasiKreditFif.length > 0;
    const hasOto = Array.isArray(product.simulasiKreditOto) && product.simulasiKreditOto.length > 0;
    let leasingBadgesHtml = '<div class="product-leasing-badges">';
    if (hasFif) leasingBadgesHtml += '<span class="badge-leasing fif"><img src="assets/img/logo/fif-logo.png" alt="FIF" class="badge-mini-icon" onerror="this.style.display=\'none\'"> FIF</span>';
    if (hasOto) leasingBadgesHtml += '<span class="badge-leasing oto"><img src="assets/img/logo/oto-logo.png" alt="OTO" class="badge-mini-icon" onerror="this.style.display=\'none\'"> OTO</span>';
    leasingBadgesHtml += '<span class="badge-leasing cash">CASH</span></div>';

    // Find minimum cicilan across FIF and OTO
    let allCicilans = [];
    if (hasFif) allCicilans.push(...product.simulasiKreditFif.map(s => s.cicilan).filter(c => c > 0));
    if (hasOto) allCicilans.push(...product.simulasiKreditOto.map(s => s.cicilan).filter(c => c > 0));
    if (allCicilans.length === 0 && product.simulasiKredit) {
      allCicilans.push(...product.simulasiKredit.map(s => s.cicilan).filter(c => c > 0));
    }

    let minCicilanBadge = "";
    if (allCicilans.length > 0) {
      const minCicilan = Math.min(...allCicilans);
      minCicilanBadge = `
        <div class="product-cicilan-badge">
          <i class="fa-solid fa-tags"></i> Cicilan mulai ${formatRupiah(minCicilan)}/bln
        </div>
      `;
    }

    const otrPrice = product.hargaOtr || product.hargaCash || product.hargaCashAsuransi || 0;

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <span class="product-badge-cat">${product.kategori || "Honda"}</span>
      <div class="product-img-box">
        <img src="${mainPhoto}" alt="${product.namaMotor}" class="product-img" loading="lazy" onerror="this.src='assets/img/logo/logo.png'">
      </div>
      <div class="product-body">
        <h3 class="product-name">${product.namaMotor}</h3>
        <div class="product-price-label">Harga OTR Cash Resmi</div>
        <div class="product-price">${formatRupiah(otrPrice)}</div>
        ${leasingBadgesHtml}
        ${minCicilanBadge}
        <button type="button" class="btn-detail">
          <i class="fa-solid fa-calculator"></i> Lihat Detail &amp; Simulasi
        </button>
      </div>
    `;

    // Click handler to open detail modal
    card.querySelector(".btn-detail").addEventListener("click", () => {
      const template = appSettings?.waTemplate?.template;
      const contact = appSettings?.contact;
      openProductModal(product, template, contact);
    });

    productsGrid.appendChild(card);
  });
}

// ==========================================================================
// 3. Testimonials Loader & Renderer
// ==========================================================================
async function loadTestimonials() {
  const container = document.getElementById("testimonials-slider");
  if (!container) return;

  try {
    const snap = await getDocs(collection(db, "testimonials"));
    const firestoreTesti = [];
    snap.forEach(doc => {
      firestoreTesti.push({ id: doc.id, ...doc.data() });
    });

    if (firestoreTesti.length > 0) {
      allTestimonials = firestoreTesti;
    } else {
      const res = await fetch("data/seed-testimonials.json");
      allTestimonials = await res.json();
    }
  } catch (e) {
    console.warn("Firestore testimonials load failed, using fallback:", e);
    try {
      const res = await fetch("data/seed-testimonials.json");
      allTestimonials = await res.json();
    } catch (err) {
      console.error("Critical: Cannot load testimonials", err);
    }
  }

  container.innerHTML = "";
  allTestimonials.forEach(item => {
    const stars = Array(item.rating || 5).fill('<i class="fa-solid fa-star"></i>').join("");

    const card = document.createElement("div");
    card.className = "testi-card";
    card.innerHTML = `
      <div class="testi-body">
        <div class="testi-card-header">
          <div class="testi-avatar-icon">
            <i class="fa-solid fa-user-check"></i>
          </div>
          <div class="testi-meta-info">
            <h4 class="testi-author-name">${item.nama}</h4>
            <span class="testi-badge-text"><i class="fa-solid fa-circle-check"></i> Konsumen Terverifikasi</span>
          </div>
          <div class="testi-stars">${stars}</div>
        </div>
        <div class="testi-comment-box">
          <i class="fa-solid fa-quote-left testi-quote-icon"></i>
          <p class="testi-comment">${item.komentar}</p>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================================================
// 4. UI Interaction & Listeners
// ==========================================================================
function initCategoryFilters() {
  if (!categoryTabs) return;

  const buttons = categoryTabs.querySelectorAll(".tab-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category || "all";
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      renderProducts();
    });
  });

  // Enable mouse-wheel horizontal scrolling over category tabs on desktop
  categoryTabs.addEventListener("wheel", (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      categoryTabs.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

// Expose filterByCategory to global window for footer links
window.filterByCategory = function(cat) {
  currentCategory = cat;
  const buttons = categoryTabs?.querySelectorAll(".tab-btn");
  let targetBtn = null;
  buttons?.forEach(b => {
    if (b.dataset.category.toLowerCase() === cat.toLowerCase()) {
      b.classList.add("active");
      targetBtn = b;
    } else {
      b.classList.remove("active");
    }
  });
  if (targetBtn) {
    targetBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
  renderProducts();
};

function initSearch() {
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    searchKeyword = e.target.value;
    renderProducts();
  });
}

function initMobileMenu() {
  if (!mobileToggle || !mobileDrawer) return;

  mobileToggle.addEventListener("click", () => {
    mobileToggle.classList.toggle("active");
    mobileDrawer.classList.toggle("show");
  });

  // Close when clicking nav link
  mobileDrawer.querySelectorAll(".mobile-nav-link").forEach(link => {
    link.addEventListener("click", () => {
      mobileToggle.classList.remove("active");
      mobileDrawer.classList.remove("show");
    });
  });
}

function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let current = "";
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      const sectionId = section.getAttribute("id");

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        current = sectionId;
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });
}
