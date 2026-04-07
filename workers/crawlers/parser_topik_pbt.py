from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

from .config import DATA_DIR, now_kst_iso
from .http_client import fetch_html


TOPIK_PBT_URL = "https://www.topik.go.kr/HMENU0/HMENU00016.do"
TOPIK_PBT_STRUCTURE_URL = "https://www.topik.go.kr/HMENU0/HMENU00017.do" 
TOPIK_PBT_EVALUATION_URL = "https://www.topik.go.kr/HMENU0/HMENU00018.do"
TOPIK_PBT_NOTICE_URL = "https://www.topik.go.kr/TWGUID/TWGUID0210.do"
TOPIK_PBT_ANSWER_GUIDE_URL = "https://www.topik.go.kr/TWGUID/TWGUID0220.do" 

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    return text.strip()


def normalize_time(text: str) -> str | None:
    """
    '09:20 까지' -> '09:20'
    """
    if not text:
        return None
    m = re.search(r"\b(\d{1,2}:\d{2})\b", text)
    return m.group(1) if m else None


def parse_score_range(text: str) -> tuple[int | None, int | None]:
    """
    '80 ~ 139' -> (80, 139)
    """
    if not text:
        return None, None
    nums = re.findall(r"\d+", text)
    if len(nums) >= 2:
        return int(nums[0]), int(nums[1])
    return None, None


def extract_fee_number(text: str) -> int | None:
    """
    '40,000원' -> 40000
    """
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None


def get_content_root(soup: BeautifulSoup) -> Tag:
    """
    본문 루트 찾기
    """
    root = soup.select_one("div.body.sub_body div.inner")
    if root is None:
        raise RuntimeError("TOPIK 본문 루트를 찾지 못했습니다.")
    return root


def collect_section_blocks(root: Tag) -> dict[str, list[Tag]]:
    """
    h3_title 기준으로 섹션을 나눈다.
    한 sub_content 안에 여러 h3가 있을 수 있으므로 sibling 단위로 분리.
    반환:
      {
        "시험 수준 및 등급": [Tag, Tag, ...],
        "시험 시간표": [Tag, Tag, ...],
        "응시료(한국기준)": [Tag, Tag, ...]
      }
    """
    blocks: dict[str, list[Tag]] = {}

    for sub in root.select("div.sub_content"):
        children = [child for child in sub.children if isinstance(child, Tag)]
        current_title: str | None = None
        current_nodes: list[Tag] = []

        for child in children:
            if child.name == "h3" and "h3_title" in (child.get("class") or []):
                # 이전 섹션 저장
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
    """
    ul.ul_list_dot 안의 설명문 추출
    """
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
    """
    div.comment 안의 주석 추출
    """
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


def parse_grade_section(nodes: list[Tag]) -> dict[str, Any]:
    """
    시험 수준 및 등급
    """
    설명문 = parse_ul_list(nodes)
    주석 = parse_comment_list(nodes)
    table = find_first_table(nodes)

    if table is None:
        return {
            "섹션명": "시험 수준 및 등급",
            "설명문": 설명문,
            "등급표": [],
            "주석": 주석,
        }

    # 헤더: 토픽 I / 토픽 II
    thead_rows = table.select("thead tr")
    tbody_rows = table.select("tbody tr")

    등급표: list[dict[str, Any]] = []

    if len(thead_rows) >= 2 and len(tbody_rows) >= 1:
        # 두 번째 헤더행: 1급 2급 3급 4급 5급 6급
        grade_headers = [
            normalize_text(th.get_text(" ", strip=True))
            for th in thead_rows[1].find_all("th")
        ]

        # 첫 번째 바디행: 첫 칸은 '등급 결정', 나머지가 점수
        body_cells = tbody_rows[0].find_all(["th", "td"])
        score_cells = [normalize_text(cell.get_text(" ", strip=True)) for cell in body_cells[1:]]

        # 현재 HTML 기준 매핑
        exam_tracks = ["토픽 I", "토픽 I", "토픽 II", "토픽 II", "토픽 II", "토픽 II"]

        for 시험수준, 등급, 점수텍스트 in zip(exam_tracks, grade_headers, score_cells):
            최소점수, 최대점수 = parse_score_range(점수텍스트)
            등급표.append(
                {
                    "시험수준": 시험수준,
                    "등급": 등급,
                    "최소점수": 최소점수,
                    "최대점수": 최대점수,
                }
            )

    return {
        "섹션명": "시험 수준 및 등급",
        "설명문": 설명문,
        "등급표": 등급표,
        "주석": 주석,
    }


