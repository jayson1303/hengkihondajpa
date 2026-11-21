import os
import shutil
import json
import re
from PIL import Image
import openpyxl

# 1. Ensure Target Directories exist
os.makedirs('assets/img/logo', exist_ok=True)
os.makedirs('assets/img/hero', exist_ok=True)
os.makedirs('assets/img/about', exist_ok=True)
os.makedirs('assets/img/testimonials', exist_ok=True)
os.makedirs('assets/img/pelayanan', exist_ok=True)
os.makedirs('assets/products', exist_ok=True)
os.makedirs('promo', exist_ok=True)
os.makedirs('data', exist_ok=True)

print("Directories verified.")

# 2. Process Logo
logo_src = 'logo/WhatsApp Image 2026-11-20 at 09.37.33.jpeg'
if os.path.exists(logo_src) and not os.path.exists('assets/img/logo/logo.jpg'):
    try:
        im_logo = Image.open(logo_src)
        im_logo.convert('RGB').save('assets/img/logo/logo.jpg', quality=95)
        im_logo.convert('RGBA').save('assets/img/logo/logo.png')
        
        # Generate transparent version: make near-white background transparent
        rgba = im_logo.convert('RGBA')
        datas = rgba.getdata()
        new_data = []
        for item in datas:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        rgba.putdata(new_data)
        rgba.save('assets/img/logo/logo-transparent.png', 'PNG')
        print("Processed and saved main logo to assets/img/logo/")
    except Exception as e:
        print(f"Skipped logo processing: {e}")

# 3. Process Leasing Logos (FIF & OTO)
fif_logo_src = 'Price List/PL FIF + Logo/Logo.jpeg'
if os.path.exists(fif_logo_src) and not os.path.exists('assets/img/logo/fif-logo.png'):
    im_fif = Image.open(fif_logo_src)
    im_fif.convert('RGB').save('assets/img/logo/fif-logo.jpg', quality=95)
    rgba_fif = im_fif.convert('RGBA')
    pix = rgba_fif.load()
    w, h = rgba_fif.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if r > 240 and g > 240 and b > 240:
                pix[x, y] = (255, 255, 255, 0)
    rgba_fif.save('assets/img/logo/fif-logo.png', 'PNG')
    print("Processed FIF logo.")

oto_logo_src = 'Price List/PL OTO + Logo/Logo.jpeg'
if os.path.exists(oto_logo_src) and not os.path.exists('assets/img/logo/oto-logo.png'):
    im_oto = Image.open(oto_logo_src)
    im_oto.convert('RGB').save('assets/img/logo/oto-logo.jpg', quality=95)
    rgba_oto = im_oto.convert('RGBA')
    pix = rgba_oto.load()
    w, h = rgba_oto.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if r > 240 and g > 240 and b > 240:
                pix[x, y] = (255, 255, 255, 0)
    rgba_oto.save('assets/img/logo/oto-logo.png', 'PNG')
    print("Processed OTO logo.")

