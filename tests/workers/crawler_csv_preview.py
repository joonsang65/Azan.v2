"""
tests/workers/crawler_csv_preview.py — Ajou 공지 크롤러 프리뷰 스크립트.

목적:
  - DB 쓰기 없이 실제 크롤러 함수를 end-to-end 로 실행한다.
  - 크롤된 공지 데이터를 public.notices 스키마와 동일한 컬럼 구조의 CSV 로 저장한다.
  - 개발자가 실제 DB 삽입 전에 데이터 형태를 육안으로 확인할 수 있게 한다.

실행 방법 (리포지토리 루트에서):
  python tests/workers/crawler_csv_preview.py

동작 방식:
  crawler.db 의 DB 함수 세 개를 unittest.mock.patch 로 가로채 DB 연결을 방지한다:
    - crawler.db.get_connection  → MagicMock() 반환 (가짜 connection)
    - crawler.db.notice_exists   → 항상 False 반환 (모든 공지를 신규로 처리)
    - crawler.db.upsert_notice   → notice dict 를 수집하고 "inserted" 반환

  가로채기 덕분에 crawl_source() 의 모든 실제 로직
  (HTTP 요청, HTML 파싱, SHA-256 해시 계산, URL 생성)은 그대로 실행된다.
  오직 DB 접속·쓰기 부분만 mock 으로 대체된다.
"""

import csv
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

# ── sys.path 설정 ──────────────────────────────────────────────────────────────
# workers/ 를 경로에 추가해 `from crawler.xxx import ...` 가 동작하도록 한다.
# __file__ = tests/workers/crawler_csv_preview.py
# parents[2]  = 리포지토리 루트
sys.path.insert(0, str(Path(__file__).parents[2] / "workers"))

# ── 크롤러 모듈 임포트 ─────────────────────────────────────────────────────────
# sys.path 설정 이후에 임포트해야 crawler 패키지를 올바르게 찾을 수 있다.
try:
    from crawler.scraper import crawl_source
except ImportError as exc:
    print(f"ERROR: crawler.scraper 임포트 실패 — {exc}", file=sys.stderr)
    sys.exit(1)

# ── public.notices INSERT 컬럼 순서 ────────────────────────────────────────────
# db.py 의 INSERT 문과 완전히 동일한 순서로 정의한다.
# INSERT INTO public.notices (
#     id, notice_id, title, body, source, hash,
#     is_processed, deadline, url, published_at, created_at,
#     keyword_id, embedding, eng_body
# )
NOTICE_COLUMNS = [
    "id",
    "notice_id",
    "title",
    "body",
    "source",
    "hash",
    "is_processed",
    "deadline",
    "url",
    "published_at",
    "created_at",
    "keyword_id",
    "embedding",
    "eng_body",
]

# ── 크롤 시점 NULL 컬럼 설명 ───────────────────────────────────────────────────
# 하위 파이프라인이 채우는 컬럼 목록. 요약 출력에 사용된다.
NULL_COLUMN_NOTES = {
    "deadline":   "Gemini 파이프라인이 본문에서 마감일을 추출하여 채움",
    "keyword_id": "Gemini 파이프라인이 키워드를 분류하여 채움",
    "embedding":  "Gemini 임베딩 파이프라인이 벡터를 생성하여 채움",
    "eng_body":   "Gemini 번역 파이프라인이 영문 본문을 생성하여 채움",
}


def _load_sources() -> list[dict]:
    """
    workers/crawler/sources/sources.json 을 로드하고 파싱한다.

    main.py 와 동일한 경로 해석 로직을 사용한다:
      Path(__file__).parents[2] / "workers" / "crawler" / "sources" / "sources.json"

    Input:  없음
    Output: list[dict] — sources.json 배열의 각 항목
    Raises: SystemExit(1) — 파일이 없거나 JSON 형식이 잘못된 경우
    """
    sources_path = (
        Path(__file__).parents[2]
        / "workers"
        / "crawler"
        / "sources"
        / "sources.json"
    )

    if not sources_path.exists():
        print(f"ERROR: sources.json 을 찾을 수 없음 — {sources_path}", file=sys.stderr)
        sys.exit(1)

    try:
        sources = json.loads(sources_path.read_text(encoding="utf-8"))
        if not isinstance(sources, list) or len(sources) == 0:
            raise ValueError("sources.json 은 비어있지 않은 JSON 배열이어야 함")
        return sources
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: sources.json 형식 오류 — {exc}", file=sys.stderr)
        sys.exit(1)


