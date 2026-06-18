"""
Parser profili pracowników i kafelka Konsultacje (WIKAMP Moodle).

Dwa źródła danych na kafelku konsultacji:
  1. Tabela #repeated-consultations z hidden inputs  → parse_structured_consultations()
  2. div.text_to_html z wolnym tekstem               → zwraca surowy tekst do Gemini
"""
import logging
import re
from typing import Optional

from bs4 import BeautifulSoup

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Profil główny
# ─────────────────────────────────────────────────────────────────────────────

def parse_profile(html: str, user_id: int, profile_url: str) -> Optional[dict]:
    """
    Parsuje stronę https://weeia.edu.p.lodz.pl/user/profile.php?id=USER_ID
    Zwraca słownik gotowy do upsert_employee() lub None jeśli profil nieaktywny.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Tytuł strony: "dr inż. Krzysztof Strzecha: Profil publiczny | WIKAMP WEEIA"
    # → sprawdź czy to faktyczny profil a nie strona błędu
    page_title = soup.title.get_text(strip=True) if soup.title else ""
    if "Profil publiczny" not in page_title and "public profile" not in page_title.lower():
        log.debug("user_id=%d – nie znaleziono profilu publicznego", user_id)
        return None

    # Imię i nazwisko – szukamy w bloku profilu, nie w nagłówku strony
    # Strona tytułu: "dr inż. Jan Kowalski: Profil publiczny | WIKAMP WEEIA"
    page_title = soup.title.get_text(strip=True) if soup.title else ""
    # Wyciągnij nazwisko z tytułu strony (przed dwukropkiem)
    full_name = ""
    if ":" in page_title:
        full_name = page_title.split(":")[0].strip()

    # Fallback: h1 wewnątrz div.page-header-headings lub podobnego
    if not full_name or full_name == "WIKAMP WEEIA":
        for h1 in soup.find_all("h1"):
            txt = h1.get_text(strip=True)
            if txt and txt != "WIKAMP WEEIA":
                full_name = txt
                break

    # Tytuł naukowy – h5 pod zdjęciem (np. "dr inż.")
    subtitle = soup.select_one(".card h5, h5.card-subtitle, h5")
    title = subtitle.get_text(strip=True) if subtitle else ""

    # Afiliacja – szukamy etykiety "Afiliacja" w tabeli profilu
    affiliation = ""
    dept_code   = ""
    for dt in soup.find_all(string=re.compile(r"Afiliacja", re.I)):
        parent = dt.parent
        # Szukamy następnego rodzeństwa lub komórki dd/td
        sibling = parent.find_next_sibling() or parent.parent.find_next_sibling()
        if sibling:
            affiliation = sibling.get_text(" ", strip=True)
            # Wyciągnij kod instytutu (np. "I24")
            m = re.match(r"^([A-Z]\d+)", affiliation)
            if m:
                dept_code = m.group(1)
            break

    return {
        "id":          user_id,
        "full_name":   full_name,
        "title":       title,
        "affiliation": affiliation,
        "dept_code":   dept_code,
        "profile_url": profile_url,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Kafelek Konsultacje
# ─────────────────────────────────────────────────────────────────────────────

def parse_consultation_tile(html: str, employee_id: int) -> dict:
    """
    Parsuje view_tile.php?id=6&userid=X
    Zwraca:
        {
            "structured": [ {...}, ... ],   # wiersze z tabeli – gotowe do zapisu
            "freetext":   "..."  lub None   # surowy tekst do Gemini (lub None)
        }
    """
    soup = BeautifulSoup(html, "html.parser")

    return {
        "structured": _parse_structured(soup, employee_id),
        "freetext":   _parse_freetext(soup),
    }


def _parse_structured(soup: BeautifulSoup, employee_id: int) -> list[dict]:
    """
    Tabela #repeated-consultations.
    Każda komórka ma <input type="hidden"> z czystą wartością maszynową.
    """
    rows = soup.select("#repeated-consultations tbody tr")
    results = []

    for row in rows:
        def hidden(cls: str) -> str:
            el = row.select_one(f"input.{cls}")
            return el["value"].strip() if el and el.get("value") else ""

        def visible(col_cls: str) -> str:
            """Tekst komórki z pominięciem zawartości hidden inputów."""
            cell = row.select_one(f"td.{col_cls}")
            if not cell:
                return ""
            # Usuń tekst hidden inputów – zostaw tylko bezpośredni tekst
            for inp in cell.find_all("input"):
                inp.decompose()
            return cell.get_text(strip=True)

        consult_id  = hidden("id")
        day_of_week = hidden("dayofweek")          # "Wednesday"
        start_time  = hidden("starttime")          # "13:15"
        end_time    = hidden("endtime")            # "14:00"
        semester_code = hidden("semesternumer")    # "2025262"
        place       = hidden("place")              # "bud. C6 p. 7"
        description = hidden("description")

        day_pl      = visible("c0")                # "Środa"
        semester    = visible("c3")                # "2025/26 L"

        if not start_time:
            continue   # pusty wiersz

        results.append({
            "employee_id":     employee_id,
            "consultation_id": int(consult_id) if consult_id.isdigit() else None,
            "day_of_week":     day_of_week,
            "day_pl":          day_pl,
            "start_time":      start_time,
            "end_time":        end_time,
            "semester":        semester,
            "semester_code":   semester_code,
            "place":           place,
            "description":     description,
        })

    return results


def _parse_freetext(soup: BeautifulSoup) -> Optional[str]:
    """
    Wolne pole tekstowe div.text_to_html – obecne gdy pracownik nie używa tabeli.
    Zwraca tekst lub None gdy pole puste.
    """
    div = soup.select_one("div.text_to_html")
    if not div:
        return None
    text = div.get_text(" ", strip=True)
    # Usuń puste paragrafy / same spacje
    text = re.sub(r"\s+", " ", text).strip()
    return text if text else None