// ==========================================================================
// HENGKI HONDA JPA
// firebase-config.js - Firebase Initialization & Exported Services
// ==========================================================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocFromServer,
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Load any runtime saved config from localStorage (saved via Admin Panel setup)
let savedConfig = {};
try {
  const stored = localStorage.getItem("hengki_firebase_config");
  if (stored) {
    savedConfig = JSON.parse(stored);
  }
} catch (e) {
  console.warn("Tidak dapat membaca config Firebase dari localStorage:", e);
}

// Firebase Configuration for HENGKI HONDA JPA (hengkihonda-d1f23)
const defaultFirebaseConfig = {
  apiKey: "...", // Masukkan Web API Key dari Firebase Console jika sudah ada
  authDomain: "hengkihonda-d1f23.firebaseapp.com",
  projectId: "hengkihonda-d1f23",
  storageBucket: "hengkihonda-d1f23.firebasestorage.app",
  messagingSenderId: "1005709036852",
  appId: "..." // Masukkan Web App ID dari Firebase Console jika sudah ada
};

const firebaseConfig = {
  ...defaultFirebaseConfig,
  ...savedConfig
};

// Check if credentials are properly set (not dummy '...')
const isConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "..." && 
  !firebaseConfig.apiKey.includes("...") &&
  firebaseConfig.appId && 
  firebaseConfig.appId !== "..."
);

let app = null;
let db = null;
let storage = null;
let auth = null;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.info("[Firebase] Berhasil terhubung ke Firebase project:", firebaseConfig.projectId);
  } catch (err) {
    console.warn("[Firebase] Inisialisasi Firebase gagal, beralih ke mode offline/local:", err);
  }
} else {
  console.info("[Firebase] Mode Standby / Data Lokal. Menunggu Web API Key & App ID untuk projectId: " + firebaseConfig.projectId);
}

// Helper to save Firebase config from Admin UI
export function saveFirebaseConfig(newCfg) {
  try {
    const merged = { ...firebaseConfig, ...newCfg };
    localStorage.setItem("hengki_firebase_config", JSON.stringify(merged));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan config Firebase:", e);
    return false;
  }
}

export function resetFirebaseConfig() {
  try {
    localStorage.removeItem("hengki_firebase_config");
    return true;
  } catch (e) {
    return false;
  }
}

// Google Analytics 4 (GA4) Measurement ID (Opsional)
// Isi dengan Measurement ID Anda (contoh: "G-XXXXXXXXXX") untuk mengaktifkan GA4
export const googleAnalyticsConfig = {
  measurementId: "" // Masukkan Measurement ID GA4 di sini jika sudah memiliki akun GA4
};

export { 
  app, 
  db, 
  storage, 
  auth, 
  isConfigured as isFirebaseConfigured,
  firebaseConfig,
  collection, 
  doc, 
  getDoc,
  getDocFromServer,
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  increment, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
};
