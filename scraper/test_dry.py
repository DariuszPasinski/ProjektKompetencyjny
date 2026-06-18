"""
Suchy test z Gemini – pobiera dane, normalizuje przez API i zapisuje do output.txt
Nie wymaga bazy danych.

Użycie:
    python test_dry.py              # wszystko
    python test_dry.py calendar
    python test_dry.py announcements
"""
import sys
import time
import warnings
from urllib.parse import urljoin

import requests
import requests.packages.urllib3 as urllib3
from bs4 import BeautifulSoup

from normalizer import extract_free_hours, extract_calendar_events
from parsers.calendar import parse_calendar
from parsers.announcements import parse_listing, parse_article, get_total_pages

warnings.filterwarnings("ignore", category=urllib3.exceptions.InsecureRequestWarning)

BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "pl-PL,pl;q=0.9",
}
OUTPUT_FILE = "output.txt"


def fetch(url: str, delay: bool = True) -> str | None:
    print(f"  GET {url}")
    if delay:
        time.sleep(1.0)
    try:
        r = requests.get(url, headers=BASE_HEADERS, timeout=15, verify=False)
        r.raise_for_status()
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except Exception as e:
        print(f"  BŁĄD: {e}")
        return None


def write(f, text: str) -> None:
    print(text)
    f.write(text + "\n")


def _is_hours(title: str) -> bool:
    t = title.lower()
    return "godziny rektorsk" in t or "godziny dziekańsk" in t or "godziny dziekansk" in t


# ── Kalendarz ────────────────────────────────────────────────────────────────

def test_calendar(f) -> None:
    write(f, "=" * 60)
    write(f, "KALENDARZ AKADEMICKI")
    write(f, "=" * 60)

    html = fetch("https://p.lodz.pl/studenci/podzial-roku-akademickiego", delay=False)
    if not html:
        write(f, "BŁĄD: nie udało się pobrać kalendarza")
        return

    blocks = parse_calendar(html)
    write(f, f"\nZnaleziono {len(blocks)} sekcji do przetworzenia\n")

    for block in blocks:
        write(f, f"\n[ {block['title']} ]")
        print(f"  → Gemini: «{block['title']}»")

        events = extract_calendar_events(block["title"], block["body"])
        if not events:
            write(f, "  (brak zdarzeń)")
            continue

        for ev in events:
            line = (
                f"  {ev.get('event_type', '?'):30s} "
                f"{ev.get('date_from', '?')} – {ev.get('date_to', '?')}"
            )
            if ev.get("notes"):
                line += f"   [{ev['notes']}]"
            write(f, line)


# ── Ogłoszenia ───────────────────────────────────────────────────────────────

def test_announcements(f) -> None:
    write(f, "\n" + "=" * 60)
    write(f, "OGŁOSZENIA DZIEKANATU WEEIA")
    write(f, "=" * 60)

    base_url = "https://weeia.p.lodz.pl/wydzial/ogloszenia-dziekanatu"
    html = fetch(base_url, delay=False)
    if not html:
        write(f, "BŁĄD: nie udało się pobrać strony")
        return

    articles = parse_listing(html, "https://weeia.p.lodz.pl")
    write(f, f"\nStrona 0: {len(articles)} artykułów\n")
    for art in articles:
        write(f, f"  • {art['title']}")

    hours_articles = [a for a in articles if _is_hours(a["title"])]
    if not hours_articles:
        write(f, "\nBrak ogłoszeń o godzinach rektorskich/dziekańskich na stronie 0.")
        return

    write(f, f"\n--- GODZINY REKTORSKIE / DZIEKAŃSKIE ({len(hours_articles)}) ---\n")
    for art in hours_articles:
        print(f"  → Gemini: «{art['title']}»")
        body_html = fetch(art["url"])
        body, published = parse_article(body_html) if body_html else ("", None)
        hours = extract_free_hours(body, art["title"])

        write(f, f"\n{art['title']}")
        if not hours:
            write(f, "  (brak danych)")
            continue
        for h in hours:
            line = (
                f"  {h.get('hour_type', '?'):15s} "
                f"{h.get('event_date', '?')}  "
                f"{h.get('time_from', '?')}–{h.get('time_to', '?')}  "
                f"{h.get('applies_to') or ''}  "
                f"{h.get('reason') or ''}"
            )
            write(f, line)


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        if mode in ("all", "calendar"):
            test_calendar(f)
        if mode in ("all", "announcements"):
            test_announcements(f)

    print(f"\nZapisano do {OUTPUT_FILE}")