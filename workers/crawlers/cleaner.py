from __future__ import annotations

import re
from typing import Any

WHITESPACE_RE = re.compile(r"[ \t]+")
MULTI_NEWLINE_RE = re.compile(r"\n{3,}")


def normalize_text(s: str) -> str:
    if not s:
        return ""
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = WHITESPACE_RE.sub(" ", s)
    s = MULTI_NEWLINE_RE.sub("\n\n", s)
    return s.strip()


def remove_title_echo(body: str, title: str) -> str:
    """
    body 첫 줄이 title과 같은 경우 제거
    """
    if not body:
        return ""
    lines = body.splitlines()
    if not lines:
        return body

    first = lines[0].strip()
    t = (title or "").strip()

    if t and (first == t or first.replace(" ", "") == t.replace(" ", "")):
        return "\n".join(lines[1:]).lstrip()

    return body


def split_lines(text: str) -> list[str]:
    return [line.strip() for line in text.split("\n") if line.strip()]


def is_noise_line(line: str) -> bool:
    text = line.strip()
    if not text:
        return True

    lowered = text.lower()

    exact_noise = {
        "이전글",
        "다음글",
        "목록",
        "프린트",
        "인쇄",
        "국제교류팀",
        "작성일",
        "조회수",
    }
    if text in exact_noise:
        return True

    contains_noise = [
        "등록일",
        "수정일",
        "콘텐츠 담당",
        "담당부서",
        "저작권",
        "copyright",
        "본문 바로가기",
        "주메뉴 바로가기",
    ]
    if any(keyword.lower() in lowered for keyword in contains_noise):
        return True

    # 숫자만 있는 줄 (조회수 값, 단독 날짜 조각 등)
    if re.fullmatch(r"\d+", text):
        return True

    # 날짜만 단독으로 있는 줄
    if re.fullmatch(r"20\d{2}[./-]\d{1,2}[./-]\d{1,2}", text):
        return True

    # 게시판 번호처럼 보이는 줄
    if re.fullmatch(r"[\[\(]?\d+[\]\)]?[.]?", text):
        return True

    # 첨부파일명 라인 제거
    if re.search(r"\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|zip|jpg|png)$", lowered):
        return True

    return False


def remove_noise_lines(lines: list[str]) -> list[str]:
    return [line for line in lines if not is_noise_line(line)]


def extract_links(lines: list[str]) -> list[str]:
    url_pattern = re.compile(r"(https?://[^\s]+)")
    links: list[str] = []

    for line in lines:
        found = url_pattern.findall(line)
        if found:
            links.extend(found)

    return list(dict.fromkeys(links))


def extract_contacts(lines: list[str]) -> list[str]:
    phone_pattern = re.compile(r"\b\d{2,4}-\d{3,4}-\d{4}\b")
    email_pattern = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b")

    contacts: list[str] = []

    for line in lines:
        if phone_pattern.search(line) or email_pattern.search(line):
            contacts.append(line)

    return list(dict.fromkeys(contacts))


def extract_period_texts(lines: list[str]) -> list[str]:
    """
    deadline 추출 후보가 되는 줄만 엄격하게 추림
    """

    results: list[str] = []

    keyword_pattern = re.compile(r"(기간|일정|마감|기한|접수|신청|등록|제출)")
    strong_keyword_pattern = re.compile(
        r"(신청기간|접수기간|제출기간|등록기간|마감일|마감\s*기한|접수\s*기한|신청\s*기한)"
    )

    date_like_pattern = re.compile(
        r"(20\d{2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{1,2}"   # 2026.02.06
        r"|\d{1,2}\s*[./]\s*\d{1,2}"                      # 3/6, 3.20
        r"|[~∼]"                                          # ~, ∼
        r"|\d{1,2}\s*월\s*\d{1,2}\s*일)"                  # 3월 6일
    )

    useless_exact = {
        "제출",
        "접수",
        "신청",
        "완료",
        "기한 엄수",
        "*기한 엄수",
    }

    for line in lines:
        text = line.strip()
        if not text:
            continue

        if text in useless_exact:
            continue

        if len(text) < 6:
            continue

        has_keyword = bool(keyword_pattern.search(text))
        has_strong_keyword = bool(strong_keyword_pattern.search(text))
        has_date_like = bool(date_like_pattern.search(text))

        # 날짜 없는 줄은 탈락
        if not has_date_like:
            continue

        # 강한 키워드 + 날짜
        if has_strong_keyword and has_date_like:
            results.append(text)
            continue

        # 일반 키워드 + 날짜
        if has_keyword and has_date_like:
            results.append(text)
            continue

        # 날짜 범위만 있는 줄
        if "~" in text or "∼" in text:
            results.append(text)
            continue

    return list(dict.fromkeys(results))


def build_clean_body(lines: list[str]) -> str:
    return "\n".join(lines).strip()


def clean_notice_body(body: str, title: str = "") -> dict[str, Any]:
    # 1. 원문 정리
    raw_body = normalize_text(body)

    # 2. 제목 반복 제거
    text = remove_title_echo(raw_body, title)

    # 3. 줄 단위 분리
    lines = split_lines(text)

    # 4. 게시판/UI 잡정보 제거
    lines = remove_noise_lines(lines)

    # 5. 메타 추출
    links = extract_links(lines)
    contacts = extract_contacts(lines)
    period_texts = extract_period_texts(lines)

    # 6. 클린 본문 생성
    clean_body = build_clean_body(lines)

    return {
        "raw_body": raw_body,
        "clean_body": clean_body,
        "meta": {
            "links": links,
            "contacts": contacts,
            "period_texts": period_texts,
        },
    }