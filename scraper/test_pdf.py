import re
import sys
from datetime import date

import pdfplumber

COL_MAP = {4: "mon", 6: "tue", 8: "wed", 10: "thu", 13: "fri"}


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


def test_pdf(path: str, rok_akademicki: str, semestr: str) -> None:
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
            parz = m.group(2).lower()
            polowa = "pierwsza" if numer <= 8 else "druga"
            for ci, dz in COL_MAP.items():
                if ci >= len(row) or not row[ci]:
                    continue
                for rd in str(row[ci]).split("\n"):
                    d = parse_date(rd, rok_akademicki, semestr)
                    if d:
                        records.append((numer, parz, dz, d, polowa))

    print(f"Znaleziono {len(records)} rekordów:\n")
    print(f"  {'t':>3}  {'parz':4}  {'dzień':4}  {'data':12}  połowa")
    print("  " + "-" * 40)
    for numer, parz, dz, d, polowa in records:
        print(f"  {numer:>3}  {parz:4}  {dz:4}  {d}  {polowa}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Użycie: python test_pdf.py PLIK.pdf ROK_AK SEMESTR")
        print("Przykład: python test_pdf.py rozklad.pdf 2025/2026 letni")
        sys.exit(1)
    test_pdf(sys.argv[1], sys.argv[2], sys.argv[3])