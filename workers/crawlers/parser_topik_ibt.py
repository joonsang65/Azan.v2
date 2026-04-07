from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

from .config import DATA_DIR, now_kst_iso


def read_local_html(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")

# IBT 탭 URL
TOPIK_IBT_INTRO_URL = "https://www.topik.go.kr/HMENU0/HMENU00595.do"

# 시험 일정 탭은 나중에 HTML 받으면 구현
TOPIK_IBT_STRUCTURE_URL = "https://www.topik.go.kr/HMENU0/HMENU00596.do"
TOPIK_IBT_GRADE_SYSTEM_URL = "https://www.topik.go.kr/HMENU0/HMENU00597.do"
TOPIK_IBT_SCHEDULE_URL = "https://www.topik.go.kr/HMENU0/HMENU00598.do"


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    return text.strip()


def normalize_time(text: str) -> str | None:
    """
    '08:30부터' -> '08:30'
    '9:30' -> '9:30'
    """
    if not text:
        return None
    m = re.search(r"\b(\d{1,2}:\d{2})\b", text)
    return m.group(1) if m else None


def get_content_root(soup: BeautifulSoup):
    selectors = [
        "div.body.sub_body div.inner",
        "div.body.sub_body",
        "div#container div.body.sub_body div.inner",
        "div#container div.inner",
        "div.inner",
    ]

    for selector in selectors:
        root = soup.select_one(selector)
        if root is not None:
            return root

    # 로컬 HTML 조각인 경우 전체 soup를 그대로 반환
    return soup


def collect_section_blocks(root: Tag) -> dict[str, list[Tag]]:
    """
    h3_title 기준으로 섹션 분리
    """
    blocks: dict[str, list[Tag]] = {}

    for sub in root.select("div.sub_content"):
        children = [child for child in sub.children if isinstance(child, Tag)]
        current_title: str | None = None
        current_nodes: list[Tag] = []

        for child in children:
            if child.name == "h3" and "h3_title" in (child.get("class") or []):
                if current_title:
                    blocks[current_title] = current_nodes
                current_title = normalize_text(child.get_text(" ", strip=True))
                current_nodes = []
            else:
                if current_title:
                    current_nodes.append(child)

        if current_title:
            blocks[current_title] = current_nodes

    return blocks


def parse_ul_list(nodes: list[Tag]) -> list[str]:
    results: list[str] = []
    for node in nodes:
        if node.name == "ul" and "ul_list_dot" in (node.get("class") or []):
            for li in node.select("li"):
                text = normalize_text(li.get_text(" ", strip=True))
                if text:
                    results.append(text)
            break
    return results


def parse_comment_list(nodes: list[Tag]) -> list[str]:
    results: list[str] = []
    for node in nodes:
        if node.name == "div" and "comment" in (node.get("class") or []):
            for li in node.select("li"):
                text = normalize_text(li.get_text(" ", strip=True))
                if text:
                    results.append(text)
    return results


def find_first_table(nodes: list[Tag]) -> Tag | None:
    for node in nodes:
        if node.name == "table":
            return node
        table = node.select_one("table")
        if table is not None:
            return table
    return None


def parse_ibt_effect_section(nodes: list[Tag]) -> dict[str, Any]:
    설명문 = parse_ul_list(nodes)

    return {
        "섹션명": "시험 효력",
        "설명문": 설명문,
    }


def parse_ibt_schedule_section(nodes: list[Tag]) -> dict[str, Any]:
    table = find_first_table(nodes)
    주석 = parse_comment_list(nodes)

    시간표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션명": "시험 시간표",
            "시간표": [],
            "주석": 주석,
        }

    rows = table.select("tbody tr")
    for tr in rows:
        cells = [normalize_text(cell.get_text(" ", strip=True)) for cell in tr.find_all(["th", "td"])]

        if len(cells) != 7:
            continue

        시간표.append(
            {
                "시험구분": cells[0],
                "영역": cells[1],
                "입실시작시간": normalize_time(cells[2]),
                "입실완료시간": normalize_time(cells[3]),
                "시험시작": normalize_time(cells[4]),
                "시험종료": normalize_time(cells[5]),
                "시험시간분": int(re.sub(r"[^\d]", "", cells[6])) if re.search(r"\d", cells[6]) else None,
            }
        )

    return {
        "섹션명": "시험 시간표",
        "시간표": 시간표,
        "주석": 주석,
    }


