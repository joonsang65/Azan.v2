from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

TOPIK_NOTICE_DETAIL_BASE = "https://www.topik.go.kr/TWINFO/TWINFO0011.do"


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_onclick(href: str) -> tuple[str | None, str | None]:
    if not href:
        return None, None

    m = re.search(r"fnContent\('([^']+)','([^']+)'\)", href)
    if not m:
        return None, None

    return m.group(1), m.group(2)


def build_url(bbs_id: str, ntt_id: str) -> str:
    return f"{TOPIK_NOTICE_DETAIL_BASE}?bbsId={bbs_id}&nttId={ntt_id}"


def parse_topik_notice_list(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("table.bbs_table.notice_table tbody tr")

    results: list[dict[str, Any]] = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 6:
            continue

        number_text = normalize_text(cols[0].get_text(" ", strip=True))
        gubun = normalize_text(cols[1].get_text(" ", strip=True))
        category = normalize_text(cols[2].get_text(" ", strip=True))
        date_text = normalize_text(cols[4].get_text(" ", strip=True))
        views = normalize_text(cols[5].get_text(" ", strip=True))

        a_tag = cols[3].select_one("a")
        if not a_tag:
            continue

        title = normalize_text(a_tag.get_text(" ", strip=True))
        href = a_tag.get("href", "")

        bbs_id, ntt_id = parse_onclick(href)
        url = build_url(bbs_id, ntt_id) if bbs_id and ntt_id else None

        has_attachment = cols[3].select_one(".icon_clip") is not None

        results.append(
            {
                "title": title,
                "url": url,
                "published_at": date_text,
                "gubun": gubun,
                "category": category,
                "views": views,
                "is_notice": "공지" in number_text,
                "has_attachment": has_attachment,
                "bbs_id": bbs_id,
                "ntt_id": ntt_id,
            }
        )

    return results