// ==========================================================================
// HENGKI HONDA JPA
// product-detail.js - Logic Modal Detail Produk + Simulasi Kredit Dual Leasing (FIF & OTO) + WhatsApp
// ==========================================================================

import { trackProductView } from "./stats-tracker.js";

let currentProduct = null;
let currentColor = null;
let currentLeasing = "FIF"; // "FIF" or "OTO"
let currentWaTemplate = "Halo Hengki Honda JPA, saya tertarik dengan:\nMotor: {namaMotor}\nWarna: {warna}\nHarga OTR Cash: {hargaOtr}\nPilihan Leasing: {leasing}\nSimulasi Kredit: DP {dp} - Tenor {tenor} bulan - Cicilan {cicilan}/bulan\nMohon info persyaratan dan promo terbarunya. Terima kasih.";
let currentContact = {
  whatsappNumber: "081313133505",
  whatsappLink: "https://wa.me/6281313133505"
};

// Format Rupiah Helper
export function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) return "Hubungi Sales";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(num);
}

// Show Toast Notification
export function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-message");
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.className = `toast-notification show ${type === "error" ? "error" : ""}`;

  setTimeout(() => {
    toast.className = "toast-notification";
  }, 4000);
}

// Open Product Modal
export function openProductModal(product, waTemplate = null, contact = null) {
  currentProduct = product;
  if (waTemplate) currentWaTemplate = waTemplate;
  if (contact) currentContact = contact;

  if (product && product.namaMotor) {
    trackProductView(product.namaMotor);
  }

  const modal = document.getElementById("product-modal");
  const modalImg = document.getElementById("modal-main-img");
  const modalTitle = document.getElementById("modal-product-title");
  const modalCat = document.getElementById("modal-category-badge");
  const modalDesc = document.getElementById("modal-desc-box");
  const modalCash = document.getElementById("modal-cash-price");
  const modalInsurance = document.getElementById("modal-insurance-price");
  const modalTotalCash = document.getElementById("modal-total-cash-price");
  const modalInsuranceBox = document.getElementById("modal-insurance-box");
  const modalColorList = document.getElementById("modal-color-list");
  const modalColorSelected = document.getElementById("modal-selected-color");

  if (!modal) return;

  // Set Basic Info
  modalTitle.textContent = product.namaMotor || "Sepeda Motor Honda";
  modalCat.textContent = product.kategori || "Honda Series";
  modalDesc.textContent = product.deskripsiSingkat || "Motor Honda resmi dengan performa terbaik, irit bahan bakar, dan garansi resmi Astra Honda Motor.";
  
  // Set Cash & Asuransi Info
  const otrPrice = product.hargaOtr || product.hargaCash || product.hargaCashAsuransi || 0;
  const asuransiPrice = product.hargaAsuransi || 0;
  const totalCashAsuransi = product.hargaTotalCashAsuransi || (otrPrice + asuransiPrice);

  modalCash.textContent = formatRupiah(otrPrice);
  if (modalInsurance) {
    modalInsurance.textContent = formatRupiah(asuransiPrice);
  }
  if (modalTotalCash) {
    modalTotalCash.textContent = formatRupiah(totalCashAsuransi);
  }
  if (modalInsuranceBox) {
    modalInsuranceBox.style.display = asuransiPrice > 0 ? "flex" : "none";
  }

  // Setup Colors & Gallery
  modalColorList.innerHTML = "";
  const warnaList = (product.warna && product.warna.length > 0) 
    ? product.warna 
    : [{ nama: "Standar", foto: "assets/img/logo/logo.png" }];

  currentColor = warnaList[0];
  modalColorSelected.textContent = currentColor.nama;
  modalImg.src = currentColor.foto;
  modalImg.alt = `${product.namaMotor} - ${currentColor.nama}`;

  warnaList.forEach((w, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `color-chip ${index === 0 ? "active" : ""}`;
    chip.innerHTML = `
      <img src="${w.foto}" alt="${w.nama}" class="color-chip-thumb" onerror="this.src='assets/img/logo/logo.png'">
      <span>${w.nama}</span>
    `;

    chip.addEventListener("click", () => {
      document.querySelectorAll(".color-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentColor = w;
      modalColorSelected.textContent = w.nama;
      
      // Animate image switch
      modalImg.style.opacity = "0";
      modalImg.style.transform = "scale(0.96)";
      setTimeout(() => {
        modalImg.src = w.foto;
        modalImg.alt = `${product.namaMotor} - ${w.nama}`;
        modalImg.style.opacity = "1";
        modalImg.style.transform = "scale(1)";
      }, 150);
    });

    modalColorList.appendChild(chip);
  });

  // Setup Leasing Buttons & Simulation
  const hasFif = Array.isArray(product.simulasiKreditFif) && product.simulasiKreditFif.length > 0;
  const hasOto = Array.isArray(product.simulasiKreditOto) && product.simulasiKreditOto.length > 0;

  if (hasFif) {
    currentLeasing = "FIF";
  } else if (hasOto) {
    currentLeasing = "OTO";
  } else {
    currentLeasing = "FIF";
  }

  setupLeasingUI(hasFif, hasOto);
  setupSimulation(product);

  // Show Modal
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Update Leasing Buttons UI
function setupLeasingUI(hasFif, hasOto) {
  const btnFif = document.getElementById("btn-leasing-fif");
  const btnOto = document.getElementById("btn-leasing-oto");
  const activeLabel = document.getElementById("sim-active-leasing-name");

  if (btnFif) {
    btnFif.classList.toggle("active", currentLeasing === "FIF");
    btnFif.style.opacity = hasFif ? "1" : "0.5";
    btnFif.title = hasFif ? "Pilihan simulasi FIFASTRA" : "Data FIF hubungi sales";
  }
  if (btnOto) {
    btnOto.classList.toggle("active", currentLeasing === "OTO");
    btnOto.style.opacity = hasOto ? "1" : "0.5";
    btnOto.title = hasOto ? "Pilihan simulasi OTO Multiartha" : "Data OTO hubungi sales";
  }

  if (activeLabel) {
    activeLabel.textContent = currentLeasing === "FIF" ? "FIFASTRA" : "OTO Finance";
  }
}

// Switch between FIF and OTO
export function switchLeasing(leasingType) {
  if (currentLeasing === leasingType) return;
  currentLeasing = leasingType;

  const hasFif = Array.isArray(currentProduct?.simulasiKreditFif) && currentProduct.simulasiKreditFif.length > 0;
  const hasOto = Array.isArray(currentProduct?.simulasiKreditOto) && currentProduct.simulasiKreditOto.length > 0;

  setupLeasingUI(hasFif, hasOto);
  if (currentProduct) {
    setupSimulation(currentProduct);
  }
}

// Setup Credit Simulation Dropdowns based on active leasing
function setupSimulation(product) {
  const dpSelect = document.getElementById("sim-dp-select");
  const tenorSelect = document.getElementById("sim-tenor-select");
  const cicilanVal = document.getElementById("sim-cicilan-value");

  if (!dpSelect || !tenorSelect || !cicilanVal) return;

  let simList = [];
  if (currentLeasing === "FIF") {
    simList = (product.simulasiKreditFif && product.simulasiKreditFif.length > 0)
      ? product.simulasiKreditFif
      : (product.simulasiKredit || []);
  } else {
    simList = (product.simulasiKreditOto && product.simulasiKreditOto.length > 0)
      ? product.simulasiKreditOto
      : (product.simulasiKredit || []);
  }

  if (!simList || simList.length === 0) {
    dpSelect.innerHTML = '<option value="">Tidak ada paket DP</option>';
    tenorSelect.innerHTML = '<option value="">Hubungi Sales</option>';
    cicilanVal.textContent = "Hubungi Sales";
    dpSelect.disabled = true;
    tenorSelect.disabled = true;
    return;
  }

  dpSelect.disabled = false;
  tenorSelect.disabled = false;

  // Extract unique DPs
  const uniqueDps = [...new Set(simList.map(item => item.dp))].sort((a, b) => a - b);

  dpSelect.innerHTML = "";
  uniqueDps.forEach(dp => {
    const opt = document.createElement("option");
    opt.value = dp;
    opt.textContent = formatRupiah(dp);
    dpSelect.appendChild(opt);
  });

  // Update Tenors for selected DP
  const updateTenors = () => {
    const selectedDp = parseInt(dpSelect.value);
    const availableItems = simList.filter(item => item.dp === selectedDp);
    
    // Sort tenors ascending
    availableItems.sort((a, b) => a.tenor - b.tenor);

    tenorSelect.innerHTML = "";
    availableItems.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.tenor;
      opt.textContent = `${item.tenor} Bulan`;
      tenorSelect.appendChild(opt);
    });

    // Auto calculate
    calculateCicilan();
  };

  const calculateCicilan = () => {
    const selectedDp = parseInt(dpSelect.value);
    const selectedTenor = parseInt(tenorSelect.value);

    const match = simList.find(item => item.dp === selectedDp && item.tenor === selectedTenor);
    if (match && match.cicilan) {
      cicilanVal.textContent = `${formatRupiah(match.cicilan)} / bln`;
    } else {
      cicilanVal.textContent = "Pilih DP & Tenor";
    }
  };

  dpSelect.onchange = updateTenors;
  tenorSelect.onchange = calculateCicilan;

  // Trigger initial populate
  updateTenors();
}