def parse_ibt_method_section(nodes: list[Tag]) -> dict[str, Any]:
    설명문 = parse_ul_list(nodes)
    주석 = parse_comment_list(nodes)

    return {
        "섹션명": "시험방법",
        "설명문": 설명문,
        "주석": 주석,
    }


def parse_ibt_fee_section(nodes: list[Tag]) -> dict[str, Any]:
    설명문 = parse_ul_list(nodes)
    응시료표: list[dict[str, Any]] = []

    joined_text = " ".join(설명문)

    patterns = [
        ("토픽ⅠIBT", r"토픽[ⅠI]IBT\s*([\d,]+)원"),
        ("토픽ⅡIBT", r"토픽[ⅡII]IBT\s*([\d,]+)원"),
    ]

    for 시험구분, pattern in patterns:
        m = re.search(pattern, joined_text)
        if m:
            금액텍스트 = m.group(1)
            응시료표.append(
                {
                    "시험구분": 시험구분,
                    "응시료원": int(re.sub(r"[^\d]", "", 금액텍스트)),
                }
            )

    return {
        "섹션명": "응시료(한국기준)",
        "설명문": 설명문,
        "응시료표": 응시료표,
    }


def parse_ibt_intro(soup: BeautifulSoup) -> dict[str, Any]:
    root = get_content_root(soup)
    section_blocks = collect_section_blocks(root)

    effect_nodes = section_blocks.get("시험 효력", [])
    schedule_nodes = section_blocks.get("시험 시간표", [])
    method_nodes = section_blocks.get("시험방법", [])
    fee_nodes = section_blocks.get("응시료(한국기준)", [])

    return {
        "섹션들": [
            parse_ibt_effect_section(effect_nodes),
            parse_ibt_schedule_section(schedule_nodes),
            parse_ibt_method_section(method_nodes),
            parse_ibt_fee_section(fee_nodes),
        ]
    }

def parse_ibt_question_structure(soup: BeautifulSoup) -> dict[str, Any]:
    root = get_content_root(soup)
    section_blocks = collect_section_blocks(root)

    structure_nodes = section_blocks.get("시험 수준별 구성", [])
    table = find_first_table(structure_nodes)
    주석 = parse_comment_list(structure_nodes)

    구성표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션들": [
                {
                    "섹션명": "시험 수준별 구성",
                    "구성표": [],
                    "주석": 주석,
                }
            ]
        }

    rows = table.select("tbody tr")

    for tr in rows:
        cells = [normalize_text(cell.get_text(" ", strip=True)) for cell in tr.find_all(["th", "td"])]

        if not cells:
            continue

        구분 = cells[0]

        if 구분 == "총 점":
            구성표.append(
                {
                    "구분": 구분,
                    "TOPIK IBT I": cells[1] if len(cells) > 1 else None,
                    "TOPIK IBT II": cells[2] if len(cells) > 2 else None,
                }
            )
        else:
            구성표.append(
                {
                    "구분": 구분,
                    "TOPIK IBT I": {
                        "듣기": cells[1] if len(cells) > 1 else None,
                        "읽기": cells[2] if len(cells) > 2 else None,
                    },
                    "TOPIK IBT II": {
                        "듣기": cells[3] if len(cells) > 3 else None,
                        "읽기": cells[4] if len(cells) > 4 else None,
                        "쓰기": cells[5] if len(cells) > 5 else None,
                    },
                }
            )

    return {
        "섹션들": [
            {
                "섹션명": "시험 수준별 구성",
                "구성표": 구성표,
                "주석": 주석,
            }
        ]
    }