def parse_schedule_section(nodes: list[Tag]) -> dict[str, Any]:
    """
    시험 시간표
    """
    설명문 = parse_ul_list(nodes)
    주석 = parse_comment_list(nodes)
    table = find_first_table(nodes)

    시간표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션명": "시험 시간표",
            "설명문": 설명문,
            "시간표": 시간표,
            "주석": 주석,
        }

    rows = table.select("tbody tr")
    현재시험수준: str | None = None

    for tr in rows:
        cells = [normalize_text(cell.get_text(" ", strip=True)) for cell in tr.find_all(["th", "td"])]

        # 현재 HTML 기준:
        # 첫 행(토픽 I): [토픽 I, 1교시, 듣기, 읽기, 09:20 까지, 10:00, 11:40, 100]처럼
        # 실제로는 "듣기, 읽기"가 한 칸이므로 총 7칸 혹은 6칸이 나올 수 있음
        if len(cells) == 7:
            현재시험수준 = cells[0]
            교시 = cells[1]
            영역 = cells[2]
            입실완료시간 = cells[3]
            시작시간 = cells[4]
            종료시간 = cells[5]
            시험시간분 = cells[6]
        elif len(cells) == 6:
            # rowspan으로 시험수준이 빠진 줄
            교시 = cells[0]
            영역 = cells[1]
            입실완료시간 = cells[2]
            시작시간 = cells[3]
            종료시간 = cells[4]
            시험시간분 = cells[5]
        else:
            # 혹시 구조가 다르면 건너뜀
            continue

        시간숫자 = re.findall(r"\d+", 시험시간분)
        시간표.append(
            {
                "시험수준": 현재시험수준,
                "교시": 교시,
                "영역": 영역,
                "입실완료시간": normalize_time(입실완료시간),
                "시작시간": normalize_time(시작시간),
                "종료시간": normalize_time(종료시간),
                "시험시간분": int(시간숫자[0]) if 시간숫자 else None,
            }
        )

    return {
        "섹션명": "시험 시간표",
        "설명문": 설명문,
        "시간표": 시간표,
        "주석": 주석,
    }


def parse_fee_section(nodes: list[Tag]) -> dict[str, Any]:
    """
    응시료(한국기준)
    """
    설명문 = parse_ul_list(nodes)
    주석 = parse_comment_list(nodes)

    응시료표: list[dict[str, Any]] = []

    for node in nodes:
        if node.name == "ul" and "ul_list_dot" in (node.get("class") or []):
            for li in node.select("li"):
                text = normalize_text(li.get_text(" ", strip=True))
                if ":" not in text:
                    continue

                시험수준, 응시료텍스트 = text.split(":", 1)
                응시료원 = extract_fee_number(응시료텍스트)

                응시료표.append(
                    {
                        "시험수준": normalize_text(시험수준),
                        "응시료원": 응시료원,
                    }
                )
            break

    return {
        "섹션명": "응시료(한국기준)",
        "설명문": 설명문,
        "응시료표": 응시료표,
        "주석": 주석,
    }

