import json
import logging
import re
from typing import Optional

from google import genai
from google.genai import types
from config import GEMINI_API_KEY, GEMINI_MODEL
import time

_LAST_GEMINI_CALL = 0
GEMINI_MIN_INTERVAL = 13
log = logging.getLogger(__name__)
_client = genai.Client(api_key=GEMINI_API_KEY)


def _call(prompt: str) -> Optional[str]:
    global _LAST_GEMINI_CALL

    elapsed = time.time() - _LAST_GEMINI_CALL
    if elapsed < GEMINI_MIN_INTERVAL:
        wait = GEMINI_MIN_INTERVAL - elapsed
        log.info("Gemini throttle – czekam %.1fs", wait)
        time.sleep(wait)

    for attempt in range(4):
        try:
            _LAST_GEMINI_CALL = time.time()
            resp = _client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.0),
            )
            return resp.text.strip()
        except Exception as e:
            msg = str(e)
            print(f"  FULL ERROR: {msg}")
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                wait = 15 * (attempt + 1)
                log.warning("Rate limit – czekam %ds (próba %d/4)", wait, attempt + 1)
                time.sleep(wait)
            elif "503" in msg or "UNAVAILABLE" in msg or "overloaded" in msg.lower():
                wait = 10 * (2 ** attempt)   # 10, 20, 40, 80s
                log.warning("503 przeciążenie – czekam %ds (próba %d/4)", wait, attempt + 1)
                time.sleep(wait)
            else:
                log.error("Błąd Gemini: %s", e)
                return None
    log.error("Gemini nie odpowiedział po 4 próbach")
    return None


def _extract_json(raw: str) -> Optional[list | dict]:
    if not raw:
        return None
    clean = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        log.warning("Nie udało się sparsować JSON: %s", clean[:200])
        return None

_HOURS_PROMPT = """
Jesteś ekraktorem danych z polskich ogłoszeń akademickich.
Poniżej treść ogłoszenia z Politechniki Łódzkiej.

TYTUŁ: {title}

TREŚĆ:
{body}

Wyciągnij informacje o godzinach rektorskich lub dziekańskich.
Zwróć WYŁĄCZNIE obiekt JSON (bez żadnego innego tekstu) z polami:
  - "hour_type"   : "rektorskie" lub "dziekanskie"
  - "event_date"  : data zdarzenia "YYYY-MM-DD" lub null
  - "time_from"   : godzina rozpoczęcia "HH:MM" lub null
  - "time_to"     : godzina zakończenia "HH:MM" lub null
                    (jeśli ogłoszenie mówi tylko "od godz. X" bez końca — wstaw null)
  - "applies_to"  : wydziały/jednostki których dotyczy lub null
  - "reason"      : powód ogłoszenia lub null

WAŻNE: Godziny rektorskie często podają TYLKO godzinę początku ("od godz. 12:00").
W takim przypadku time_from = "12:00", time_to = null.
Nie wymyślaj godziny końcowej jeśli jej nie ma w tekście.

Jeśli jest wiele bloków czasowych (np. dwa różne dni), zwróć TABLICĘ takich obiektów.
Jeśli ogłoszenie nie dotyczy godzin rektorskich ani dziekańskich, zwróć null.
"""


def extract_free_hours(body: str, title: str) -> list[dict]:
    raw = _call(_HOURS_PROMPT.format(title=title, body=body[:3000]))
    data = _extract_json(raw)
    if data is None:
        return []
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return []

    results = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if item.get("hour_type") not in ("rektorskie", "dziekanskie"):
            continue
        results.append({
            "hour_type":  item.get("hour_type"),
            "event_date": item.get("event_date"),
            "time_from":  item.get("time_from"),
            "time_to":    item.get("time_to"),
            "applies_to": json.dumps(item.get("applies_to"), ensure_ascii=False) if isinstance(item.get("applies_to"), (list, dict)) else item.get("applies_to"),
            "reason":     json.dumps(item.get("reason"), ensure_ascii=False) if isinstance(item.get("reason"), (list, dict)) else item.get("reason"),
            "gemini_raw": json.dumps(item, ensure_ascii=False),
        })
    return results

_CALENDAR_PROMPT = """
Jesteś ekraktorem danych z polskiego kalendarza akademickiego.

SEKCJA: {title}

TREŚĆ:
{body}

Wyciągnij wszystkie zdarzenia kalendarza i zwróć WYŁĄCZNIE tablicę JSON.
Każdy element tablicy to obiekt z polami:
  - "academic_year" : rok akademicki np. "2025/2026"
  - "semester"      : "zimowy" lub "letni"
  - "event_type"    : typ zdarzenia np. "zajęcia", "sesja_zimowa", "sesja_letnia",
                      "wakacje_zimowe", "wakacje_letnie", "ferie_wiosenne",
                      "przerwa_swiateczna", "dzien_wolny", "dzien_wirtualny"
  - "date_from"     : data rozpoczęcia "YYYY-MM-DD" lub null
  - "date_to"       : data zakończenia "YYYY-MM-DD" lub null (= date_from jeśli jednodniowe)
  - "notes"         : dodatkowe informacje (np. "zajęcia wg planu na piątek") lub null

Zwróć pustą tablicę [] jeśli brak dat.
"""


def extract_calendar_events(title: str, body: str) -> list[dict]:
    raw = _call(_CALENDAR_PROMPT.format(title=title, body=body[:3000]))
    data = _extract_json(raw)
    if not isinstance(data, list):
        return []

    results = []
    for item in data:
        if not isinstance(item, dict):
            continue
        results.append({
            "academic_year": item.get("academic_year"),
            "semester":      item.get("semester"),
            "event_type":    item.get("event_type"),
            "date_from":     item.get("date_from"),
            "date_to":       item.get("date_to"),
            "notes":         item.get("notes"),
            "gemini_raw":    json.dumps(item, ensure_ascii=False),
        })
    return results