from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

BASE_URL = "https://www.topik.go.kr"


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_notice_links(td) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []

    for a in td.select("a[href]"):
        href = a.get("href", "").strip()
        label = normalize_text(a.get_text(" ", strip=True))
        if not href:
            continue

        full_url = urljoin(BASE_URL, href)
        links.append(
            {
                "label": label,
                "url": full_url,
            }
        )

    return links


def parse_topik_schedule(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("table.basic_table.table_list tbody tr")

    results: list[dict[str, Any]] = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 9:
            continue

        results.append(
            {
                "category": normalize_text(cols[0].get_text(" ", strip=True)),
                "round": normalize_text(cols[1].get_text(" ", strip=True)),
                "application_period": normalize_text(cols[2].get_text(" ", strip=True)),
                "exam_date_kr": normalize_text(cols[3].get_text(" ", strip=True)),
                "exam_date_other": normalize_text(cols[4].get_text(" ", strip=True)),
                "exam_date_asia": normalize_text(cols[5].get_text(" ", strip=True)),
                "test_levels": [normalize_text(s) for s in cols[6].stripped_strings if normalize_text(s)],
                "reception_status": normalize_text(cols[7].get_text(" ", strip=True)),
                "result_date": normalize_text(cols[8].get_text(" ", strip=True)),
                "notice_links": extract_notice_links(cols[2]),
            }
        )

    return results