// Handle Order via WhatsApp
export function handleOrderWhatsApp() {
  if (!currentProduct) return;

  const dpSelect = document.getElementById("sim-dp-select");
  const tenorSelect = document.getElementById("sim-tenor-select");
  const cicilanVal = document.getElementById("sim-cicilan-value");

  const selectedColor = currentColor ? currentColor.nama : "Standar";
  const selectedDp = dpSelect && dpSelect.value ? formatRupiah(parseInt(dpSelect.value)) : "-";
  const selectedTenor = tenorSelect && tenorSelect.value ? tenorSelect.value : "-";
  const otrPrice = currentProduct.hargaOtr || currentProduct.hargaCash || currentProduct.hargaCashAsuransi || 0;
  const asuransiPrice = currentProduct.hargaAsuransi || 0;
  const totalCashAsuransi = currentProduct.hargaTotalCashAsuransi || (otrPrice + asuransiPrice);
  const hargaCashText = formatRupiah(otrPrice);
  const asuransiText = formatRupiah(asuransiPrice);
  const totalCashText = formatRupiah(totalCashAsuransi);
  const leasingText = currentLeasing === "FIF" ? "FIFASTRA (FIF)" : "OTO Multiartha (OTO)";

  const cicilanText = (cicilanVal && cicilanVal.textContent && !cicilanVal.textContent.includes("Pilih") && cicilanVal.textContent !== "-")
    ? cicilanVal.textContent.trim() 
    : "-";

  // Generate Message from Template
  let message = currentWaTemplate;
  message = message.replace(/{namaMotor}/g, currentProduct.namaMotor || "");
  message = message.replace(/{warna}/g, selectedColor);
  message = message.replace(/{hargaOtr}/g, hargaCashText);
  message = message.replace(/{leasing}/g, leasingText);
  message = message.replace(/{dp}/g, selectedDp);
  message = message.replace(/{tenor}/g, selectedTenor);
  message = message.replace(/{cicilan}/g, cicilanText);
  message = message.replace(/{hargaCash}/g, hargaCashText);
  message = message.replace(/{asuransi}/g, asuransiText);
  message = message.replace(/{totalCashAsuransi}/g, totalCashText);

  // If template lacks leasing or OTR info, enrich it
  if (!message.includes(leasingText)) {
    message += `\n\nInfo Tambahan:\n- Harga OTR Cash: ${hargaCashText}\n- Pilihan Pembiayaan: ${leasingText}\n- Simulasi: DP ${selectedDp} | Tenor ${selectedTenor} Bulan | Angsuran ${cicilanText}`;
  }

  // Decide WhatsApp URL
  let waNumber = (currentContact?.whatsappNumber || "").trim().replace(/[^0-9]/g, "");
  if (waNumber.startsWith("0")) {
    waNumber = "62" + waNumber.substring(1);
  }

  let waUrl = "";
  if (waNumber && waNumber.length >= 9) {
    waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  } else {
    const baseLink = currentContact?.whatsappLink || "https://wa.me/6281313133505";
    const separator = baseLink.includes("?") ? "&" : "?";
    waUrl = `${baseLink}${separator}text=${encodeURIComponent(message)}`;
  }

  // Copy template to clipboard as convenience
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message).catch(() => {});
  }
  showToast("Membuka WhatsApp & menyiapkan pesan pesanan...");

  // Open WhatsApp in new tab
  const tempLink = document.createElement("a");
  tempLink.href = waUrl;
  tempLink.target = "_blank";
  tempLink.rel = "noopener noreferrer";
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
}

// Close Modal Handler
export function closeModal() {
  const modal = document.getElementById("product-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// Initialize Modal Event Listeners
export function initModalListeners() {
  const modal = document.getElementById("product-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  const btnWa = document.getElementById("btn-modal-wa");
  const btnFif = document.getElementById("btn-leasing-fif");
  const btnOto = document.getElementById("btn-leasing-oto");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (btnWa) {
    btnWa.addEventListener("click", handleOrderWhatsApp);
  }

  if (btnFif) {
    btnFif.addEventListener("click", () => switchLeasing("FIF"));
  }

  if (btnOto) {
    btnOto.addEventListener("click", () => switchLeasing("OTO"));
  }

  // Click outside to close
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Escape key to close
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("active")) {
      closeModal();
    }
  });
}
