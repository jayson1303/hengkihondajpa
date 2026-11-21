# ==============================================================================
# HENGKI HONDA JPA - scripts/parse_excel.py
# Parser Price List FIF (PL Fif Updated.xlsx) - 15 Baris DP per Model
# ==============================================================================

import os
import json
import openpyxl

EXCEL_PATH = 'Price List/PL FIF + Logo/PL Fif Updated.xlsx'

def parse_fif_pricelist(excel_path=EXCEL_PATH):
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"File tidak ditemukan: {excel_path}")

    wb = openpyxl.load_workbook(excel_path, data_only=True)
    fif_data = {}

    for sname in wb.sheetnames:
        ws = wb[sname]

        # Tenor kolom kiri (baris 7)
        tenors_left = {}
        for c in range(4, 15):
            v = ws.cell(7, c).value
            if v and str(v).isdigit():
                tenors_left[c] = int(v)
            elif v is not None and not str(v).isdigit():
                break

        # Deteksi kolom kanan (cari 'UANG MUKA' di baris 6)
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
                    elif tv is not None and not str(tv).isdigit():
                        break
                break

        # Blok Kiri (model_col = 1, dp_col = 3)
        for r in range(8, ws.max_row + 1):
            c1 = ws.cell(r, 1).value
            if isinstance(c1, int) and c1 < 1000:
                m_name = ws.cell(r + 2, 1).value
                otr = ws.cell(r + 4, 1).value
                if m_name and isinstance(m_name, str) and not m_name.strip().isdigit():
                    model_name = m_name.strip()
                    otr_val = otr if isinstance(otr, (int, float)) else 0
                    sims = []
                    # Membaca seluruh 15 baris DP
                    for row_offset in range(15):
                        cur_r = r + row_offset
                        dp_val = ws.cell(cur_r, 3).value
                        if dp_val and isinstance(dp_val, (int, float)):
                            dp_rp = int(dp_val * 1000)
                            for c, tenor in tenors_left.items():
                                cicilan = ws.cell(cur_r, c).value
                                if cicilan and isinstance(cicilan, (int, float)):
                                    sims.append({
                                        'dp': dp_rp,
                                        'tenor': tenor,
                                        'cicilan': int(cicilan * 1000)
                                    })
                    fif_data[model_name] = {'sheet': sname, 'otr': otr_val, 'sims': sims}

        # Blok Kanan
        if model_col_right and dp_col_right:
            for r in range(8, ws.max_row + 1):
                cm = ws.cell(r, model_col_right).value
                if isinstance(cm, int) and cm < 1000:
                    m_name = ws.cell(r + 2, model_col_right).value
                    otr = ws.cell(r + 4, model_col_right).value
                    if m_name and isinstance(m_name, str) and not m_name.strip().isdigit():
                        model_name = m_name.strip()
                        otr_val = otr if isinstance(otr, (int, float)) else 0
                        sims = []
                        # Membaca seluruh 15 baris DP
                        for row_offset in range(15):
                            cur_r = r + row_offset
                            dp_val = ws.cell(cur_r, dp_col_right).value
                            if dp_val and isinstance(dp_val, (int, float)):
                                dp_rp = int(dp_val * 1000)
                                for c, tenor in tenors_right.items():
                                    cicilan = ws.cell(cur_r, c).value
                                    if cicilan and isinstance(cicilan, (int, float)):
                                        sims.append({
                                            'dp': dp_rp,
                                            'tenor': tenor,
                                            'cicilan': int(cicilan * 1000)
                                        })
                        fif_data[model_name] = {'sheet': sname, 'otr': otr_val, 'sims': sims}

    return fif_data

if __name__ == '__main__':
    data = parse_fif_pricelist()
    print(f"Berhasil membaca {len(data)} model dari {EXCEL_PATH}:")
    for name, info in list(data.items())[:10]:
        dps = sorted(list(set(s['dp'] for s in info['sims'])))
        print(f" - {name} ({info['sheet']}): {len(dps)} DP -> {dps[:3]} ... {dps[-2:]}")
