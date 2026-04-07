from __future__ import annotations

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_session() -> requests.Session:
    session = requests.Session()

    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
    )

    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;"
                "q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
            ),
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "close",
            "Upgrade-Insecure-Requests": "1",
            "Referer": "https://www.topik.go.kr/",
        }
    )

    # TOPIK 사이트는 timezone 쿠키가 있어야 실제 페이지 HTML을 주는 경우가 있음
    session.cookies.set("timezone", "Asia/Seoul", domain="www.topik.go.kr")

    return session


def fetch_html(url: str) -> str:
    session = build_session()
    response = session.get(url, timeout=30)
    response.raise_for_status()
    response.encoding = response.apparent_encoding
    return response.text