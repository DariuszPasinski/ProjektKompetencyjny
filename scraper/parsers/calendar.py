import re
from bs4 import BeautifulSoup


def parse_calendar(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    blocks = []

    for item in soup.select("div.accordion-item"):
        btn = item.select_one("button.accordion-button")
        title = btn.get_text(strip=True) if btn else ""

        # Tylko sekcje z rozkładem roku — pomija terminarz zjazdów,
        # terminy obligatoryjne itp.
        if "rozkład roku" not in title.lower():
            continue

        body_div = item.select_one("div.accordion-body")
        if not body_div:
            continue

        for ul in body_div.find_all("ul"):
            items = [f"- {li.get_text(strip=True)}" for li in ul.find_all("li")]
            ul.replace_with("\n".join(items))

        text = body_div.get_text("\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text).strip()

        if text:
            blocks.append({"title": title, "body": text})

    return blocks