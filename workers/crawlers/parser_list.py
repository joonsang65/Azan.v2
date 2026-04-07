import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from .selectors import LIST_ROW_SELECTOR, LIST_TITLE_LINK_SELECTOR

# 날짜 패턴: 2026-02-19 / 2026.02.19 / 2026/02/19 모두 허용
DATE_PATTERN = re.compile(r"\d{4}[-./]\d{1,2}[-./]\d{1,2}")

def parse_list(html: str, list_url: str) -> list[dict]:
    """
    목록 페이지에서 최소 메타(제목/링크/작성일)를 뽑아냄.
    - 작성일은 '마지막 td'에서만 추출하도록 제한(오탐 방지)
    반환:
      [{"title":..., "url":..., "published_at_raw":...}, ...]
    """
    soup = BeautifulSoup(html, "lxml")
    rows = soup.select(LIST_ROW_SELECTOR)

    items: list[dict] = []

    for row in rows:
        # 제목 링크 찾기
        a = row.select_one(LIST_TITLE_LINK_SELECTOR)
        if not a:
            continue

        title = a.get_text(strip=True)
        href = (a.get("href") or "").strip()
        if not title or not href:
            continue

        url = urljoin(list_url, href)

        # ✅ 작성일 추출: 마지막 td만 사용
        tds = row.select("td")
        date_text = tds[-1].get_text(" ", strip=True) if len(tds) >= 1 else ""

        published_at_raw = None
        m = DATE_PATTERN.search(date_text)
        if m:
            published_at_raw = m.group(0).replace(".", "-").replace("/", "-")

        items.append({
            "title": title,
            "url": url,
            "published_at_raw": published_at_raw,
        })

    return items