# 4. Hero Background
hero_bg_src = 'Background Index/Gemini_Generated_Image_a61tc1a61tc1a61t.jpg'
if not os.path.exists(hero_bg_src):
    bg_files = [os.path.join('Background Index', f) for f in os.listdir('Background Index') if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if bg_files:
        hero_bg_src = bg_files[0]

if os.path.exists(hero_bg_src):
    shutil.copy2(hero_bg_src, 'assets/img/hero/hero-bg.jpg')
    print(f"Copied hero background ({hero_bg_src}) to assets/img/hero/hero-bg.jpg")

# 5. Promo Banners (5 Slots, WebP & JPEG)
promo_1 = 'Program atau Promo/WhatsApp Image 2026-11-20 at 09.37.34 (1).jpeg'
promo_2 = 'Program atau Promo/WhatsApp Image 2026-11-20 at 09.37.34 (2).jpeg'
promo_3 = 'promo/promo-3.jpeg' if os.path.exists('promo/promo-3.jpeg') else promo_2

promo_sources = [promo_1, promo_2, promo_3, promo_1, promo_2]
for i in range(1, 6):
    src = promo_sources[i-1]
    if os.path.exists(src):
        try:
            im_promo = Image.open(src).convert('RGB')
            im_promo.save(f'promo/promo-{i}.jpg', 'JPEG', quality=92)
            im_promo.save(f'promo/promo-{i}.webp', 'WEBP', quality=88)
        except Exception as e:
            print(f"Error converting promo-{i}: {e}")

if os.path.exists('promo/promo-1.jpg'):
    shutil.copy2('promo/promo-1.jpg', 'assets/img/hero/promo-banner.jpg')
print("Processed and saved 5 promo slots in JPEG & WebP.")

# 6. About Us Image
about_src = 'tentang kami/Gemini_Generated_Image_7h0r6l7h0r6l7h0r.jpg'
if os.path.exists(about_src):
    shutil.copy2(about_src, 'assets/img/about/about.jpg')
    print("Copied about image to assets/img/about/about.jpg")

# 7. Pelayanan Images
pelayanan_1 = 'Pelayanan/akurat & Cepat/WhatsApp Image 2026-11-20 at 09.37.29.jpeg'
pelayanan_2 = 'Pelayanan/Event Service/WhatsApp Image 2026-11-20 at 09.37.31.jpeg'

if os.path.exists(pelayanan_1):
    shutil.copy2(pelayanan_1, 'assets/img/pelayanan/akurat-cepat.jpg')
    print("Copied pelayanan 1 to assets/img/pelayanan/akurat-cepat.jpg")
if os.path.exists(pelayanan_2):
    shutil.copy2(pelayanan_2, 'assets/img/pelayanan/event-service.jpg')
    print("Copied pelayanan 2 to assets/img/pelayanan/event-service.jpg")

# 8. Copy Product Photos
foto_dirs = [f for f in os.listdir('Foto Produk') if os.path.isdir(os.path.join('Foto Produk', f))]
for fd in foto_dirs:
    src_dir = os.path.join('Foto Produk', fd)
    dst_dir = os.path.join('assets/products', fd)
    os.makedirs(dst_dir, exist_ok=True)
    for fn in os.listdir(src_dir):
        s_file = os.path.join(src_dir, fn)
        d_file = os.path.join(dst_dir, fn)
        if os.path.isfile(s_file):
            shutil.copy2(s_file, d_file)
print(f"Copied all product photos across {len(foto_dirs)} folders to assets/products/")

# 9. Parse FIF Pricelist (Dynamic column detection for CUB, MATIC, SPORT, WING)
wb_fif = openpyxl.load_workbook('Price List/PL FIF + Logo/PL Fif Updated.xlsx', data_only=True)
fif_data = {}

for sname in wb_fif.sheetnames:
    ws = wb_fif[sname]
    
    # Left side tenors
    tenors_left = {}
    for c in range(4, 15):
        v = ws.cell(7, c).value
        if v and str(v).isdigit():
            tenors_left[c] = int(v)
            
    # Right side detection
    dp_col_right = None
    tenors_right = {}
    model_col_right = None
    
    for c in range(10, 20):
        v = ws.cell(6, c).value
        if v and 'UANG' in str(v).upper():
            dp_col_right = c
            model_col_right = c - 2
            for tc in range(c + 1, ws.max_column + 1):
                tv = ws.cell(7, tc).value
                if tv and str(tv).isdigit():
                    tenors_right[tc] = int(tv)
            break
            
    current_left = None
    current_right = None
    
    for r in range(10, ws.max_row+1):
        # Left side
        c1 = ws.cell(r, 1).value
        if isinstance(c1, int):
            m_name = ws.cell(r+2, 1).value
            otr = ws.cell(r+4, 1).value
            if m_name and not str(m_name).strip().isdigit():
                current_left = str(m_name).strip()
                fif_data[current_left] = {'otr': otr, 'sims': []}
            else:
                current_left = None
                
        dp_left = ws.cell(r, 3).value
        if current_left and dp_left and isinstance(dp_left, (int, float)):
            dp = int(dp_left * 1000)
            for c, tenor in tenors_left.items():
                cicilan = ws.cell(r, c).value
                if cicilan and isinstance(cicilan, (int, float)):
                    fif_data[current_left]['sims'].append({'dp': dp, 'tenor': tenor, 'cicilan': int(cicilan * 1000)})
                    
        # Right side
        if model_col_right:
            cm = ws.cell(r, model_col_right).value
            if isinstance(cm, int):
                m_name = ws.cell(r+2, model_col_right).value
                otr = ws.cell(r+4, model_col_right).value
                if m_name and not str(m_name).strip().isdigit():
                    current_right = str(m_name).strip()
                    fif_data[current_right] = {'otr': otr, 'sims': []}
                else:
                    current_right = None
                    
            dp_right = ws.cell(r, dp_col_right).value
            if current_right and dp_right and isinstance(dp_right, (int, float)):
                dp = int(dp_right * 1000)
                for c, tenor in tenors_right.items():
                    cicilan = ws.cell(r, c).value
                    if cicilan and isinstance(cicilan, (int, float)):
                        fif_data[current_right]['sims'].append({'dp': dp, 'tenor': tenor, 'cicilan': int(cicilan * 1000)})

print(f"Parsed {len(fif_data)} distinct models from FIF across all sheets!")

# 10. Parse OTO Pricelist
wb_oto = openpyxl.load_workbook('Price List/PL OTO + Logo/PL Oto Updated.xlsx', data_only=True)
ws_oto = wb_oto['TAC REGULER']
oto_data = {}

tenors_oto = {}
for c in range(5, 10):
    v = ws_oto.cell(3, c).value
    if v and str(v).isdigit():
        tenors_oto[c] = int(v)

for r in range(4, ws_oto.max_row+1):
    m_name = ws_oto.cell(r, 2).value
    if not m_name:
        continue
    m_name = str(m_name).strip()
    otr = ws_oto.cell(r, 3).value
    dp = ws_oto.cell(r, 4).value
    if m_name not in oto_data:
        oto_data[m_name] = {'otr': otr, 'sims': []}
        
    if dp and isinstance(dp, (int, float)):
        dp_val = int(dp)
        for c, tenor in tenors_oto.items():
            cicilan = ws_oto.cell(r, c).value
            if cicilan and isinstance(cicilan, (int, float)):
                oto_data[m_name]['sims'].append({'dp': dp_val, 'tenor': tenor, 'cicilan': int(cicilan)})

print(f"Parsed {len(oto_data)} distinct models from OTO!")

# 11. Accurate Mapping from Product Folders to exact PL models
# Format: folder -> (fif_key, oto_key, exact_pl_display_name, category)
# Nama model persis sama dengan Price List (huruf besar/kecil, singkatan CBS/ISS/Street/Sporty sesuai PL)
folder_mapping = {
    # Beat Series (4 varian resmi di PL)
    # Foto All New (generasi terbaru)
    'ALL NEW BEAT CBS': ('BEAT SPORTY CBS', 'BEAT SPORTY CBS', 'BEAT SPORTY CBS', 'Beat Series'),
    'ALL NEW BEAT ISS': ('BEAT SPORTY CBS ISS ACC', 'BEAT SPORTY CBS ISS ACC', 'BEAT SPORTY CBS ISS ACC', 'Beat Series'),
    'ALL NEW BEAT SMARTKEY': ('BEAT SPORTY DELUXE SMART KEY ACC', 'BEAT SPORTY DELUXE SMART KEY ACC', 'BEAT SPORTY DELUXE SMART KEY ACC', 'Beat Series'),
    'ALL NEW BEAT STREET': ('BEAT STREET ACC', 'BEAT STREET ACC', 'BEAT STREET ACC', 'Beat Series'),
    # Foto All Beat (cutout / varian reguler pendamping)
    'ALL BEAT CBS': ('BEAT SPORTY CBS', 'BEAT SPORTY CBS', 'BEAT SPORTY CBS (Sporty)', 'Beat Series'),
    'ALL BEAT ISS': ('BEAT SPORTY CBS ISS ACC', 'BEAT SPORTY CBS ISS ACC', 'BEAT SPORTY CBS ISS ACC (Deluxe)', 'Beat Series'),
    'ALL BEAT STREET': ('BEAT STREET ACC', 'BEAT STREET ACC', 'BEAT STREET ACC (Street)', 'Beat Series'),

    # Genio Series
    'ALL NEW GENIO CBS': ('GENIO CBS', 'Genio CBS (BK)', 'GENIO CBS', 'Genio Series'),
    'ALL NEW GENIO CBS SP': ('Genio CBS (PH,PD)', 'Genio CBS (PH,PD)', 'Genio CBS (PH,PD)', 'Genio Series'),
    'ALL NEW GENIO CBS ISS': ('Genio CBS ISS', 'Genio CBS ISS', 'Genio CBS ISS', 'Genio Series'),

    # Scoopy Series
    'ALL NEW SCOOPY FASHION': ('Scoopy Fashion ACC', 'Scoopy Fashion ACC', 'Scoopy Fashion ACC', 'Scoopy Series'),
    'ALL NEW SCOOPY PRESTIGE': ('Scoopy Prestige ACC / Scoopy Stylish ACC', 'Scoopy Prestige ACC / Scoopy Stylish ACC', 'Scoopy Prestige ACC', 'Scoopy Series'),
    'ALL NEW SCOOPY STYLISH': ('Scoopy Prestige ACC / Scoopy Stylish ACC', 'Scoopy Prestige ACC / Scoopy Stylish ACC', 'Scoopy Stylish ACC', 'Scoopy Series'),

    # Vario Series
    'ALL NEW VARIO 125 CBS': ('VARIO 125 CBS ACC', 'VARIO 125 CBS ACC', 'VARIO 125 CBS ACC', 'Vario Series'),
    'ALL NEW VARIO 125 CBS ISS': ('VARIO 125 CBS ISS ACC', 'VARIO 125 CBS ISS ACC', 'VARIO 125 CBS ISS ACC', 'Vario Series'),
    'ALL NEW VARIO 125 STREET': ('VARIO 125 STREET ACC', 'VARIO 125 STREET ACC', 'VARIO 125 STREET ACC', 'Vario Series'),
    'ALL NEW VARIO 160 CBS': ('Vario Evo 160 CBS', 'Vario Evo 160 CBS', 'Vario Evo 160 CBS', 'Vario Series'),
    'ALL NEW VARIO 160 CBS NITRO': ('Vario Evo 160 CBS NITRO', 'Vario Evo 160 CBS NITRO', 'Vario Evo 160 CBS NITRO', 'Vario Series'),
    'ALL NEW VARIO 160 ABS': ('Vario Evo 160 ABS ACC', 'Vario Evo 160 ABS ACC', 'Vario Evo 160 ABS ACC', 'Vario Series'),

    # Stylo Series
    'ALL NEW STYLO CBS': ('Stylo 160 CBS ACC', 'Stylo 160 CBS ACC', 'Stylo 160 CBS ACC', 'Stylo Series'),
    'ALL NEW STYLO ABS': ('Stylo 160 ABS ACC', 'Stylo 160 ABS ACC', 'Stylo 160 ABS ACC', 'Stylo Series'),
    'ALL NEW STYLO ABS SE': ('Stylo 160 ABS SE ACC', 'Stylo 160 ABS SE ACC', 'Stylo 160 ABS SE ACC', 'Stylo Series'),

    # PCX Series
    'ALL NEW PCX CBS 160': ('PCX 160 CBS', 'PCX 160 CBS', 'PCX 160 CBS', 'PCX Series'),
    'ALL NEW PCX ABS 160': ('PCX 160 ABS ACC', 'PCX 160 ABS ACC', 'PCX 160 ABS ACC', 'PCX Series'),
    'ALL NEW PCX ABS 160 ROADSYNCE': ('PCX 160 ABS RoadSync ACC', 'PCX 160 ABS RoadSync ACC', 'PCX 160 ABS RoadSync ACC', 'PCX Series'),

    # ADV Series
    'ALL NEW ADV CBS 160': ('ADV160 CBS /', 'ADV160 CBS /', 'ADV160 CBS', 'ADV Series'),
    'ALL NEW ADV ABS 160': ('ADV 160 ABS ACC /', 'ADV 160 ABS ACC /', 'ADV 160 ABS ACC', 'ADV Series'),
    'ALL NEW ADV ABS 160 ROADSYNCE': ('ADV 160 ABS RoadSync ACC', 'ADV 160 ABS RoadSync ACC', 'ADV 160 ABS RoadSync ACC', 'ADV Series'),

    # Revo & Supra Series
    'ALL NEW REVO FIT': ('REVO FIT', 'REVO FIT', 'REVO FIT', 'Revo Series'),
    'ALL NEW REVO X': ('REVO X', 'REVO X', 'REVO X', 'Revo Series'),
    'ALL NEW SUPRA X 125 SW': ('Supra X 125 SW', 'Supra X 125 SW', 'Supra X 125 SW', 'Supra Series'),
    'ALL NEW SUPRA X CW': ('Supra X 125 CW', 'Supra X 125 CW', 'Supra X 125 CW', 'Supra Series'),
    'ALL NEW SUPRA GTR SPORTY': ('SUPRA GTR 150 SPORTY', 'SUPRA GTR 150 SPORTY', 'SUPRA GTR 150 SPORTY', 'Supra Series'),
    'ALL NEW SUPTA GTR EXLUSIVE': ('SUPRA GTR 150 EXCLUSIVE', 'SUPRA GTR 150 EXCLUSIVE', 'SUPRA GTR 150 EXCLUSIVE', 'Supra Series'),

    # Sport Series
    'ALL NEW CB VERZA SP': ('CB150 Verza SW', None, 'CB150 Verza SW', 'CB Verza Series'),
    'ALL NEW CB VERZA CW': ('CB150 Verza CW', None, 'CB150 Verza CW', 'CB Verza Series'),
    'ALL NEW CB150R STD': ('CB150R STD', None, 'CB150R STD', 'CB150 Series'),
    'ALL NEW CB150R SE': ('CB150R SE', None, 'CB150R SE', 'CB150 Series'),
    'ALL NEW CB150X STD': ('CB150X STD', None, 'CB150X STD', 'CB150 Series'),
    'ALL NEW CB150X SP': ('CB150X SE', None, 'CB150X SE', 'CB150 Series'),
    'ALL NEW CRF 150 L': ('NEW CRF150L (RD) ACC / NEW CRF150L (PH) ACC / NEW CRF150L (BK & GH) ACC', None, 'NEW CRF150L (RD) ACC / NEW CRF150L (PH) ACC / NEW CRF150L (BK & GH) ACC', 'CRF/Off-Road Series'),
    'ALL NEW CBR 150 STD BK': ('CBR150R STD BK /', None, 'CBR150R STD BK', 'CBR Series'),
    'ALL NEW CBR 150 STD MH-RD': ('CBR150R STD MH / CBR150R STD RD', None, 'CBR150R STD MH / CBR150R STD RD', 'CBR Series'),
    'ALL NEW CBR 150 ABS BK': ('CBR150R ABS BK /', None, 'CBR150R ABS BK', 'CBR Series'),
    'ALL NEW CBR 150 ABS RD': ('CBR150R ABS RD', None, 'CBR150R ABS RD', 'CBR Series'),

    # Wing Series
    'ALL NEW FORZA 250': ('FORZA', None, 'FORZA', 'Forza Series')
}

asuransi_cash_map = {
    'Beat Series': 700000,
    'Genio Series': 700000,
    'Scoopy Series': 850000,
    'Vario Series': 900000,
    'Stylo Series': 1000000,
    'PCX Series': 1150000,
    'ADV Series': 1250000,
    'Revo Series': 650000,
    'Supra Series': 750000,
    'CB Verza Series': 850000,
    'CB150 Series': 1100000,
    'CRF/Off-Road Series': 1250000,
    'CBR Series': 1300000,
    'Forza Series': 2500000
}

# Accurate Color variants mapping matching the real filenames on disk
color_map = {
    'ALL BEAT CBS': {
        'WhatsApp Image 2026-07-02 at 10.43.05.png': 'Hard Rock Black (Hitam Glossy)',
        'WhatsApp Image 2026-07-02 at 10.43.06 (1).png': 'Funk Red Black (Merah Hitam)',
        'WhatsApp Image 2026-07-02 at 10.43.06.png': 'Dance White Black (Putih Hitam)'
    },
    'ALL BEAT ISS': {
        'WhatsApp Image 2026-07-02 at 10.45.14 (1).png': 'Deluxe Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 10.45.14.png': 'Deluxe Matte Green (Hijau Doff)'
    },
    'ALL BEAT STREET': {
        'WhatsApp Image 2026-07-02 at 10.48.15.png': 'Street Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 10.48.16 (1).png': 'Street Brown (Cokelat Doff)',
        'WhatsApp Image 2026-07-02 at 10.48.16.png': 'Street Silver (Silver Doff)'
    },
    'ALL NEW BEAT CBS': {
        'WhatsApp Image 2026-07-02 at 10.43.31.png': 'Hard Rock Black (Hitam Glossy)',
        'WhatsApp Image 2026-07-02 at 10.43.31 (1).png': 'Funk Red Black (Merah Hitam)',
        'WhatsApp Image 2026-07-02 at 10.43.31 (2).png': 'Jazz Silver Black (Silver Biru)'
    },
    'ALL NEW BEAT ISS': {
        'WhatsApp Image 2026-07-02 at 10.45.38.png': 'Deluxe Matte Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 10.45.38 (1).png': 'Deluxe Matte Blue (Biru Doff)'
    },
    'ALL NEW BEAT SMARTKEY': {
        'WhatsApp Image 2026-07-02 at 10.46.32 (1).png': 'Deluxe Matte Blue (Biru Doff)',
        'WhatsApp Image 2026-07-02 at 10.46.32.png': 'Deluxe Matte Green (Hijau Doff)',
        'WhatsApp Image 2026-07-02 at 10.46.33.png': 'Deluxe Matte Black (Hitam Doff)'
    },
    'ALL NEW BEAT STREET': {
        'WhatsApp Image 2026-07-02 at 10.48.43 (1).png': 'Street Brown (Cokelat Doff)',
        'WhatsApp Image 2026-07-02 at 10.48.43 (2).png': 'Street Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 10.48.43.png': 'Street Matte Grey (Abu-abu Doff)'
    },
    'ALL NEW GENIO CBS': {
        'WhatsApp Image 2026-07-02 at 10.52.19.png': 'Radiant Black Glossy (Hitam)'
    },
    'ALL NEW GENIO CBS SP': {
        'WhatsApp Image 2026-07-02 at 10.51.13 (1).png': 'Radiant White (Putih Mutiara)',
        'WhatsApp Image 2026-07-02 at 10.51.13.png': 'Radiant Red (Merah Glossy)'
    },
    'ALL NEW GENIO CBS ISS': {
        'WhatsApp Image 2026-07-02 at 10.49.57 (1).png': 'Fabulous Matte Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 10.49.57.png': 'Fabulous Matte Blue (Biru Doff)',
        'WhatsApp Image 2026-07-02 at 10.49.58.png': 'Fabulous Matte Green (Hijau Doff)'
    },
    'ALL NEW SCOOPY FASHION': {
        'WhatsApp Image 2026-07-02 at 10.53.35 (1).png': 'Fashion Black (Hitam)',
        'WhatsApp Image 2026-07-02 at 10.53.35 (2).png': 'Fashion Brown (Cokelat)',
        'WhatsApp Image 2026-07-02 at 10.53.35.png': 'Fashion Blue (Biru)',
        'WhatsApp Image 2026-07-02 at 10.53.36.png': 'Fashion Red (Merah)'
    },
    'ALL NEW SCOOPY PRESTIGE': {
        'WhatsApp Image 2026-07-02 at 10.56.44 (1).png': 'Prestige Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 10.56.44 (2).png': 'Prestige Green (Hijau Doff)',
        'WhatsApp Image 2026-07-02 at 10.56.44.png': 'Prestige White (Putih Mutiara)'
    },
    'ALL NEW SCOOPY STYLISH': {
        'WhatsApp Image 2026-07-02 at 10.55.20 (2).png': 'Stylish Green (Hijau Doff)',
        'WhatsApp Image 2026-07-02 at 10.55.20(1).png': 'Stylish Red (Merah Doff)',
        'WhatsApp Image 2026-07-02 at 10.55.20.png': 'Stylish Brown (Cokelat Doff)'
    },
    'ALL NEW VARIO 125 CBS': {
        'WhatsApp Image 2026-07-02 at 10.57.51 (1).png': 'Sporty Black (Hitam Merah)',
        'WhatsApp Image 2026-07-02 at 10.57.51.png': 'Sporty Blue (Biru Glossy)',
        'WhatsApp Image 2026-07-02 at 10.57.52.png': 'Sporty Red (Merah Glossy)'
    },
    'ALL NEW VARIO 125 CBS ISS': {
        'WhatsApp Image 2026-07-02 at 10.59.00 (1).png': 'Advance Matte Blue (Biru Doff)',
        'WhatsApp Image 2026-07-02 at 10.59.00.png': 'Advance Matte Red (Merah Doff)',
        'WhatsApp Image 2026-07-02 at 10.59.01.png': 'Advance Matte Black (Hitam Doff)'
    },
    'ALL NEW VARIO 125 STREET': {
        'IMG_202607185_094805202.png': 'Street Matte Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 11.00.07.png': 'Street Matte Blue (Biru Doff)',
        'WhatsApp Image 2026-07-02 at 11.00.08.png': 'Street Matte Red (Merah Doff)'
    },
    'ALL NEW VARIO 160 CBS': {
        'WhatsApp Image 2026-07-02 at 11.04.57 (1).png': 'Grande Matte Blue (Biru Doff)',
        'WhatsApp Image 2026-07-02 at 11.04.57.png': 'Grande Matte Red (Merah Doff)'
    },
    'ALL NEW VARIO 160 CBS NITRO': {
        'WhatsApp Image 2026-07-02 at 11.06.51 (1).png': 'Active Matte Red (Nitro Red)',
        'WhatsApp Image 2026-07-02 at 11.06.51.png': 'Active Matte Black (Nitro Black)'
    },
    'ALL NEW VARIO 160 ABS': {
        'WhatsApp Image 2026-07-02 at 11.08.06 (1).png': 'Grande Matte White (Putih Doff)',
        'WhatsApp Image 2026-07-02 at 11.08.06 (2).png': 'Grande Matte Red (Merah Doff)',
        'WhatsApp Image 2026-07-02 at 11.08.06.png': 'Grande Matte Blue (Biru Doff)',
        'WhatsApp Image 2026-07-02 at 11.08.07.png': 'Grande Matte Black (Hitam Doff)'
    },
    'ALL NEW STYLO CBS': {
        'WhatsApp Image 2026-07-02 at 11.09.38 (1).png': 'Glam Red (Merah Glossy)',
        'WhatsApp Image 2026-07-02 at 11.09.38 (2).png': 'Glam Black (Hitam Glossy)',
        'WhatsApp Image 2026-07-02 at 11.09.38.png': 'Glam Beige (Krem Elegan)'
    },
    'ALL NEW STYLO ABS': {
        'WhatsApp Image 2026-07-02 at 11.10.51 (1).png': 'Royal Green (Hijau Doff)',
        'WhatsApp Image 2026-07-02 at 11.10.51.png': 'Royal Matte Black (Hitam Doff)',
        'WhatsApp Image 2026-07-02 at 11.10.52.png': 'Royal Matte White (Putih Doff)'
    },
    'ALL NEW STYLO ABS SE': {
        'WhatsApp Image 2026-07-02 at 11.11.37.png': 'Royal White Special Edition (Putih SE)'
    },
    'ALL NEW PCX CBS 160': {
        'WhatsApp Image 2026-07-03 at 19.45.53 (1).png': 'Marvelous Matte Silver',
        'WhatsApp Image 2026-07-03 at 19.45.53.png': 'Magnificent Red',
        'WhatsApp Image 2026-07-03 at 19.45.54 (1).png': 'Brilliant Black',
        'WhatsApp Image 2026-07-03 at 19.45.54.png': 'Wonderful White'
    },
    'ALL NEW PCX ABS 160': {
        'WhatsApp Image 2026-07-03 at 19.45.54 (2).png': 'Imperial Matte Blue',
        'WhatsApp Image 2026-07-03 at 19.45.55 (1).png': 'Majestic Matte Red',
        'WhatsApp Image 2026-07-03 at 19.45.55 (2).png': 'Brilliant Black (ABS)',
        'WhatsApp Image 2026-07-03 at 19.45.55.png': 'Wonderful White (ABS)'
    },
    'ALL NEW PCX ABS 160 ROADSYNCE': {
        'WhatsApp Image 2026-07-03 at 19.45.56 (1).png': 'RoadSync Ultimate Matte Red',
        'WhatsApp Image 2026-07-03 at 19.45.56.png': 'RoadSync Matte Brown'
    },
    'ALL NEW ADV CBS 160': {
        'WhatsApp Image 2026-07-03 at 19.45.56 (2).png': 'Dynamic Red',
        'WhatsApp Image 2026-07-03 at 19.45.56 (3).png': 'Dynamic Black',
        'WhatsApp Image 2026-07-03 at 19.45.57.png': 'Dynamic White'
    },
    'ALL NEW ADV ABS 160': {
        'WhatsApp Image 2026-07-03 at 19.45.57 (1).png': 'Tough Matte Brown',
        'WhatsApp Image 2026-07-03 at 19.45.57 (2).png': 'Tough Matte Black',
        'WhatsApp Image 2026-07-03 at 19.45.57 (3).png': 'Tough Matte Silver'
    },
    'ALL NEW ADV ABS 160 ROADSYNCE': {
        'WhatsApp Image 2026-07-03 at 19.45.58.png': 'RoadSync Tough Silver Red'
    },
    'ALL NEW REVO FIT': {
        'WhatsApp Image 2026-07-03 at 19.45.59 (2).png': 'Galaxy Blue',
        'WhatsApp Image 2026-07-03 at 19.46.00.png': 'Raving Red'
    },
    'ALL NEW REVO X': {
        'WhatsApp Image 2026-07-03 at 19.46.00 (1).png': 'Quantum Black',
        'WhatsApp Image 2026-07-03 at 19.46.00 (2).png': 'Attractive Red'
    },
    'ALL NEW SUPRA X 125 SW': {
        'WhatsApp Image 2026-07-03 at 19.46.01.png': 'Energetic Red (SW)'
    },
    'ALL NEW SUPRA X CW': {
        'WhatsApp Image 2026-07-03 at 19.46.01 (1).png': 'Golden Matte Black (CW)',
        'WhatsApp Image 2026-07-03 at 19.46.01 (2).png': 'Quantum Matte Black (CW)'
    },
    'ALL NEW SUPRA GTR SPORTY': {
        'WhatsApp Image 2026-07-03 at 19.46.01 (3).png': 'Sporty Spartan Red',
        'WhatsApp Image 2026-07-03 at 19.46.02 (2).png': 'Sporty Gun Black'
    },
    'ALL NEW SUPTA GTR EXLUSIVE': {
        'WhatsApp Image 2026-07-03 at 19.46.02 (1).png': 'Exclusive Matte Red',
        'WhatsApp Image 2026-07-03 at 19.46.02.png': 'Exclusive Matte Silver'
    },
    'ALL NEW CB VERZA SP': {
        'WhatsApp Image 2026-07-03 at 19.46.04.png': 'Macho Matte Black (Spoke)'
    },
    'ALL NEW CB VERZA CW': {
        'WhatsApp Image 2026-07-03 at 19.46.03 (1).png': 'Macho Matte Black (Cast Wheel)',
        'WhatsApp Image 2026-07-03 at 19.46.03.png': 'Bold Red (Cast Wheel)'
    },
    'ALL NEW CB150R STD': {
        'WhatsApp Image 2026-07-03 at 19.46.05.png': 'Macho Black',
        'WhatsApp Image 2026-07-03 at 19.46.06.png': 'Stinger Red Black'
    },
    'ALL NEW CB150R SE': {
        'WhatsApp Image 2026-07-03 at 19.46.04 (1).png': 'Fury Matte Red SE',
        'WhatsApp Image 2026-07-03 at 19.46.05 (1).png': 'Raptor Matte Black SE',
        'WhatsApp Image 2026-07-03 at 19.46.05 (2).png': 'Armored Matte Grey SE'
    },
    'ALL NEW CB150X STD': {
        'WhatsApp Image 2026-07-03 at 19.46.07 (1).png': 'Mandala Red',
        'WhatsApp Image 2026-07-03 at 19.46.07.png': 'Amazon Green',
        'WhatsApp Image 2026-07-03 at 19.46.08.png': 'Glacier White'
    },
    'ALL NEW CB150X SP': {
        'WhatsApp Image 2026-07-03 at 19.46.07 (2).png': 'Volcano Matte Black SE'
    },
    'ALL NEW CRF 150 L': {
        'WhatsApp Image 2026-07-03 at 19.46.08 (1).png': 'Extreme Red (RD)',
        'WhatsApp Image 2026-07-03 at 19.46.09.png': 'Extreme White / Pearl (PH)',
        'WhatsApp Image 2026-07-03 at 19.46.12.png': 'Extreme Black (BK)',
        'WhatsApp Image 2026-07-03 at 19.46.15.png': 'Extreme Grey (GH)'
    },
    'ALL NEW CBR 150 STD BK': {
        'WhatsApp Image 2026-07-03 at 19.46.18.png': 'Dominator Matte Black (BK)'
    },
    'ALL NEW CBR 150 STD MH-RD': {
        'WhatsApp Image 2026-07-03 at 19.46.31.png': 'Honda Tricolor (MH)',
        'WhatsApp Image 2026-07-03 at 19.57.25.png': 'Honda Racing Red (RD)'
    },
    'ALL NEW CBR 150 ABS BK': {
        'WhatsApp Image 2026-07-03 at 19.57.25 (1).png': 'Victory Black Red ABS (BK)'
    },
    'ALL NEW CBR 150 ABS RD': {
        'WhatsApp Image 2026-07-03 at 19.57.25 (2).png': 'Honda Tricolor / Racing Red ABS (RD)'
    },
    'ALL NEW FORZA 250': {
        'WhatsApp Image 2026-07-03 at 19.45.58 (1).png': 'Matte Gunpowder Black Metallic',
        'WhatsApp Image 2026-07-03 at 19.45.58 (2).png': 'Candy Syrah Wine Red',
        'WhatsApp Image 2026-07-03 at 19.45.59 (1).png': 'Pearl Horizon White',
        'WhatsApp Image 2026-07-03 at 19.45.59.png': 'Indy Gray Metallic'
    }
}

# 12. Build Product List
products = []

for folder, (fif_key, oto_key, display_name, cat) in folder_mapping.items():
    # Retrieve OTR Cash
    fif_entry = fif_data.get(fif_key, None)
    oto_entry = oto_data.get(oto_key, None) if oto_key else None
    
    price_otr = 0
    if fif_entry and fif_entry['otr']:
        price_otr = int(fif_entry['otr'])
    elif oto_entry and oto_entry['otr']:
        price_otr = int(oto_entry['otr'])
        
    fif_sims = fif_entry['sims'] if fif_entry else []
    oto_sims = oto_entry['sims'] if oto_entry else []
    
    # Asuransi cash
    asuransi_cash = asuransi_cash_map.get(cat, 700000)
    total_cash_asuransi = price_otr + asuransi_cash if price_otr > 0 else 0
    
    # Colors
    dir_path = os.path.join('assets/products', folder)
    img_files = []
    if os.path.exists(dir_path):
        img_files = [f for f in os.listdir(dir_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
    png_files = [f for f in img_files if f.lower().endswith('.png')]
    picked_files = png_files if png_files else img_files
    
    folder_color_names = color_map.get(folder, {})
    warna_list = []
    
    for fn in sorted(picked_files):
        cname = folder_color_names.get(fn, None)
        if not cname:
            clean = fn.replace('WhatsApp Image', '').replace('removebg-preview', '').replace('.png', '').replace('.jpeg', '').replace('.jpg', '').strip()
            cname = f"Varian {clean}" if clean else "Standar"
        warna_list.append({
            "nama": cname,
            "foto": f"assets/products/{folder}/{fn}"
        })
        
    if not warna_list:
        warna_list = [{"nama": "Standar", "foto": "assets/img/logo/logo.png"}]
        
    # Stable unique ID derived from folder name
    folder_slug = re.sub(r'[^a-z0-9]+', '-', folder.lower()).strip('-')
    prod_id = f"prod-{folder_slug}"
    
    leasing_options = []
    if fif_sims:
        leasing_options.append("FIF")
    if oto_sims:
        leasing_options.append("OTO")
    if not leasing_options:
        leasing_options = ["FIF"]
        
    products.append({
        "id": prod_id,
        "namaMotor": display_name,
        "kategori": cat,
        "folder": folder,
        "hargaOtr": price_otr,
        "hargaCash": price_otr,
        "hargaCashAsuransi": total_cash_asuransi,
        "hargaAsuransi": asuransi_cash,
        "hargaTotalCashAsuransi": total_cash_asuransi,
        "deskripsiSingkat": f"{display_name} sepeda motor Honda resmi berkualitas tinggi dari PT Astra Honda Motor. Desain modern, performa tangguh, irit bahan bakar, dan bergaransi resmi.",
        "warna": warna_list,
        "simulasiKreditFif": fif_sims,
        "simulasiKreditOto": oto_sims,
        "simulasiKredit": fif_sims if fif_sims else oto_sims,
        "leasingOptions": leasing_options,
        "updatedAt": "2026-11-21T11:30:00.000Z"
    })

print(f"Generated {len(products)} products with accurate Price List & simulations!")

# Save to data/seed-products.json
with open('data/seed-products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)
print("Saved data/seed-products.json")

# 13. Save data/default-settings.json for HENGKI HONDA JPA
default_settings = {
  "hero": {
    "backgroundUrl": "assets/img/hero/hero-bg.jpg",
    "promoImageUrl": "promo/promo-1.webp",
    "promoActive": True,
    "promoList": [
      {"id": "promo-1", "url": "promo/promo-1.webp", "alt": "Promo Honda 1", "active": True},
      {"id": "promo-2", "url": "promo/promo-2.webp", "alt": "Promo Honda 2", "active": True},
      {"id": "promo-3", "url": "promo/promo-3.webp", "alt": "Promo Honda 3", "active": True},
      {"id": "promo-4", "url": "promo/promo-4.webp", "alt": "Promo Honda 4", "active": True},
      {"id": "promo-5", "url": "promo/promo-5.webp", "alt": "Promo Honda 5", "active": True}
    ],
    "title": "Dealer Resmi Sepeda Motor Honda",
    "subtitle": "HENGKI HONDA JPA",
    "tagline": "Dapatkan Promo DP Ringan, Angsuran Terjangkau FIF & OTO, Diskon Spesial, dan Proses Cepat Mudah Terpercaya!",
    "ctaText": "Lihat Pilihan Motor"
  },
  "about": {
    "title": "Dealer Resmi Honda HENGKI HONDA JPA",
    "deskripsi": "HENGKI HONDA JPA hadir untuk mewujudkan impian Anda memiliki sepeda motor Honda idaman dengan proses yang mudah, transparan, cepat, dan penuh kehangatan. Kami melayani pembelian unit secara Cash maupun Kredit dengan pilihan leasing resmi FIFASTRA (FIF) dan OTO Multiartha dengan promo DP paling kompetitif di wilayah Palabuhanratu, Jampang, dan sekitarnya.",
    "foto": "assets/img/about/about.jpg",
    "keunggulan": [
      {
        "icon": "fa-award",
        "title": "100% Dealer Resmi Honda",
        "desc": "Unit motor baru asli Astra Honda Motor bergaransi resmi pabrik."
      },
      {
        "icon": "fa-calculator",
        "title": "Pilihan Leasing OTO & FIF",
        "desc": "Bebas pilih skema angsuran fleksibel sesuai kebutuhan finansial Anda."
      },
      {
        "icon": "fa-percent",
        "title": "Promo DP Paling Murah",
        "desc": "Tersedia potongan tenor dan diskon uang muka spesial tiap bulan."
      },
      {
        "icon": "fa-truck-fast",
        "title": "Gratis Antar ke Rumah",
        "desc": "Motor diantar aman langsung ke rumah konsumen dengan selamat."
      }
    ]
  },
  "pelayanan": [
    {
      "id": "pelayanan-1",
      "title": "Pelayanan Akurat & Cepat",
      "desc": "Proses administrasi cepat, simulasi transparan, dan pengantaran unit tepat waktu.",
      "foto": "assets/img/pelayanan/akurat-cepat.jpg"
    },
    {
      "id": "pelayanan-2",
      "title": "Event Service Honda",
      "desc": "Layanan servis berkala, promo event servis, dan teknisi ahli bersertifikasi Astra Honda.",
      "foto": "assets/img/pelayanan/event-service.jpg"
    }
  ],
  "contact": {
    "alamat": "Jaya Perkasa Abadi. PT - Dealer Resmi Motor Honda",
    "jamOperasional": "Senin - Sabtu: 08.00 - 17.00 WIB | Minggu: 09.00 - 15.00 WIB",
    "whatsappNumber": "081313133505",
    "whatsappLink": "https://wa.me/6281313133505",
    "instagram": "https://www.instagram.com/hengki1978/",
    "tiktok": "https://www.tiktok.com/@hengki.honda.jpa",
    "facebook": "",
    "googleMapsEmbed": "https://maps.google.com/maps?q=-6.1096361,106.8885471+(Jaya+Perkasa+Abadi.+PT)&t=&z=16&ie=UTF8&iwloc=B&output=embed",
    "googleMapsUrl": "https://maps.app.goo.gl/hSzi68kKWfmkN2wh6"
  },
  "waTemplate": {
    "template": "Halo Hengki Honda JPA, saya tertarik dengan:\nMotor: {namaMotor}\nWarna: {warna}\nHarga OTR Cash: {hargaOtr}\nPilihan Leasing: {leasing}\nSimulasi Kredit: DP {dp} - Tenor {tenor} bulan - Cicilan {cicilan}/bulan\nMohon info lebih lanjut. Terima kasih."
  }
}

with open('data/default-settings.json', 'w', encoding='utf-8') as f:
    json.dump(default_settings, f, indent=2, ensure_ascii=False)
print("Saved data/default-settings.json")

# 14. Save data/seed-testimonials.json (Text-only reviews, no photos)
testi_comments = [
    ("Budi Santoso", 5, "Pelayanan di HENGKI HONDA JPA sangat ramah dan proses kredit FIF cepat tanpa ribet! Sehari langsung acc dan motor diantar ke rumah."),
    ("Siti Nurhaliza", 5, "Beli Honda Scoopy baru disini dapat promo DP termurah. Salesnya sangat membantu dan komunikatif via WhatsApp."),
    ("Ahmad Fauzi", 5, "Alhamdulillah ambil Honda PCX 160 proses lewat leasing OTO sangat cepat dan transparan. Unit datang tepat waktu dan surat-surat aman."),
    ("Dewi Sartika", 5, "Rekomendasi dealer Honda terbaik! Pelayanan aftersales juga memuaskan. Sukses selalu HENGKI HONDA JPA!"),
    ("Rian Hidayat", 5, "DP ringan angsuran pas di kantong. Terima kasih mas sales sudah dibantu prosesnya sampai tuntas."),
    ("Endang Supriatna", 5, "Mantap pisan pelayananna, dealer resmi terpercaya. Rekomen buat warga Palabuhanratu, Jampang dan sekitarnya."),
    ("Fitri Handayani", 5, "Proses mudah, syarat cuma KTP dan KK, langsung diproses cepat. Motor BeAT-nya mulus pisan."),
    ("Deni Setiawan", 5, "Puas sekali ambil CRF 150 disini. Diskon menarik dan bonus helm jaket lengkap!")
]

seed_testi = []
for idx, (nama, rating, komen) in enumerate(testi_comments):
    seed_testi.append({
        "id": f"testi-{idx+1}",
        "nama": nama,
        "rating": rating,
        "komentar": komen
    })

with open('data/seed-testimonials.json', 'w', encoding='utf-8') as f:
    json.dump(seed_testi, f, indent=2, ensure_ascii=False)
print("Saved data/seed-testimonials.json (Text only)")
print("=== BUILD AND ASSET PREPARATION COMPLETED SUCCESSFULLY ===")
