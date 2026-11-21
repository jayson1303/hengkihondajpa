import os
from PIL import Image

foto_base = 'Foto Produk'
dirs = sorted(os.listdir(foto_base))

def get_color_info(im):
    # Thumbnail to 100x100 for ultra-fast processing
    im_thumb = im.copy()
    im_thumb.thumbnail((100, 100))
    pixels = list(im_thumb.convert('RGBA').getdata())
    
    colored = []
    white_count = 0
    black_count = 0
    silver_count = 0
    total_opaque = 0
    
    for r, g, b, a in pixels:
        if a > 100:
            total_opaque += 1
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            diff = max_c - min_c
            if diff < 20:
                if max_c < 45: black_count += 1
                elif max_c > 215: white_count += 1
                else: silver_count += 1
            else:
                colored.append((r, g, b))
                
    reds = sum(1 for r, g, b in colored if r > g + 20 and r > b + 20)
    blues = sum(1 for r, g, b in colored if b > r + 15 and b > g + 10)
    greens = sum(1 for r, g, b in colored if g > r + 10 and g > b + 10)
    browns = sum(1 for r, g, b in colored if r > 70 and g > 40 and b < 50 and r > g + 10)
    
    return {
        'total': total_opaque,
        'colored': len(colored),
        'black': black_count,
        'white': white_count,
        'silver': silver_count,
        'reds': reds,
        'blues': blues,
        'greens': greens,
        'browns': browns
    }

for d in dirs:
    dpath = os.path.join(foto_base, d)
    if not os.path.isdir(dpath): continue
    pngs = sorted([f for f in os.listdir(dpath) if f.endswith('.png')])
    print(f"\nFolder: {d} ({len(pngs)} images)")
    for fn in pngs:
        fp = os.path.join(dpath, fn)
        im = Image.open(fp)
        info = get_color_info(im)
        desc = []
        if info['reds'] > 150: desc.append("Red")
        if info['blues'] > 150: desc.append("Blue")
        if info['greens'] > 150: desc.append("Green")
        if info['browns'] > 150: desc.append("Brown")
        if info['white'] > 250: desc.append("White")
        if not desc:
            if info['silver'] > info['black']: desc.append("Silver/Grey")
            else: desc.append("Black/Dark")
            
        c_pct = info['colored'] / max(1, info['total']) * 100
        print(f"  {fn} | {'+'.join(desc)} (Color {c_pct:.1f}%, R:{info['reds']} B:{info['blues']} G:{info['greens']} Br:{info['browns']} W:{info['white']} Blk:{info['black']} Silv:{info['silver']})")