def _build_csv_row(notice: dict) -> dict:
    """
    crawl_source() 내부에서 db.upsert_notice() 로 전달된 notice dict 를
    public.notices 스키마와 동일한 CSV 행으로 변환한다.

    크롤 시점에 NULL 인 컬럼(deadline, keyword_id, embedding, eng_body)은
    빈 문자열로 기록한다. DB 에서는 이 컬럼들이 하위 파이프라인에 의해 채워진다.

    Input:
        notice (dict) — crawl_source() 가 db.upsert_notice() 에 넘기는 dict.
                        키: notice_id, title, body, source, hash, url, published_at

    Output:
        dict — NOTICE_COLUMNS 의 모든 키를 포함하는 CSV 행 dict
    """
    published_at = notice.get("published_at")
    if isinstance(published_at, datetime):
        published_at_str = published_at.isoformat()
    elif published_at is not None:
        published_at_str = str(published_at)
    else:
        published_at_str = ""

    return {
        "id":           str(uuid.uuid4()),         # gen_random_uuid() 시뮬레이션
        "notice_id":    notice.get("notice_id", ""),
        "title":        notice.get("title", ""),
        "body":         notice.get("body") or "",  # None → 빈 문자열
        "source":       notice.get("source", ""),
        "hash":         notice.get("hash", ""),
        "is_processed": False,
        "deadline":     "",                        # Gemini 파이프라인이 채움
        "url":          notice.get("url", ""),
        "published_at": published_at_str,
        "created_at":   datetime.now(timezone.utc).isoformat(),  # NOW() 시뮬레이션
        "keyword_id":   "",                        # Gemini 파이프라인이 채움
        "embedding":    "",                        # Gemini 임베딩 파이프라인이 채움
        "eng_body":     "",                        # Gemini 번역 파이프라인이 채움
    }


def _run_preview() -> None:
    """
    크롤러를 DB 없이 end-to-end 로 실행하고 결과를 CSV 로 저장한다.

    실행 흐름:
      1. sources.json 로드
      2. 출력 디렉터리(tests/workers/output/) 생성
      3. crawler.db 의 DB 함수 세 개를 patch 로 가로챔
      4. 각 소스에 대해 crawl_source(source_config) 호출
         → 내부에서 db.upsert_notice() 가 호출될 때 _mock_upsert_notice 가 실행됨
         → notice dict 를 수집해 CSV 행으로 변환
      5. 수집된 모든 행을 CSV 로 저장
      6. 결과 요약 출력

    Input:  없음
    Output: 없음 (부수 효과: CSV 파일 생성, stdout 출력)
    """
    sources = _load_sources()

    # ── 출력 디렉터리 준비 ─────────────────────────────────────────────────────
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = output_dir / f"crawler_preview_{timestamp}.csv"

    all_rows: list[dict] = []
    per_source_counts: dict[str, int] = {}

    # ── mock upsert_notice: notice dict 를 가로채 CSV 행으로 변환·수집 ─────────
    # crawl_source() 가 db.upsert_notice(conn, notice) 를 호출할 때마다 실행된다.
    # conn 은 mock get_connection() 이 반환한 MagicMock 이므로 사용하지 않는다.
    def _mock_upsert_notice(conn, notice: dict) -> str:
        all_rows.append(_build_csv_row(notice))

        # 수집 즉시 실시간 출력 (flush=True 로 버퍼링 없이 즉각 표시)
        idx = len(all_rows)
        notice_id = notice.get("notice_id", "?")
        title = notice.get("title", "")
        title_preview = title[:40] + "..." if len(title) > 40 else title
        published_at = notice.get("published_at")
        date_str = published_at.strftime("%Y-%m-%d") if published_at else "날짜없음"
        source = notice.get("source", "")
        print(f"  [{idx:>3}] {date_str} | {notice_id:>7} | [{source}] {title_preview}", flush=True)

        return "inserted"

    # ── patch 적용 범위 ────────────────────────────────────────────────────────
    # scraper.py 가 `from . import db` 로 crawler.db 모듈을 참조하므로
    # crawler.db 위에 직접 patch 를 걸면 scraper 내부 호출까지 모두 가로챌 수 있다.
    with (
        patch("crawler.db.get_connection", return_value=MagicMock()),
        patch("crawler.db.notice_exists", return_value=False),
        patch("crawler.db.upsert_notice", side_effect=_mock_upsert_notice),
    ):
        for source_config in sources:
            label = source_config.get("source_label", "<unknown>")
            before = len(all_rows)
            print(f"[{label}] 크롤 시작...")

            try:
                crawl_source(source_config)
            except Exception as exc:
                print(
                    f"ERROR: [{label}] crawl_source() 실패 — {exc}",
                    file=sys.stderr,
                )
                continue

            count = len(all_rows) - before
            per_source_counts[label] = count
            print(f"[{label}] 수집 완료: {count}건")

    # ── CSV 저장 ───────────────────────────────────────────────────────────────
    # utf-8-sig 인코딩으로 저장해 Excel 에서 한글이 깨지지 않도록 한다.
    try:
        with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=NOTICE_COLUMNS)
            writer.writeheader()
            writer.writerows(all_rows)
    except OSError as exc:
        print(f"ERROR: CSV 저장 실패 — {exc}", file=sys.stderr)
        sys.exit(1)

    # ── 결과 요약 출력 ─────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print(f"출력 파일  : {output_path}")
    print(f"총 행 수   : {len(all_rows)}")
    print()
    print("[소스별 수집 건수]")
    for label, count in per_source_counts.items():
        print(f"  {label}: {count}건")
    print()
    print("[크롤 시점 NULL 컬럼 — 하위 파이프라인이 채움]")
    for col, note in NULL_COLUMN_NOTES.items():
        print(f"  {col:12s} : {note}")
    print("=" * 60)


if __name__ == "__main__":
    _run_preview()