def parse_level_composition_section(nodes: list[Tag]) -> dict[str, Any]:
    table = find_first_table(nodes)
    구성표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션명": "시험 수준별 구성",
            "구성표": [],
        }

    rows = table.select("tbody tr")
    현재시험수준: str | None = None
    현재교시: str | None = None
    현재총점: str | None = None

    for tr in rows:
        cells = [
            normalize_text(cell.get_text(" ", strip=True))
            for cell in tr.find_all(["th", "td"])
        ]

        # 1) 첫 줄: 시험수준, 교시, 영역, 문제유형, 문항수, 배점, 총점
        if len(cells) == 7:
            현재시험수준 = cells[0]
            현재교시 = cells[1]
            영역 = cells[2]
            문제유형 = cells[3]
            문항수 = cells[4]
            배점 = cells[5]
            현재총점 = cells[6]

            구성표.append(
                {
                    "시험수준": 현재시험수준,
                    "교시": 현재교시,
                    "영역": 영역,
                    "문제유형": 문제유형,
                    "문항수": int(re.sub(r"[^\d]", "", 문항수)) if re.search(r"\d", 문항수) else None,
                    "배점": int(re.sub(r"[^\d]", "", 배점)) if re.search(r"\d", 배점) else None,
                    "총점": int(re.sub(r"[^\d]", "", 현재총점)) if re.search(r"\d", 현재총점) else None,
                }
            )

        # 2) rowspan으로 시험수준/교시/총점이 빠진 줄 (예: 토픽 I 두 번째 줄)
        elif len(cells) == 5:
            영역 = cells[0]
            문제유형 = cells[1]
            문항수 = cells[2]
            배점 = cells[3]
            총점 = cells[4]

            구성표.append(
                {
                    "시험수준": 현재시험수준,
                    "교시": 현재교시,
                    "영역": 영역,
                    "문제유형": 문제유형,
                    "문항수": int(re.sub(r"[^\d]", "", 문항수)) if re.search(r"\d", 문항수) else None,
                    "배점": int(re.sub(r"[^\d]", "", 배점)) if re.search(r"\d", 배점) else None,
                    "총점": int(re.sub(r"[^\d]", "", 총점)) if re.search(r"\d", 총점) else None,
                }
            )

        # 3) 시험수준은 빠지고, 교시부터 시작하는 줄 (예: 토픽 II 2교시 읽기)
        elif len(cells) == 6:
            교시 = cells[0]
            영역 = cells[1]
            문제유형 = cells[2]
            문항수 = cells[3]
            배점 = cells[4]
            총점 = cells[5]

            현재교시 = 교시
            현재총점 = 총점

            구성표.append(
                {
                    "시험수준": 현재시험수준,
                    "교시": 교시,
                    "영역": 영역,
                    "문제유형": 문제유형,
                    "문항수": int(re.sub(r"[^\d]", "", 문항수)) if re.search(r"\d", 문항수) else None,
                    "배점": int(re.sub(r"[^\d]", "", 배점)) if re.search(r"\d", 배점) else None,
                    "총점": int(re.sub(r"[^\d]", "", 총점)) if re.search(r"\d", 총점) else None,
                }
            )

    return {
        "섹션명": "시험 수준별 구성",
        "구성표": 구성표,
    }

def parse_problem_type_section(nodes: list[Tag]) -> dict[str, Any]:
    문제유형목록: list[Any] = []

    for node in nodes:
        if node.name == "ul" and "ul_list_dot" in (node.get("class") or []):
            for li in node.find_all("li", recursive=False):
                하위목록 = li.find("ul", class_="ul_list_dash")

                if 하위목록:
                    상위텍스트 = normalize_text(li.contents[0].strip() if li.contents else li.get_text(" ", strip=True))
                    세부항목 = [
                        normalize_text(sub_li.get_text(" ", strip=True))
                        for sub_li in 하위목록.find_all("li")
                    ]
                    문제유형목록.append({
                        "상위항목": 상위텍스트,
                        "세부항목": 세부항목,
                    })
                else:
                    문제유형목록.append(normalize_text(li.get_text(" ", strip=True)))
            break

    return {
        "섹션명": "문제 유형",
        "문제유형목록": 문제유형목록,
    }

def parse_writing_evaluation_section(nodes: list[Tag]) -> dict[str, Any]:
    table = find_first_table(nodes)
    평가범주표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션명": "쓰기 영역 작문 문항 평가 범주",
            "평가범주표": [],
        }

    rows = table.select("tbody tr")
    현재문항번호 = None

    for tr in rows:
        cells = tr.find_all(["th", "td"])

        texts = [normalize_text(cell.get_text(" ", strip=True)) for cell in cells]

        if len(texts) == 3:
            현재문항번호 = texts[0]
            평가범주 = texts[1]
            내용셀 = cells[2]
        elif len(texts) == 2:
            평가범주 = texts[0]
            내용셀 = cells[1]
        else:
            continue

        평가내용 = [
            normalize_text(li.get_text(" ", strip=True))
            for li in 내용셀.select("li")
        ]
        if not 평가내용:
            plain = normalize_text(내용셀.get_text(" ", strip=True))
            if plain:
                평가내용 = [plain]

        평가범주표.append({
            "문항번호": 현재문항번호,
            "평가범주": 평가범주,
            "평가내용": 평가내용,
        })

    return {
        "섹션명": "쓰기 영역 작문 문항 평가 범주",
        "평가범주표": 평가범주표,
    }

