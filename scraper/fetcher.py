import logging
import time
from typing import Optional

import requests
from requests import Session, Response
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from config import HEADERS, DELAY, TIMEOUT, MAX_RETRIES

log = logging.getLogger(__name__)

_session: Optional[Session] = None


def get_session() -> Session:
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers.update(HEADERS)
    return _session


def fetch(url: str, *, delay: bool = True) -> Optional[str]:
    if delay:
        time.sleep(DELAY)

    session = get_session()
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp: Response = session.get(url, timeout=TIMEOUT, verify=False)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"
            log.debug("GET %s → %d", url, resp.status_code)
            return resp.text
        except requests.exceptions.HTTPError as e:
            log.warning("HTTP %s przy %s (próba %d/%d)", e.response.status_code, url, attempt, MAX_RETRIES)
            if e.response.status_code in (403, 404, 410):
                return None          # nie próbuj ponownie
        except requests.exceptions.RequestException as e:
            log.warning("Błąd sieci przy %s: %s (próba %d/%d)", url, e, attempt, MAX_RETRIES)

        if attempt < MAX_RETRIES:
            time.sleep(DELAY * attempt * 2)

    log.error("Nie udało się pobrać: %s", url)
    return None