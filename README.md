# HENGKI HONDA JPA - Website Dealer Resmi Sepeda Motor Honda

Website resmi dealer sepeda motor Honda **HENGKI HONDA JPA** (PT Jaya Perkasa Abadi) yang melayani penjualan unit motor Honda baru secara Cash maupun Kredit (rekanan resmi FIFASTRA & OTO Multiartha) dengan fitur katalog produk interaktif, simulasi kredit dual leasing, pemesanan langsung via WhatsApp, dan dashboard administrator terintegrasi Google Firebase (Firestore & Authentication).

---

## 🌟 Fitur Utama

### 1. Landing Page Konsumen (Publik)
* **Hero Banner & Promo:** Menampilkan identitas dealer resmi, background hero dinamis, serta banner promo berjalan.
* **Katalog Produk & Filter Kategori:** 46 tipe sepeda motor Honda terbagi dalam kategori lengkap (BeAT, Vario, Scoopy, Genio, PCX, ADV, Stylo, Revo, Supra, CB150, CBR, CRF, Forza, dll).
* **Modal Detail Motor Interaktif:**
  * Pilihan varian warna motor dengan foto beresolusi tinggi.
  * Tampilan harga OTR Cash dan simulasi cicilan bulanan.
  * **Dual Leasing Selector (FIF & OTO):** Konsumen dapat beralih skema cicilan FIF atau OTO secara instan dengan pilihan uang muka (DP) dan tenor.
* **Pemesanan via WhatsApp Otomatis:** Tombol "Pesan via WhatsApp Sekarang" menghasilkan teks chat terformat rapi sesuai motor, warna, harga OTR, leasing terpilih, DP, dan tenor.
* **Section Pelayanan Kami (Compact):** Informasi layanan resmi *Akurat & Cepat* dan *Event Service Honda*.
* **Ulasan Konsumen (Text-Only):** Testimoni pengalaman belanja pelanggan dengan lencana konsumen terverifikasi dan rating 5 bintang.
* **Kontak & Lokasi Terintegrasi:** Tautan resmi media sosial (TikTok, Instagram, WhatsApp) dan sematan peta Google Maps interaktif PT Jaya Perkasa Abadi.

### 2. Panel Administrator (`/admin`)
* **Autentikasi Firebase:** Login aman berbasis Firebase Authentication dengan proteksi sesi.
* **Ringkasan (Dashboard Metrics):** Pantau jumlah motor aktif, jumlah kategori seri, ulasan konsumen, dan status koneksi Firebase.
* **Kelola Motor & Kredit:** Tambah motor baru, edit varian warna, harga OTR, skema kredit, dan kelola kategori seri.
* **Fitur 1-Click Seed:** Sinkronisasi instan seluruh 46 data produk ke Firestore langsung dari browser.
* **Kelola Hero & Banner Promo:** Ganti judul hero, tagline, foto background, dan banner promo.
* **Kelola Informasi Tentang Kami & Pelayanan:** Perbarui profil dealer dan layanan.
* **Kelola Ulasan Konsumen (Teks):** Tambah, edit, dan hapus ulasan pelanggan.
* **Pengaturan Kontak & Template WhatsApp:** Sesuaikan nomor WhatsApp, link media sosial, serta template pesan order konsumen.
* **Asisten Konfigurasi Firebase:** Modal di header topbar untuk memasukkan Web API Key & App ID dari Firebase Console secara praktis.

---

## 📁 Struktur Direktori

```
HENGKI HONDA JPA/
├── index.html                 # Halaman utama landing page konsumen
├── firestore.rules            # Aturan keamanan database Cloud Firestore
├── storage.rules              # Aturan keamanan penyimpanan Firebase Storage
├── README.md                  # Dokumentasi proyek
├── admin/                     # Dashboard Administrator
│   ├── index.html             # Tampilan utama admin panel
│   ├── login.html             # Halaman login administrator
│   ├── css/admin.css          # Stylesheet admin
│   └── js/                    # Modul logika admin (auth, products, hero, contact, dll)
├── assets/                    # Aset website publik
│   ├── img/                   # Logo, hero background, tentang kami, pelayanan
│   └── products/              # Folder foto produk per model motor
├── css/
│   └── style.css              # Stylesheet utama landing page
├── data/
│   ├── default-settings.json  # Konfigurasi default (Hero, About, Contact, Pelayanan)
│   ├── seed-products.json     # Data lengkap 46 motor Honda & simulasi kredit
│   └── seed-testimonials.json # Data ulasan konsumen (format teks)
├── js/
│   ├── firebase-config.js     # Inisialisasi Firebase Web SDK & services
│   ├── main.js                # Logika utama landing page & realtime listeners
│   └── product-detail.js      # Logika modal detail motor, dual leasing & WA order
└── scripts/
    ├── build_data_and_assets.py # Skrip parser otomatis Price List FIF & OTO
    └── verify_data.py         # Skrip verifikasi integritas data produk
```

---

## 🚀 Konfigurasi Firebase

Proyek ini telah dikonfigurasikan untuk terhubung ke Firebase:
* **Project ID:** `hengkihonda-d1f23`
* **Auth Domain:** `hengkihonda-d1f23.firebaseapp.com`
* **Storage Bucket:** `hengkihonda-d1f23.firebasestorage.app`

Untuk mengaktifkan koneksi penuh:
1. Buka [Firebase Console](https://console.firebase.google.com/project/hengkihonda-d1f23/settings/general).
2. Di bagian **Your apps**, salin `apiKey` dan `appId`.
3. Masukkan ke dalam [js/firebase-config.js](js/firebase-config.js) atau melalui tombol **Sambungkan Firebase** di pojok kanan atas Dashboard Admin.

---

## 📞 Kontak & Media Sosial Resmi

* **WhatsApp Sales:** [081313133505](https://wa.me/6281313133505)
* **Instagram:** [@hengki1978](https://www.instagram.com/hengki1978/)
* **TikTok:** [@hengki.honda.jpa](https://www.tiktok.com/@hengki.honda.jpa)
* **Lokasi Dealer:** [Jaya Perkasa Abadi. PT di Google Maps](https://maps.app.goo.gl/hSzi68kKWfmkN2wh6)
