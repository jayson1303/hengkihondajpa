import os
import sys
import glob
import json
import firebase_admin
from firebase_admin import credentials, firestore

def find_service_account():
    # 1. Check exact name serviceAccountKey.json
    if os.path.exists("serviceAccountKey.json"):
        return "serviceAccountKey.json"
        
    # 2. Check for any json containing hengki or adminsdk
    candidates = glob.glob("*hengki*.json") + glob.glob("*firebase-adminsdk*.json") + glob.glob("*.json")
    for c in candidates:
        if c.startswith("package") or c.startswith("tsconfig") or c.startswith("data"):
            continue
        try:
            with open(c, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("type") == "service_account":
                    return c
        except Exception:
            pass
    return None

def main():
    print("=" * 60)
    print("HENGKI HONDA JPA - FIREBASE FIRESTORE DATA IMPORTER")
    print("=" * 60)

    sa_path = find_service_account()
    if not sa_path:
        print("\n[!] File serviceAccountKey.json belum ditemukan di folder root.")
        print("    Silakan unduh file serviceAccountKey.json dari Firebase Console:")
        print("    1. Buka https://console.firebase.google.com/project/hengkihonda-d1f23/settings/serviceaccounts/adminsdk")
        print("    2. Klik 'Generate new private key' (Buat kunci privat baru)")
        print("    3. Simpan / rename file tersebut menjadi 'serviceAccountKey.json' di folder root project ini.")
        print("    4. Jalankan kembali: python scripts/import_to_firestore.py\n")
        sys.exit(1)

    print(f"[+] Ditemukan service account key: {sa_path}")
    
    try:
        cred = credentials.Certificate(sa_path)
        app = firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("[+] Berhasil terhubung ke Firebase Firestore!")
    except Exception as e:
        print(f"[x] Gagal menginisialisasi Firebase Admin SDK: {e}")
        sys.exit(1)

    # 1. Import Products
    products_file = "data/seed-products.json"
    if os.path.exists(products_file):
        with open(products_file, "r", encoding="utf-8") as f:
            products = json.load(f)
            
        print(f"[+] Memulai import {len(products)} produk motor Honda...")
        batch = db.batch()
        count = 0
        total = 0
        
        for p in products:
            doc_ref = db.collection("products").document(p["id"])
            batch.set(doc_ref, p)
            count += 1
            total += 1
            
            if count >= 400:
                batch.commit()
                batch = db.batch()
                count = 0
                print(f"    - Berhasil commit batch ({total}/{len(products)})")
                
        if count > 0:
            batch.commit()
            print(f"    - Berhasil commit batch final ({total}/{len(products)})")
        print(f"[✔] Selesai import {total} produk!")

    # 2. Import Settings (Hero, About, Contact, waTemplate, Categories)
    settings_file = "data/default-settings.json"
    if os.path.exists(settings_file):
        with open(settings_file, "r", encoding="utf-8") as f:
            settings = json.load(f)
            
        print("[+] Mengimport konfigurasi website (Hero, About, Contact, WhatsApp)...")
        if "hero" in settings:
            db.collection("hero").document("main").set(settings["hero"], merge=True)
            print("    [✔] hero/main terupdate")
            
        if "about" in settings:
            db.collection("about").document("main").set(settings["about"], merge=True)
            print("    [✔] about/main terupdate")
            
        if "contact" in settings:
            db.collection("settings").document("contact").set(settings["contact"], merge=True)
            print("    [✔] settings/contact terupdate")
            
        if "waTemplate" in settings:
            db.collection("settings").document("waTemplate").set(settings["waTemplate"], merge=True)
            print("    [✔] settings/waTemplate terupdate")

    # Categories
    categories = [
        "ADV Series", "Beat Series", "PCX Series", "Vario Series", 
        "Scoopy Series", "Stylo Series", "Genio Series", "Supra Series", 
        "Revo Series", "CBR Series", "CB150 Series", "CRF/Off-Road Series", 
        "CB Verza Series", "Forza Series"
    ]
    db.collection("settings").document("categories").set({"list": categories}, merge=True)
    print("    [✔] settings/categories terupdate")

    # 3. Import Testimonials
    testi_file = "data/seed-testimonials.json"
    if os.path.exists(testi_file):
        with open(testi_file, "r", encoding="utf-8") as f:
            testimonials = json.load(f)
            
        print(f"[+] Mengimport {len(testimonials)} testimoni konsumen...")
        for t in testimonials:
            db.collection("testimonials").document(t["id"]).set(t)
        print(f"[✔] Selesai import {len(testimonials)} testimoni!")

    print("\n[🎉] SEMUA DATA BERHASIL DIIMPORT KE DATABASE FIRESTORE HENGKI HONDA JPA!")

if __name__ == "__main__":
    main()