def parse_test_paper_type_section(nodes: list[Tag]) -> dict[str, Any]:
    table = find_first_table(nodes)
    문제지종류표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션명": "문제지 종류",
            "문제지종류표": [],
        }

    rows = table.select("tbody tr")
    for tr in rows:
        cells = [normalize_text(cell.get_text(" ", strip=True)) for cell in tr.find_all(["th", "td"])]
        if len(cells) != 3:
            continue

        문제지종류표.append({
            "종류": cells[0],
            "A형": cells[1],
            "B형": cells[2],
        })

    return {
        "섹션명": "문제지 종류",
        "문제지종류표": 문제지종류표,
    }

def parse_pbt_question_structure(soup: BeautifulSoup) -> dict[str, Any]:
    root = get_content_root(soup)
    section_blocks = collect_section_blocks(root)

    level_nodes = section_blocks.get("시험 수준별 구성", [])
    type_nodes = section_blocks.get("문제 유형", [])
    writing_nodes = section_blocks.get("쓰기 영역 작문 문항 평가 범주", [])
    paper_nodes = section_blocks.get("문제지 종류", [])

    return {
        "섹션들": [
            parse_level_composition_section(level_nodes),
            parse_problem_type_section(type_nodes),
            parse_writing_evaluation_section(writing_nodes),
            parse_test_paper_type_section(paper_nodes),
        ]
    }

def parse_evaluation_criteria_section(nodes: list[Tag]) -> dict[str, Any]:
    table = find_first_table(nodes)
    평가기준표: list[dict[str, Any]] = []

    if table is None:
        return {
            "섹션명": "등급별 평가 기준",
            "평가기준표": [],
        }

    rows = table.select("tbody tr")
    현재시험수준: str | None = None

    for tr in rows:
        cells = tr.find_all(["th", "td"])
        texts = [normalize_text(cell.get_text(" ", strip=True)) for cell in cells]

        if len(texts) == 3:
            현재시험수준 = texts[0]
            등급 = texts[1]
            평가기준 = texts[2]
        elif len(texts) == 2:
            등급 = texts[0]
            평가기준 = texts[1]
        else:
            continue

        평가기준표.append(
            {
                "시험수준": 현재시험수준,
                "등급": 등급,
                "평가기준": 평가기준,
            }
        )

    return {
        "섹션명": "등급별 평가 기준",
        "평가기준표": 평가기준표,
    }

def parse_pbt_evaluation_criteria(soup: BeautifulSoup) -> dict[str, Any]:
    root = get_content_root(soup)
    section_blocks = collect_section_blocks(root)

    criteria_nodes = section_blocks.get("등급별 평가 기준", [])

    return {
        "섹션들": [
            parse_evaluation_criteria_section(criteria_nodes),
        ]
    }

def parse_list_items(ul: Tag | None) -> list[str]:
    if ul is None:
        return []

    items: list[str] = []
    for li in ul.find_all("li", recursive=False):
        text = normalize_text(li.get_text(" ", strip=True))
        if text:
            items.append(text)
    return items

def parse_notice_table(table: Tag | None) -> list[dict[str, str]]:
    if table is None:
        return []

    rows_data: list[dict[str, str]] = []
    rows = table.select("tbody tr")

    for tr in rows:
        cells = [normalize_text(td.get_text(" ", strip=True)) for td in tr.find_all(["td", "th"])]
        if len(cells) != 3:
            continue

        rows_data.append(
            {
                "시간": cells[0],
                "내용": cells[1],
                "비고": cells[2],
            }
        )

    return rows_data

def parse_guide_box_text(guide_box: Tag | None) -> list[str]:
    if guide_box is None:
        return []

    texts: list[str] = []
    for li in guide_box.select("li"):
        text = normalize_text(li.get_text(" ", strip=True))
        if text:
            texts.append(text)
    return texts

