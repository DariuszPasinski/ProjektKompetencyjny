"""
Użycie:
    python main.py --mode all
    python main.py --mode announcements
    python main.py --mode calendar
    python main.py --mode announcements --full   # pełna historia
"""
import argparse
import logging
import sys
from datetime import datetime, date, time

import database as db
import normalizer
from config import (
    ANNOUNCEMENTS_URL, CALENDAR_URL, WEEIA_BASE,
    SOURCE_SCRAPER,
    EVENT_REKTORSKIE, EVENT_DZIEKANSKIE, EVENT_DZIEN_WOLNY, EVENT_UCZELNIANE,
    SEMESTR_ZIMOWY, SEMESTR_LETNI,
    PARITY_X1_NIEPARZYSTY, PARITY_X2_PARZYSTY,
    WEEK_DAYS, HALF_PIERWSZA, HALF_DRUGA,
)
from fetcher import fetch
from parsers.announcements import get_total_pages, parse_article, parse_listing
from parsers.calendar import parse_calendar

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s – %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("scraper.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("main")


def _is_hours(title: str) -> bool:
    t = title.lower()
    return "godziny rektorsk" in t or "godziny dziekańsk" in t or "godziny dziekansk" in t


def _make_datetime(event_date: str | None, time_str: str | None, end: bool = False):
    """Buduje datetime z daty i godziny. end=True → 23:59 jeśli brak godziny."""
    if not event_date:
        return None
    try:
        d = date.fromisoformat(event_date)
        if time_str:
            h, m = map(int, time_str.split(":"))
            return datetime.combine(d, time(h, m))
        return datetime.combine(d, time(23, 59) if end else time(0, 0))
    except Exception:
        return None



# Ogłoszenia
def scrape_announcements(base_url: str, full: bool = False) -> None:
    conn = db.get_conn()
    try:
        first_page = fetch(f"{base_url}?page=0", delay=False)
        if not first_page:
            log.error("Nie udało się pobrać: %s", base_url)
            return

        pages = get_total_pages(first_page) if full else 1
        log.info("Ogłoszenia: %d stron(y)", pages)

        for page_num in range(pages):
            html = first_page if page_num == 0 else fetch(f"{base_url}?page={page_num}")
            if not html:
                continue

            articles = parse_listing(html, WEEIA_BASE)
            log.info("Strona %d: %d artykułów", page_num, len(articles))

            for art in articles:
                if not _is_hours(art["title"]):
                    continue

                article_html = fetch(art["url"])
                body, art_date = parse_article(article_html) if article_html else ("", None)
                published = art["published"] or art_date

                hours = normalizer.extract_free_hours(body, art["title"])
                for h in hours:
                    event_type = EVENT_REKTORSKIE if h.get("hour_type") == "rektorskie" else EVENT_DZIEKANSKIE
                    start_dt = _make_datetime(h.get("event_date"), h.get("time_from"))
                    end_dt   = _make_datetime(h.get("event_date"), h.get("time_to"), end=True)

                    if not start_dt:
                        log.warning("Brak daty dla: %s", art["title"])
                        continue

                    desc_parts = [p for p in [h.get("applies_to"), h.get("reason")] if p]
                    desc = " | ".join(desc_parts) if desc_parts else None

                    event_id = db.insert_university_event(conn, {
                        "event_type_id":  event_type,
                        "title":          art["title"],
                        "start_datetime": start_dt,
                        "end_datetime":   end_dt,
                        "location":       None,
                        "description":    desc,
                        "source_type_id": SOURCE_SCRAPER,
                    })
                    db.insert_university_event_target_all(conn, event_id)
                    log.info("  → Zapisano: %s %s", art["title"], start_dt)

                conn.commit()
    finally:
        conn.close()



# Kalendarz akademicki
def scrape_calendar() -> None:
    log.info("Scraping kalendarza akademickiego…")
    html = fetch(CALENDAR_URL, delay=False)
    if not html:
        log.error("Nie udało się pobrać kalendarza")
        return

    blocks = parse_calendar(html)
    conn = db.get_conn()
    total = 0
    try:
        for block in blocks:
            log.info("  → Gemini: «%s»", block["title"])
            events = normalizer.extract_calendar_events(block["title"], block["body"])

            for ev in events:
                etype = ev.get("event_type", "")
                if "wolny" in etype or "swiateczna" in etype or "wakacje" in etype or "ferie" in etype:
                    event_type_id = EVENT_DZIEN_WOLNY
                else:
                    event_type_id = EVENT_UCZELNIANE

                start_dt = _make_datetime(ev.get("date_from"), None)
                end_dt   = _make_datetime(ev.get("date_to"), None, end=True)
                if not start_dt:
                    continue

                title = f"{ev.get('event_type', 'Zdarzenie')} – {block['title']}"
                event_id = db.insert_university_event(conn, {
                    "event_type_id":  event_type_id,
                    "title":          title[:100],
                    "start_datetime": start_dt,
                    "end_datetime":   end_dt,
                    "location":       None,
                    "description":    ev.get("notes"),
                    "source_type_id": SOURCE_SCRAPER,
                })
                db.insert_university_event_target_all(conn, event_id)
                total += 1

            conn.commit()
    finally:
        conn.close()

    log.info("Kalendarz: zapisano %d zdarzeń", total)


# CLI
def parse_args():
    parser = argparse.ArgumentParser(description="Scraper PŁ")
    parser.add_argument("--mode", choices=["all", "announcements", "calendar"], default="all")
    parser.add_argument("--full", action="store_true", help="Pobierz pełną historię ogłoszeń")
    return parser.parse_args()


def main():
    args = parse_args()
    log.info("Inicjalizacja bazy…")
    db.init_db()

    if args.mode in ("all", "announcements"):
        log.info("Ogłoszenia WEEIA…")
        scrape_announcements(ANNOUNCEMENTS_URL, full=args.full)

    if args.mode in ("all", "calendar"):
        scrape_calendar()


if __name__ == "__main__":
    main()
