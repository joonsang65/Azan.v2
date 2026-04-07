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


def extract_contacts(text: str) -> list[str]:
    return sorted(set(re.findall(r"\d{2,4}-\d{3,4}-\d{4}", text)))


def extract_period_texts(text: str) -> list[str]:
    keywords = ["기간", "기한", "마감", "접수", "신청", "제출", "시험일", "발표", "까지"]
    lines = text.split("\n")
    return [normalize_text(line) for line in lines if any(keyword in line for keyword in keywords)]


def extract_links(content_tag) -> list[str]:
    if content_tag is None:
        return []

    links: list[str] = []
    for a in content_tag.select("a[href]"):
        href = a.get("href", "").strip()
        if not href:
            continue
        links.append(urljoin(BASE_URL, href))

    return sorted(set(links))


def parse_topik_notice_detail(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.select_one(".view_title .title")
    title = normalize_text(title_tag.get_text()) if title_tag else ""

    date_wrap = soup.select_one(".view_title .date")
    published_at = normalize_text(date_wrap.get_text()) if date_wrap else ""
    published_at = published_at.replace("작성일 :", "").strip()

    content_tag = soup.select_one(".view_content")
    raw_body = content_tag.get_text("\n", strip=True) if content_tag else ""
    body = normalize_text(raw_body)

    attachments = []
    for a in soup.select(".file_add dd a[href]"):
        name = normalize_text(a.get_text()).replace("다운로드", "").strip()
        href = a.get("href", "").strip()
        if not href:
            continue
        url = urljoin(BASE_URL, href)
        attachments.append({"name": name, "url": url})

    return {
        "title": title,
        "published_at": published_at,
        "raw_body": raw_body,
        "body": body,
        "meta": {
            "attachments": attachments,
            "contacts": extract_contacts(body),
            "period_texts": extract_period_texts(body),
            "links": extract_links(content_tag),
        },
    }