def parse_pbt_test_day_notice(soup: BeautifulSoup) -> dict[str, Any]: 
    root = get_content_root(soup)
    sub_contents = root.select("div.sub_content.note_box")

    섹션들: list[dict[str, Any]] = []

    for idx, sub in enumerate(sub_contents):
        큰제목 = sub.select_one("h3.h3_title")
        안내문 = sub.select_one("div.main_txt")

        section_name = normalize_text(큰제목.get_text(" ", strip=True)) if 큰제목 else f"유의사항-{idx + 1}"
        intro_text = normalize_text(안내문.get_text(" ", strip=True)) if 안내문 else ""

        소항목들: list[dict[str, Any]] = []

        children = [child for child in sub.children if isinstance(child, Tag)]
        i = 0

        while i < len(children):
            child = children[i]

            if child.name == "div" and "sub_title1" in (child.get("class") or []):
                소제목 = normalize_text(child.get_text(" ", strip=True))
                항목: dict[str, Any] = {
                    "소제목": 소제목,
                    "목록": [],
                    "표": [],
                    "주석": [],
                    "안내박스": [],
                }

                j = i + 1
                while j < len(children):
                    next_child = children[j]

                    if next_child.name == "div" and "sub_title1" in (next_child.get("class") or []):
                        break

                    if next_child.name == "ul":
                        항목["목록"].extend(parse_list_items(next_child))

                    elif next_child.name == "table" and "basic_table" in (next_child.get("class") or []):
                        항목["표"] = parse_notice_table(next_child)

                    elif next_child.name == "div" and "comment" in (next_child.get("class") or []):
                        항목["주석"].extend(
                            [
                                normalize_text(li.get_text(" ", strip=True))
                                for li in next_child.select("li")
                                if normalize_text(li.get_text(" ", strip=True))
                            ]
                        )

                    elif next_child.name == "div" and "guide_box" in (next_child.get("class") or []):
                        항목["안내박스"] = parse_guide_box_text(next_child)

                    j += 1

                소항목들.append(항목)
                i = j
                continue

            i += 1

        섹션들.append(
            {
                "섹션명": section_name,
                "안내문": intro_text,
                "소항목들": 소항목들,
            }
        )

    return {
        "섹션들": 섹션들
    }

def parse_ordered_list(ol: Tag | None) -> list[str]:
    if ol is None:
        return []

    items: list[str] = []
    for li in ol.find_all("li", recursive=False):
        text = normalize_text(li.get_text(" ", strip=True))
        if text:
            items.append(text)
    return items

def parse_text_info_list(box: Tag | None) -> list[str]:
    if box is None:
        return []

    items: list[str] = []
    for li in box.select("ol li"):
        text = normalize_text(li.get_text(" ", strip=True))
        if text:
            items.append(text)
    return items

def parse_pbt_answer_sheet_guide(soup: BeautifulSoup) -> dict[str, Any]:
    root = get_content_root(soup)
    note_box = root.select_one("div.sub_content.note_box")

    if note_box is None:
        return {
            "섹션들": [
                {
                    "섹션명": "답안작성요령",
                    "소항목들": [],
                }
            ]
        }

    소항목들: list[dict[str, Any]] = []
    children = [child for child in note_box.children if isinstance(child, Tag)]

    i = 0
    while i < len(children):
        child = children[i]

        if child.name == "div" and "sub_title1" in (child.get("class") or []):
            소제목 = normalize_text(child.get_text(" ", strip=True))
            항목: dict[str, Any] = {
                "소제목": 소제목,
                "목록": [],
                "설명": [],
                "이미지설명": [],
            }

            j = i + 1
            while j < len(children):
                next_child = children[j]

                if next_child.name == "div" and "sub_title1" in (next_child.get("class") or []):
                    break

                if next_child.name == "ol" and "ol_list_number" in (next_child.get("class") or []):
                    항목["목록"].extend(parse_ordered_list(next_child))

                elif next_child.name == "div" and "omr_sapmple_box" in (next_child.get("class") or []):
                    box_text = normalize_text(next_child.get_text(" ", strip=True))
                    if box_text:
                        항목["설명"].append(box_text)

                    text_info = next_child.select_one("div.text_info")
                    항목["이미지설명"].extend(parse_text_info_list(text_info))

                j += 1

            소항목들.append(항목)
            i = j
            continue

        i += 1

    return {
        "섹션들": [
            {
                "섹션명": "답안작성요령",
                "소항목들": 소항목들,
            }
        ]
    }

