import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from config import WEEIA_BASE

log = logging.getLogger(__name__)

# Data w formacie ISO z atrybutu datetime taga <time>
# np. datetime="2024-03-27T12:35:34+01:00"
_ISO_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})")

# Fallback: tekstowy format Drupala "27/03/2024 - 12:35"
_DATE_RE = re.compile(r"(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}:\d{2})")


def _parse_date_from_time_tag(block) -> Optional[datetime]:
    time_el = block.find("time", attrs={"datetime": True})
    if time_el:
        raw = time_el["datetime"]
        m = _ISO_DATE_RE.match(raw)
        if m:
            try:
                return datetime.fromisoformat(raw.split("+")[0].split("Z")[0])
            except ValueError:
                pass
    return None


def _parse_date(raw: str) -> Optional[datetime]:
    """Fallback: parsowanie tekstowej daty."""
    m = _DATE_RE.search(raw)
    if not m:
        return None
    try:
        return datetime.strptime(f"{m.group(1)} {m.group(2)}", "%d/%m/%Y %H:%M")
    except ValueError:
        return None

def parse_listing(html: str, base_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    articles = []

    for h2 in soup.select("article h2, #region-main h2"):
        a = h2.find("a", href=True)
        if not a:
            continue

        title = a.get_text(strip=True)
        url   = urljoin(WEEIA_BASE, a["href"])

        block = h2.find_parent(["article", "div"])
        published = None
        if block:
            published = _parse_date_from_time_tag(block)
            if not published:
                time_el = block.find(string=re.compile(r"\d{2}/\d{2}/\d{4}"))
                if time_el:
                    published = _parse_date(time_el.strip())

        cat_el = block.find("a", href=re.compile(r"/(aktualnosci|ogloszenia)")) if block else None
        category = cat_el.get_text(strip=True) if cat_el else ""

        excerpt = ""
        if block:
            for p in block.find_all("p"):
                txt = p.get_text(strip=True)
                if txt and "czytaj więcej" not in txt.lower():
                    excerpt = txt
                    break

        articles.append({
            "title":     title,
            "url":       url,
            "published": published,
            "category":  category,
            "excerpt":   excerpt,
        })

    return articles


def get_total_pages(html: str) -> int:
    soup = BeautifulSoup(html, "html.parser")
    page_links = soup.select("nav.pager a[href*='page='], .pagination a[href*='page=']")
    if not page_links:
        page_links = soup.select("a[href*='?page='], a[href*='&page=']")

    max_page = 0
    for a in page_links:
        m = re.search(r"page=(\d+)", a["href"])
        if m:
            max_page = max(max_page, int(m.group(1)))

    return max_page + 1



def parse_article(html: str) -> tuple[str, Optional[datetime]]:
    soup = BeautifulSoup(html, "html.parser")

    published = None
    time_el = soup.find("time", attrs={"datetime": True})
    if time_el:
        try:
            published = datetime.fromisoformat(
                time_el["datetime"].split("+")[0].split("Z")[0]
            )
        except ValueError:
            pass


    article = soup.select_one("article")
    if not article:
        article = soup.select_one("div[role='main']") or soup

    for sel in ["nav", "footer", "header", ".breadcrumb", "#page-header",
                ".social-sharing-buttons", ".tul-components-social-sharing-buttons",
                ".region--sticky", ".block-social-media"]:
        for el in article.select(sel):
            el.decompose()

    for table in article.find_all("table"):
        rows_text = [
            " | ".join(td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"]))
            for tr in table.find_all("tr")
        ]
        table.replace_with("\n".join(rows_text))

    text = article.get_text("\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip(), published