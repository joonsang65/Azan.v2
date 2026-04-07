from bs4 import BeautifulSoup
from .selectors import DETAIL_BODY_SELECTOR

def parse_detail(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    body_el = soup.select_one(DETAIL_BODY_SELECTOR)

    if not body_el:
        return soup.get_text("\n", strip=True)

    text = body_el.get_text("\n", strip=True)

    # 🔥 다른 공지/첨부 영역 잘라내기
    stop_keywords = [
        "첨부파일",
        "다음글",
        "이전글",
        "목록",
    ]

    for keyword in stop_keywords:
        if keyword in text:
            text = text.split(keyword)[0]

    return text.strip()