def parse_ibt_grade_system(soup: BeautifulSoup) -> dict[str, Any]:
    root = get_content_root(soup)
    section_blocks = collect_section_blocks(root)

    grade_nodes = section_blocks.get("등급 체계", [])
    table = find_first_table(grade_nodes)
    주석 = parse_comment_list(grade_nodes)

    등급표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션들": [
                {
                    "섹션명": "등급 체계",
                    "등급표": [],
                    "주석": 주석,
                }
            ]
        }

    thead_rows = table.select("thead tr")
    tbody_rows = table.select("tbody tr")

    if len(thead_rows) >= 2 and len(tbody_rows) >= 1:
        grade_headers = [
            normalize_text(th.get_text(" ", strip=True))
            for th in thead_rows[1].find_all("th")
        ]

        body_cells = tbody_rows[0].find_all(["th", "td"])
        score_cells = [normalize_text(cell.get_text(" ", strip=True)) for cell in body_cells[1:]]

        exam_tracks = ["토픽 I", "토픽 I", "토픽 II", "토픽 II", "토픽 II", "토픽 II"]

        for 시험수준, 등급, 점수텍스트 in zip(exam_tracks, grade_headers, score_cells):
            nums = re.findall(r"\d+", 점수텍스트)
            최소점수 = int(nums[0]) if len(nums) >= 1 else None
            최대점수 = int(nums[1]) if len(nums) >= 2 else None

            등급표.append(
                {
                    "시험수준": 시험수준,
                    "등급": 등급,
                    "최소점수": 최소점수,
                    "최대점수": 최대점수,
                }
            )

    return {
        "섹션들": [
            {
                "섹션명": "등급 체계",
                "등급표": 등급표,
                "주석": 주석,
            }
        ]
    }

def parse_ibt_schedule_tab(soup: BeautifulSoup) -> dict[str, Any]:
    root = get_content_root(soup)
    sub_contents = root.select("div.sub_content")

    섹션들: list[dict[str, Any]] = []

    for sub in sub_contents:
        title_tag = sub.select_one("h3.h3_title")
        table = sub.select_one("table.basic_table")

        if title_tag is None:
            continue

        섹션명 = normalize_text(title_tag.get_text(" ", strip=True))
        주석 = [
            normalize_text(li.get_text(" ", strip=True))
            for li in sub.select("div.comment li")
            if normalize_text(li.get_text(" ", strip=True))
        ]

        일정표: list[dict[str, str]] = []

        if table is not None:
            rows = table.select("tbody tr")

            for tr in rows:
                cells = [
                    normalize_text(cell.get_text(" ", strip=True))
                    for cell in tr.find_all(["th", "td"])
                ]

                if len(cells) != 4:
                    continue

                일정표.append(
                    {
                        "구분": cells[0],
                        "시험일": cells[1],
                        "접수일정": cells[2],
                        "성적발표": cells[3],
                    }
                )

        섹션들.append(
            {
                "섹션명": 섹션명,
                "일정표": 일정표,
                "주석": 주석,
            }
        )

    return {"섹션들": 섹션들}

def build_output(
    시험유형: str,
    출처URL: str,
    탭들: dict[str, Any],
) -> dict[str, Any]:
    return {
        "페이지메타": {
            "시험유형": 시험유형,
            "페이지제목": "시험별 안내",
            "출처URL": 출처URL,
            "수집시각": now_kst_iso(),
        },
        "탭들": 탭들,
    }


def save_json(data: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8-sig") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def crawl_topik_ibt(output_filename: str = "topik_ibt.json") -> Path:
    intro_html = read_local_html("apps/worker/crawl/data/ibt_intro.html")
    intro_soup = BeautifulSoup(intro_html, "lxml")
    시험소개 = parse_ibt_intro(intro_soup)

    structure_html = read_local_html("apps/worker/crawl/data/ibt_structure.html")
    structure_soup = BeautifulSoup(structure_html, "lxml")
    문항구성 = parse_ibt_question_structure(structure_soup)

    grade_html = read_local_html("apps/worker/crawl/data/ibt_grade_system.html")
    grade_soup = BeautifulSoup(grade_html, "lxml")
    등급체계 = parse_ibt_grade_system(grade_soup)

    schedule_html = read_local_html("apps/worker/crawl/data/ibt_schedule.html")
    schedule_soup = BeautifulSoup(schedule_html, "lxml")
    시험일정 = parse_ibt_schedule_tab(schedule_soup)

    output = build_output(
        시험유형="IBT",
        출처URL="local_file",
        탭들={
            "시험 소개": 시험소개,
            "문항 구성": 문항구성,
            "등급 체계": 등급체계,
            "시험 일정": 시험일정,
        },
    )

    output_path = DATA_DIR / output_filename
    save_json(output, output_path)
    return output_path


if __name__ == "__main__":
    path = crawl_topik_ibt()
    print(f"TOPIK IBT JSON saved: {path}")