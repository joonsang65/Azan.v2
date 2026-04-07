import re
from urllib.parse import urlparse, parse_qs

DATE_PATTERN = re.compile(r"(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})")
DEADLINE_PATTERN = re.compile(
    r"(?:마감|까지|deadline|due)\s*[:：]?\s*"
    r"(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[.\-/]\d{1,2})",
    re.IGNORECASE
)

TAG_PATTERN = re.compile(r"^\s*\[([^\]]{1,30})\]\s*")

def extract_article_no(url: str) -> str | None:
    try:
        qs = parse_qs(urlparse(url).query)
        # 아주대 게시판에서 흔한 파라미터
        for key in ("articleNo", "article_no", "no", "id"):
            if key in qs and qs[key]:
                return str(qs[key][0])
    except Exception:
        return None
    return None

def extract_first_date(text: str) -> str | None:
    """
    텍스트에서 가장 먼저 나오는 날짜를 YYYY-MM-DD로 정규화해서 반환
    """
    if not text:
        return None
    m = DATE_PATTERN.search(text)
    if not m:
        return None
    y, mo, d = m.group(1), int(m.group(2)), int(m.group(3))
    return f"{y}-{mo:02d}-{d:02d}"

def extract_tag_from_text(text: str) -> tuple[str | None, str]:
    """
    첫 줄 [TAG] 형태를 notice_tag로 분리하고, 본문에서는 제거
    """
    if not text:
        return None, ""
    lines = text.splitlines()
    if not lines:
        return None, text

    first = lines[0]
    m = TAG_PATTERN.match(first)
    if not m:
        return None, text

    tag = m.group(1).strip()
    rest = "\n".join(lines[1:]).lstrip()
    return tag, rest

def extract_deadline(text: str) -> tuple[str | None, str | None]:
    """
    간단한 규칙 기반 deadline 추출.
    - YYYY-MM-DD 또는 MM-DD 형태를 찾고, YYYY가 없으면 None 처리(확장 가능)
    반환: (deadline_at, deadline_text)
    """
    if not text:
        return None, None

    m = DEADLINE_PATTERN.search(text)
    if not m:
        return None, None

    raw = m.group(1)
    # YYYY 포함하면 정규화해서 저장
    d = extract_first_date(raw)
    if d and len(d) == 10:
        return d, raw
    # 연도 없는 표현은 텍스트만 남기고 deadline_at은 비워둠(오탐 방지)
    return None, raw

import re
from typing import Optional, Tuple

# 라벨 기반 날짜 (작성일/게시일/등록일 등)
PUBLISHED_LABEL_RE = re.compile(
    r"(작성일|게시일|등록일|업로드일|Date)\s*[:：]?\s*"
    r"(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})",
    re.IGNORECASE
)

# 마감/까지/신청기간/기간 등에서 날짜
DEADLINE_LABEL_RE = re.compile(
    r"(마감|까지|deadline|due|신청\s*마감)\s*[:：]?\s*"
    r"(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})",
    re.IGNORECASE
)

# 기간: 2026-02-20 ~ 2026-03-01
RANGE_RE = re.compile(
    r"(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*(?:~|～|-|to)\s*"
    r"(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})",
    re.IGNORECASE
)

def _norm_date(s: str) -> str:
    return s.replace(".", "-").replace("/", "-")

def extract_dates_from_body_summary(text: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    body(요약 포함)에서 날짜를 최대한 뽑는다.
    반환:
      published_raw, deadline_at, inferred_first_date, deadline_text
    """
    if not text:
        return None, None, None, None

    published_raw = None
    deadline_at = None
    deadline_text = None

    m = PUBLISHED_LABEL_RE.search(text)
    if m:
        published_raw = _norm_date(m.group(2))

    # 마감 라벨
    m = DEADLINE_LABEL_RE.search(text)
    if m:
        deadline_at = _norm_date(m.group(2))
        deadline_text = m.group(0)

    # 기간(끝 날짜를 deadline으로 간주)
    m = RANGE_RE.search(text)
    if m:
        # end가 deadline로 더 강한 신호
        end = _norm_date(m.group(2))
        deadline_at = deadline_at or end
        deadline_text = deadline_text or m.group(0)

    # 라벨 없이 그냥 등장하는 첫 날짜(기존 extract_first_date 활용 가능)
    inferred = extract_first_date(text)  # 너희 코드에 이미 있음

    return published_raw, deadline_at, inferred, deadline_text
