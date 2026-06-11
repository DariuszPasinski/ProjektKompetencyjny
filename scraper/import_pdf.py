"""
Użycie:
    python import_pdf.py rozklad.pdf 2025/2026 letni
    python import_pdf.py rozklad.pdf 2025/2026 zimowy
"""
import re
import sys
from datetime import date

import pdfplumber
import database as db
from config import (
    SOURCE_SCRAPER,
    SEMESTR_ZIMOWY, SEMESTR_LETNI,
    PARITY_X1_NIEPARZYSTY, PARITY_X2_PARZYSTY,
    WEEK_DAYS, HALF_PIERWSZA, HALF_DRUGA,
)

# Indeksy kolumn w tabeli "x1 nieparzysty" (PDF PŁ)
COL_MAP = {4: "mon", 6: "tue", 8: "wed", 10: "thu", 13: "fri"}

PARITY_MAP = {"x1": PARITY_X1_NIEPARZYSTY, "x2": PARITY_X2_PARZYSTY}
SEMESTR_MAP = {"zimowy": SEMESTR_ZIMOWY, "letni": SEMESTR_LETNI}
HALF_MAP = {"pierwsza": HALF_PIERWSZA, "druga": HALF_DRUGA}


def parse_date(raw: str, rok_ak: str, semestr: str) -> date | None:
    raw = raw.strip()
    m = re.match(r"(\d{1,2})\.(\d{2})", raw)
    if not m:
        return None
    day, month = int(m.group(1)), int(m.group(2))
    year_start = int(rok_ak.split("/")[0])
    year = year_start + 1 if semestr == "letni" else (year_start if month >= 10 else year_start + 1)
    try:
        return date(year, month, day)
    except ValueError:
        return None


def import_pdf(path: str, rok_akademicki: str, semestr: str) -> None:
    records = []

    with pdfplumber.open(path) as pdf:
        table = None
        for page in pdf.pages:
            for t in page.extract_tables():
                if not t:
                    continue
                if "x1 nieparzysty" in " ".join(str(c) for c in t[0] if c).lower():
                    table = t
                    break
            if table:
                break

        if not table:
            print("Nie znaleziono tabeli — sprawdź format PDF.")
            return

        for row in table[1:]:
            if not row or not row[1]:
                continue
            m = re.search(r"t(\d+)/(x[12])", str(row[1]), re.I)
            if not m:
                continue
            numer = int(m.group(1))
            parz_key = m.group(2).lower()
            polowa_key = "pierwsza" if numer <= 8 else "druga"

            for col_idx, dzien in COL_MAP.items():
                if col_idx >= len(row) or not row[col_idx]:
                    continue
                for raw_date in str(row[col_idx]).split("\n"):
                    d = parse_date(raw_date, rok_akademicki, semestr)
                    if d:
                        records.append({
                            "academic_year":    rok_akademicki,
                            "semester_type_id": SEMESTR_MAP[semestr],
                            "date":             d,
                            "week_number":      numer,
                            "week_parity_id":   PARITY_MAP[parz_key],
                            "week_day_id":      WEEK_DAYS[dzien],
                            "semester_half_id": HALF_MAP[polowa_key],
                            "source_type_id":   SOURCE_SCRAPER,
                        })

    if not records:
        print("Nie znaleziono żadnych dat — sprawdź format PDF.")
        return

    print(f"Znaleziono {len(records)} rekordów, wczytuję do bazy...")
    db.init_db()
    conn = db.get_conn()
    try:
        for rec in records:
            db.insert_semester_day(conn, rec)
        conn.commit()
        print(f"Zapisano {len(records)} dni ({rok_akademicki}, {semestr}).")
    finally:
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Użycie: python import_pdf.py PLIK.pdf ROK_AK SEMESTR")
        print("Przykład: python import_pdf.py rozklad.pdf 2025/2026 letni")
        sys.exit(1)
    import_pdf(sys.argv[1], sys.argv[2], sys.argv[3])
