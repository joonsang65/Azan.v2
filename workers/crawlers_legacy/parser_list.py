from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup


def parse_list(html: str, list_url: str) -> list[dict]:
    """Parse legacy list-table HTML used by the crawler unit tests.

    The current crawler implementation keeps its Ajou-specific parser private in
    `workers.crawler.scraper`. This wrapper preserves the older test-facing API
    without changing production crawler behavior.
    """
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    items: list[dict] = []

    for row in soup.select("table tbody tr"):
        link = row.select_one("a")
        if link is None:
            continue

        title = link.get_text(" ", strip=True)
        href = (link.get("href") or "").strip()
        if not title or not href:
            continue

        cells = row.select("td")
        raw_texts = [cell.get_text(" ", strip=True) for cell in cells]
        date_candidates = [
            match.group(0)
            for text in raw_texts
            for match in re.finditer(r"\d{4}-\d{2}-\d{2}", text)
        ]

        items.append(
            {
                "title": title,
                "url": urljoin(list_url, href),
                "published_at_raw": date_candidates[-1] if date_candidates else "",
            }
        )

    return items
