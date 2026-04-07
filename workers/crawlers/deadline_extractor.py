from __future__ import annotations

import re
from typing import Any

FULL_DATE_RE = re.compile(r"(20\d{2})[./-](\d{1,2})[./-](\d{1,2})")

SHORT_DATE_RE = re.compile(
    r"(?<![\d.])(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])(?![.\d])"
)

FULL_RANGE_RE = re.compile(
    r"(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\s*[~∼-]\s*"
    r"(20\d{2})[./-](\d{1,2})[./-](\d{1,2})"
)

SHORT_RANGE_RE = re.compile(
    r"(?<![\d.])(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])\s*[~∼-]\s*"
    r"(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])(?![.\d])"
)

SHORT_DEADLINE_ONLY_RE = re.compile(
    r"[~∼]\s*(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])(?![.\d])"
)

PARTIAL_RANGE_RE = re.compile(
    r"(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\s*[~∼-]\s*"
    r"(\d{1,2})[./-](\d{1,2})"
)

def norm_date(year: int, month: int, day: int) -> str:
    return f"{year:04d}-{month:02d}-{day:02d}"


def guess_year_from_text(text: str, default_year: int = 2026) -> int:
    m = re.search(r"(20\d{2})", text)
    if m:
        return int(m.group(1))
    return default_year


def normalize_deadline_text(text: str) -> str:
    if not text:
        return ""

    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\([월화수목금토일]\)", "", text)
    text = re.sub(r"(\d{1,2})\.(?=\s*[~∼)\-]|$)", r"\1", text)
    text = text.replace("(", " ").replace(")", " ")
    text = text.replace("년", ".").replace("월", ".").replace("일", "")
    text = re.sub(r"\b\d{1,2}:\d{2}\s*(AM|PM)?\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def has_deadline_context(text: str) -> bool:
    return bool(re.search(
        r"(기간|일정|마감|기한|접수|신청|등록|제출|까지|모집)",
        text
    ))


def looks_like_version_or_update(text: str) -> bool:
    lowered = text.lower()

    if any(word in lowered for word in ["ver", "version", "업데이트", "update", "버전"]):
        return True

    if re.search(r"\b20?\d{2}\.\d{1,2}\s*(ver|version)?\.?", lowered):
        return True

    if re.search(r"\b\d{2}\.\d{1,2}월\s*업데이트", lowered):
        return True

    return False


def extract_deadline_from_one_text(
    text: str,
    default_year: int = 2026,
    allow_short_date: bool = True,
    require_context_for_short: bool = False,
) -> str | None:
    if not text:
        return None

    text = normalize_deadline_text(text)

    if looks_like_version_or_update(text):
        allow_short_date = False

    # 1) 연도 포함 범위
    m = FULL_RANGE_RE.search(text)
    if m:
        end_y = int(m.group(4))
        end_m = int(m.group(5))
        end_d = int(m.group(6))
        return norm_date(end_y, end_m, end_d)


    # 🔥 여기 추가 🔥
    # 1.5) 연도 + 짧은 종료일 (2026.03.30 ~ 04.07)
    m = PARTIAL_RANGE_RE.search(text)
    if m:
        year = int(m.group(1))
        end_m = int(m.group(4))
        end_d = int(m.group(5))
        return norm_date(year, end_m, end_d)


    # 2) 연도 없는 범위
    m = SHORT_RANGE_RE.search(text)
    if m:
        year = guess_year_from_text(text, default_year)
        end_m = int(m.group(3))
        end_d = int(m.group(4))
        return norm_date(year, end_m, end_d)

    # 3) ~3/6
    m = SHORT_DEADLINE_ONLY_RE.search(text)
    if m:
        year = guess_year_from_text(text, default_year)
        month = int(m.group(1))
        day = int(m.group(2))
        return norm_date(year, month, day)

    # 4) 연도 포함 날짜
    full_dates = FULL_DATE_RE.findall(text)
    if full_dates and has_deadline_context(text):
        y, mth, d = full_dates[-1]
        return norm_date(int(y), int(mth), int(d))

    # 5) 연도 없는 짧은 날짜
    if allow_short_date:
        if require_context_for_short and not has_deadline_context(text):
            return None

        short_dates = SHORT_DATE_RE.findall(text)
        if short_dates:
            year = guess_year_from_text(text, default_year)
            mth, d = short_dates[-1]
            return norm_date(year, int(mth), int(d))

    return None


def extract_deadline(payload: dict[str, Any]) -> str | None:
    title = payload.get("title", "") or ""
    raw_body = payload.get("raw_body", "") or ""
    clean_body = payload.get("clean_body", "") or ""
    meta = payload.get("meta", {}) or {}
    period_texts = meta.get("period_texts", []) or []

    base_year = guess_year_from_text(title or clean_body or raw_body, 2026)

    # 1) period_texts 우선
    for text in period_texts:
        deadline = extract_deadline_from_one_text(
            text,
            default_year=base_year,
            allow_short_date=True,
            require_context_for_short=True,
        )
        if deadline:
            return deadline

    # 2) 제목에서 명확한 범위/마감형만 허용
    deadline = extract_deadline_from_one_text(
        title,
        default_year=base_year,
        allow_short_date=False,
        require_context_for_short=True,
    )
    if deadline:
        return deadline

    # 3) period_texts가 없으면 본문 전체 fallback은 막기
    return None