def parse_pbt_notice_tab(
    응시자유의사항_soup: BeautifulSoup,
    답안작성요령_soup: BeautifulSoup | None = None,
) -> dict[str, Any]:
    섹션들: list[dict[str, Any]] = []

    응시자유의사항 = parse_pbt_test_day_notice(응시자유의사항_soup)
    섹션들.extend(응시자유의사항.get("섹션들", []))

    if 답안작성요령_soup is not None:
        답안작성요령 = parse_pbt_answer_sheet_guide(답안작성요령_soup)
        섹션들.extend(답안작성요령.get("섹션들", []))

    return {
        "섹션들": 섹션들
    }

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


def crawl_topik_pbt(output_filename: str = "topik_pbt.json") -> Path:
    html = fetch_html(TOPIK_PBT_URL)
    soup = BeautifulSoup(html, "lxml")

    root = get_content_root(soup)
    section_blocks = collect_section_blocks(root)

    grade_nodes = section_blocks.get("시험 수준 및 등급", [])
    schedule_nodes = section_blocks.get("시험 시간표", [])
    fee_nodes = section_blocks.get("응시료(한국기준)", [])

    grade_section = parse_grade_section(grade_nodes)
    schedule_section = parse_schedule_section(schedule_nodes)
    fee_section = parse_fee_section(fee_nodes)

    시험소개 = {
        "섹션들": [
            grade_section,
            schedule_section,
            fee_section,
        ]
    }

    structure_html = fetch_html(TOPIK_PBT_STRUCTURE_URL)
    structure_soup = BeautifulSoup(structure_html, "lxml")
    문항구성 = parse_pbt_question_structure(structure_soup)

    evaluation_html = fetch_html(TOPIK_PBT_EVALUATION_URL)
    evaluation_soup = BeautifulSoup(evaluation_html, "lxml")
    평가기준 = parse_pbt_evaluation_criteria(evaluation_soup)

    notice_html = fetch_html(TOPIK_PBT_NOTICE_URL)
    notice_soup = BeautifulSoup(notice_html, "lxml")

    answer_guide_html = fetch_html(TOPIK_PBT_ANSWER_GUIDE_URL)
    answer_guide_soup = BeautifulSoup(answer_guide_html, "lxml")

    유의사항 = parse_pbt_notice_tab(
        응시자유의사항_soup=notice_soup,
        답안작성요령_soup=answer_guide_soup,
    )

    output = build_output(
        시험유형="PBT",
        출처URL=TOPIK_PBT_URL,
        탭들={
            "시험 소개": 시험소개,
            "문항 구성": 문항구성,
            "평가 기준": 평가기준,
            "유의 사항": 유의사항,
        },
    )

    output_path = DATA_DIR / output_filename
    save_json(output, output_path)
    return output_path

    output = build_output(
        시험유형="PBT",
        출처URL="https://www.topik.go.kr/HMENU0/HMENU00016.do",
        탭들={ 
            "시험 소개": 시험소개,
            "문항 구성": 문항구성,
            "평가 기준": 평가기준,
            "유의 사항": 유의사항,
        },
    )

    output_path = DATA_DIR / output_filename
    save_json(output, output_path)
    return output_path


def crawl_topik_exam(exam_type: str, url: str, output_filename: str) -> Path:
    output = build_output(
        시험유형=exam_type,
        출처URL=url,
        탭들={
            "시험 소개": {"섹션들": []},
            "문항 구성": {"섹션들": []},
            "평가 기준": {"섹션들": []},
            "유의 사항": {"섹션들": []},
        },
    )

    output_path = DATA_DIR / output_filename
    save_json(output, output_path)
    return output_path


if __name__ == "__main__":
    path = crawl_topik_pbt()
    print(f"TOPIK JSON saved: {path}")