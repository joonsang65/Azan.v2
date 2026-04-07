from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from .parser_topik_common import normalize_text, read_local_html, save_json, build_output 
from .config import DATA_DIR

def _next_meaningful_sibling(tag: Tag | None) -> Tag | None:
    """
    공백/문자열이 아닌 다음 형제 Tag를 반환
    """
    if tag is None:
        return None

    node = tag.next_sibling
    while node is not None:
        if isinstance(node, Tag):
            return node
        node = node.next_sibling
    return None


def _collect_text_lines_from_tag(tag: Tag | None) -> list[str]:
    """
    ul / div / td 내부의 텍스트를 줄 단위로 정리해서 반환
    """
    if tag is None:
        return []

    lines: list[str] = []
    raw = tag.get_text("\n", strip=True)
    raw = normalize_text(raw)

    for line in raw.split("\n"):
        cleaned = normalize_text(line)
        if cleaned:
            lines.append(cleaned)

    return lines


def _parse_dash_list(tag: Tag | None) -> list[str]:
    """
    ul_list_dash 형태의 li 목록 파싱
    """
    if tag is None:
        return []

    items: list[str] = []
    for li in tag.find_all("li", recursive=False):
        text = normalize_text(li.get_text(" ", strip=True))
        if text:
            items.append(text)

    return items


def _parse_mixed_intro_list(tag: Tag | None) -> dict[str, Any]:
    """
    응시 대상처럼 ul 안에 p + li가 같이 들어있는 구조 파싱
    예:
      <ul class="ul_list_dash">
        <p>설명</p>
        <li>...</li>
        <li>...</li>
      </ul>
    """
    result: dict[str, Any] = {
        "설명": "",
        "대상": [],
    }

    if tag is None:
        return result

    desc_parts: list[str] = []

    for child in tag.children:
        if not isinstance(child, Tag):
            continue

        if child.name == "p":
            text = normalize_text(child.get_text(" ", strip=True))
            if text:
                desc_parts.append(text)

        elif child.name == "li":
            text = normalize_text(child.get_text(" ", strip=True))
            if text:
                result["대상"].append(text)

    result["설명"] = " ".join(desc_parts).strip()
    return result


def _parse_simple_text_block_from_heading(h4: Tag) -> str:
    """
    h4 다음에 오는 p 또는 ul 안의 단일 텍스트를 추출
    """
    node = _next_meaningful_sibling(h4)
    if node is None:
        return ""

    # <p>80,000원</p>
    if node.name == "p":
        return normalize_text(node.get_text(" ", strip=True))

    # <ul><p>성적발표일로부터 2년간 유효</p></ul>
    if node.name == "ul":
        lines = _collect_text_lines_from_tag(node)
        return " ".join(lines).strip()

    return ""


def _parse_schedule_table(table: Tag | None, comment_div: Tag | None) -> dict[str, Any]:
    """
    시험 시간표 테이블 + comment 유의사항 파싱
    """
    result: dict[str, Any] = {
        "구분": "",
        "입실 시작 시간": "",
        "입실 완료 시간": "",
        "시험 시작": "",
        "시험 종료": "",
        "시험시간": "",
        "유의사항": [],
    }

    if table is not None:
        tbody = table.find("tbody")
        if tbody:
            first_row = tbody.find("tr")
            if first_row:
                cells = first_row.find_all(["td", "th"])
                values = [normalize_text(td.get_text(" ", strip=True)) for td in cells]

                # 실제 HTML은 6열
                if len(values) >= 6:
                    result["구분"] = values[0]
                    result["입실 시작 시간"] = values[1]
                    result["입실 완료 시간"] = values[2]
                    result["시험 시작"] = values[3]
                    result["시험 종료"] = values[4]
                    result["시험시간"] = values[5]

    if comment_div is not None:
        notes: list[str] = []
        for li in comment_div.find_all("li"):
            text = normalize_text(li.get_text(" ", strip=True))
            if text:
                text = text.replace("○ ", "").replace("○", "", 1).strip()
                notes.append(text)
        result["유의사항"] = notes

    return result


def _parse_question_structure_table(table: Tag | None) -> list[dict[str, str]]:
    """
    문항구성 표 파싱
    """
    rows: list[dict[str, str]] = []

    if table is None:
        return rows

    tbody = table.find("tbody")
    if tbody is None:
        return rows

    for tr in tbody.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        values = [normalize_text(td.get_text(" ", strip=True)) for td in cells]

        if len(values) >= 4:
            rows.append(
                {
                    "문항": values[0],
                    "문항유형": values[1],
                    "준비시간": values[2],
                    "응답시간": values[3],
                }
            )

    return rows


def _parse_evaluation_table(table: Tag | None) -> list[dict[str, Any]]:
    """
    평가요소 표 파싱
    """
    rows: list[dict[str, Any]] = []

    if table is None:
        return rows

    tbody = table.find("tbody")
    if tbody is None:
        return rows

    for tr in tbody.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 2:
            continue

        title = normalize_text(cells[0].get_text(" ", strip=True))
        content_lines = _collect_text_lines_from_tag(cells[1])

        rows.append(
            {
                "평가요소": title,
                "내용": content_lines,
            }
        )

    return rows


def parse_speaking_intro(html: str) -> dict[str, Any]:
    """
    TOPIK 말하기 평가 '시험 소개' 탭 HTML 파싱

    반환 구조 예:
    {
        "시험 소개": {...},
        "세부 문항구성": [...],
        "평가요소": [...]
    }
    """
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one("#container")
    if container is None:
        return {
            "시험 소개": {},
            "세부 문항구성": [],
            "평가요소": [],
        }

    result: dict[str, Any] = {
        "시험 소개": {},
        "세부 문항구성": [],
        "평가요소": [],
    }

    intro: dict[str, Any] = {}

    sub_contents = container.select("div.sub_content")

    for block in sub_contents:
        h4 = block.find("h4", class_="sub_title")
        if h4 is None:
            continue

        title = normalize_text(h4.get_text(" ", strip=True)).replace("\xa0", "").strip()
        if not title:
            continue

        # 1) 시험 목적
        if title == "시험 목적":
            ul = block.find("ul")
            intro["시험 목적"] = _parse_dash_list(ul)

        # 2) 응시 대상
        elif title == "응시 대상":
            ul = block.find("ul")
            intro["응시 대상"] = _parse_mixed_intro_list(ul)

        # 3) 응시료
        elif title == "응시료":
            intro["응시료"] = _parse_simple_text_block_from_heading(h4)

            # 같은 block 안에 이어서 유효기간도 붙어 있음
            all_h4s = block.find_all("h4", class_="sub_title")
            for extra_h4 in all_h4s:
                extra_title = normalize_text(extra_h4.get_text(" ", strip=True)).replace("\xa0", "").strip()
                if extra_title == "유효기간":
                    intro["유효기간"] = _parse_simple_text_block_from_heading(extra_h4)

        # 4) 주관기관
        elif title == "주관기관":
            intro["주관기관"] = _parse_simple_text_block_from_heading(h4)

        # 5) 시험 활용처
        elif title == "시험 활용처":
            ul = block.find("ul")
            intro["시험 활용처"] = _parse_dash_list(ul)

        # 6) 시험 시간표
        elif title == "시험 시간표":
            table = block.find("table", class_="basic_table")
            comment_div = block.find("div", class_="comment")
            intro["시험 시간표"] = _parse_schedule_table(table, comment_div)

        # 7) 문항구성
        elif title == "문항구성":
            table = block.find("table", class_="basic_table")
            result["세부 문항구성"] = _parse_question_structure_table(table)

        # 8) 평가요소
        elif title == "평가요소":
            table = block.find("table", class_="basic_table")
            result["평가요소"] = _parse_evaluation_table(table)

    result["시험 소개"] = intro
    return result

def parse_speaking_structure(html: str) -> dict[str, Any]:
    """
    TOPIK 말하기 평가 '문항 구성(시험 수준별 구성)' 탭 HTML 파싱

    반환 예:
    {
        "시험 수준별 구성": {
            "시험유형": "TOPIK 말하기 평가",
            "평가 영역별 시험 시간": "30분",
            "평가 영역별 문제 수": "6문제",
            "평가 영역별 만점": "200점",
            "총 점": "200점"
        }
    }
    """
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one("#container")

    if container is None:
        return {"시험 수준별 구성": {}}

    title_tag = container.select_one("h3.h3_title")
    section_title = normalize_text(title_tag.get_text(" ", strip=True)) if title_tag else "시험 수준별 구성"

    table = container.select_one("table.basic_table")
    if table is None:
        return {section_title: {}}

    thead = table.find("thead")
    tbody = table.find("tbody")

    exam_type = ""
    if thead:
        head_row = thead.find("tr")
        if head_row:
            ths = head_row.find_all("th")
            if len(ths) >= 2:
                exam_type = normalize_text(ths[1].get_text(" ", strip=True))

    result: dict[str, Any] = {
        "시험유형": exam_type
    }

    if tbody:
        for tr in tbody.find_all("tr"):
            cells = tr.find_all(["th", "td"])
            if len(cells) < 2:
                continue

            key = normalize_text(cells[0].get_text(" ", strip=True))
            value = normalize_text(cells[1].get_text(" ", strip=True))

            if key:
                result[key] = value

    return {
        section_title: result
    }


def _clean_lines_from_text(text: str) -> list[str]:
    """
    줄 단위 텍스트 정리
    """
    text = normalize_text(text)
    if not text:
        return []

    lines: list[str] = []
    for line in text.split("\n"):
        cleaned = normalize_text(line)
        if cleaned:
            lines.append(cleaned)
    return lines


def _split_paragraph_lines(tag: Tag | None) -> list[str]:
    """
    p 태그의 <br> 기준 문장 분리
    """
    if tag is None:
        return []

    raw = tag.get_text("\n", strip=True)
    return _clean_lines_from_text(raw)


def _extract_box_text_and_image(box: Tag | None) -> tuple[str, str | None]:
    """
    예시문항/모범답안 박스에서 텍스트와 이미지 URL 추출
    """
    if box is None:
        return "", None

    img_tag = box.find("img")
    image_url = ""
    if img_tag and img_tag.get("src"):
        image_url = normalize_text(img_tag["src"])

    text_parts: list[str] = []
    for p in box.find_all("p", recursive=False):
        # 이미지 자체 설명 제외하고 텍스트만 수집
        text = normalize_text(p.get_text(" ", strip=True))
        if text:
            text_parts.append(text)

    merged_text = "\n".join(text_parts).strip()
    return merged_text, image_url or None


def parse_speaking_question_types(html: str) -> dict[str, Any]:
    """
    TOPIK 말하기 평가 '문항유형 및 학습방법' 탭 HTML 파싱

    반환 예:
    {
        "문항유형 및 학습방법": [
            {
                "문항번호": "1",
                "문항명": "질문에 대답하기",
                "유형설명": [...],
                "공부방법": [...],
                "예시문항": "...",
                "모범답안": "...",
                "이미지URL": None
            },
            ...
        ]
    }
    """
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one("#container")

    if container is None:
        return {"문항유형 및 학습방법": []}

    root = container
    title_tag = root.find("h3", class_="h3_title")
    section_title = normalize_text(title_tag.get_text(" ", strip=True)) if title_tag else "문항유형 및 학습방법"

    h4_tags = root.find_all("h4", class_="sub_title")
    items: list[dict[str, Any]] = []

    for h4 in h4_tags:
        heading = normalize_text(h4.get_text(" ", strip=True))
        if not heading:
            continue

        # 예: "1. 질문에 대답하기"
        match = re.match(r"^\s*(\d+)\.\s*(.+?)\s*$", heading)
        if match:
            item_no = match.group(1)
            item_name = match.group(2)
        else:
            item_no = ""
            item_name = heading

        item: dict[str, Any] = {
            "문항번호": item_no,
            "문항명": item_name,
            "유형설명": [],
            "공부방법": [],
            "예시문항": "",
            "모범답안": "",
            "이미지URL": None,
        }

        # 현재 h4 다음부터 다음 h4 전까지 순회
        current = h4.next_sibling
        mode = "설명"

        while current is not None:
            if isinstance(current, Tag):
                if current.name == "h4" and "sub_title" in (current.get("class") or []):
                    break

                # * 공부방법 / * 예시문항 / * 모범답안
                if current.name == "h5":
                    label = normalize_text(current.get_text(" ", strip=True))
                    if "공부방법" in label:
                        mode = "공부방법"
                    elif "예시문항" in label:
                        mode = "예시문항"
                    elif "모범답안" in label:
                        mode = "모범답안"
                    current = current.next_sibling
                    continue

                # 설명/공부방법에 해당하는 일반 p
                if current.name == "p":
                    lines = _split_paragraph_lines(current)
                    if lines:
                        if mode == "설명":
                            item["유형설명"].extend(lines)
                        elif mode == "공부방법":
                            item["공부방법"].extend(lines)

                # 예시문항/모범답안 박스
                elif current.name == "div":
                    style = normalize_text(current.get("style", ""))
                    text, image_url = _extract_box_text_and_image(current)

                    # 박스형 div만 처리
                    if "padding" in style or current.find("img") or text:
                        if mode == "예시문항" and text:
                            item["예시문항"] = text
                            if image_url:
                                item["이미지URL"] = image_url
                        elif mode == "모범답안" and text:
                            item["모범답안"] = text

            current = current.next_sibling

        # 빈 줄/중복 약간 정리
        item["유형설명"] = [normalize_text(x) for x in item["유형설명"] if normalize_text(x)]
        item["공부방법"] = [normalize_text(x) for x in item["공부방법"] if normalize_text(x)]

        items.append(item)

    return {
        section_title: items
    }


def _parse_score_range_text(text: str) -> tuple[int | None, int | None]:
    """
    예:
      '0 ~ 19' -> (0, 19)
      '90  ~ 109' -> (90, 109)
    """
    cleaned = normalize_text(text)
    numbers = re.findall(r"\d+", cleaned)

    if len(numbers) >= 2:
        return int(numbers[0]), int(numbers[1])
    if len(numbers) == 1:
        value = int(numbers[0])
        return value, value
    return None, None


def _parse_grade_scale_table(table: Tag | None) -> list[dict[str, Any]]:
    """
    '시험 등급' 표 파싱
    """
    results: list[dict[str, Any]] = []

    if table is None:
        return results

    thead = table.find("thead")
    tbody = table.find("tbody")
    if thead is None or tbody is None:
        return results

    head_rows = thead.find_all("tr")
    if len(head_rows) < 2:
        return results

    # 두 번째 헤더 행에서 등급명 추출: 불합격, 1급, 2급 ...
    grade_headers = head_rows[1].find_all("th")
    grades: list[str] = []
    for th in grade_headers:
        grade = normalize_text(th.get_text(" ", strip=True))
        if grade:
            grades.append(grade)

    body_row = tbody.find("tr")
    if body_row is None:
        return results

    cells = body_row.find_all(["td", "th"])
    if len(cells) < 2:
        return results

    # 첫 번째 셀은 "척도점수 범위(점)" 라벨
    score_cells = cells[1:]

    for grade, score_cell in zip(grades, score_cells):
        score_text = normalize_text(score_cell.get_text(" ", strip=True))
        min_score, max_score = _parse_score_range_text(score_text)

        results.append(
            {
                "등급": grade,
                "최소점수": min_score,
                "최대점수": max_score,
                "점수표기": score_text,
            }
        )

    return results


def _parse_grade_scale_comment(comment_div: Tag | None) -> str:
    """
    시험 등급 하단 주석 파싱
    """
    if comment_div is None:
        return ""

    text = normalize_text(comment_div.get_text(" ", strip=True))
    return text


def _parse_grade_descriptions_table(table: Tag | None) -> list[dict[str, Any]]:
    """
    '등급 기술' 표 파싱
    """
    results: list[dict[str, Any]] = []

    if table is None:
        return results

    tbody = table.find("tbody")
    if tbody is None:
        return results

    for tr in tbody.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 2:
            continue

        grade = normalize_text(cells[0].get_text(" ", strip=True))

        desc_list: list[str] = []
        ul = cells[1].find("ul")
        if ul is not None:
            for li in ul.find_all("li"):
                text = normalize_text(li.get_text(" ", strip=True))
                if text:
                    desc_list.append(text)
        else:
            raw = normalize_text(cells[1].get_text("\n", strip=True))
            for line in raw.split("\n"):
                line = normalize_text(line)
                if line:
                    desc_list.append(line)

        results.append(
            {
                "등급": grade,
                "기술": desc_list,
            }
        )

    return results


def parse_speaking_grade_system(html: str) -> dict[str, Any]:
    """
    TOPIK 말하기 평가 '등급 체계' 탭 HTML 파싱

    반환 예:
    {
        "등급 체계": {
            "시험 등급": {
                "척도점수 범위": [...],
                "설명": "..."
            },
            "등급 기술": [...]
        }
    }
    """
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one("#container")

    if container is None:
        return {
            "등급 체계": {
                "시험 등급": {
                    "척도점수 범위": [],
                    "설명": "",
                },
                "등급 기술": [],
            }
        }

    blocks = container.select("div.sub_content")

    grade_scale_table: Tag | None = None
    grade_scale_comment: Tag | None = None
    grade_desc_table: Tag | None = None

    for block in blocks:
        h4 = block.find("h4", class_="sub_title")
        if h4 is None:
            continue

        title = normalize_text(h4.get_text(" ", strip=True))
        if not title:
            continue

        if title == "시험 등급":
            grade_scale_table = block.find("table", class_="basic_table")
            grade_scale_comment = block.find("div", class_="comment")

        elif title == "등급 기술":
            grade_desc_table = block.find("table", class_="basic_table")

    result = {
        "등급 체계": {
            "시험 등급": {
                "척도점수 범위": _parse_grade_scale_table(grade_scale_table),
                "설명": _parse_grade_scale_comment(grade_scale_comment),
            },
            "등급 기술": _parse_grade_descriptions_table(grade_desc_table),
        }
    }

    return result

def _parse_speaking_schedule_rows(table: Tag | None) -> list[dict[str, str]]:
    """
    시험일정 표의 tbody 행 파싱
    """
    rows: list[dict[str, str]] = []

    if table is None:
        return rows

    tbody = table.find("tbody")
    if tbody is None:
        return rows

    for tr in tbody.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        values = [normalize_text(cell.get_text(" ", strip=True)) for cell in cells]

        if len(values) >= 4:
            rows.append(
                {
                    "구분": values[0],
                    "시험일": values[1],
                    "접수기간": values[2],
                    "성적 발표": values[3],
                }
            )

    return rows


def _parse_speaking_schedule_fee(block: Tag | None) -> str:
    """
    하단 응시료 파싱
    예: '응시료 : 80,000원'
    """
    if block is None:
        return ""

    ul = block.find("ul", class_="ul_list_dot")
    if ul is None:
        return ""

    text = normalize_text(ul.get_text(" ", strip=True))
    text = text.replace("응시료", "").replace(":", "").strip()
    return text


def parse_speaking_schedule_tab(html: str) -> dict[str, Any]:
    """
    TOPIK 말하기 평가 '시험일정' 탭 HTML 파싱

    반환 예:
    {
        "시험일정": {
            "제목": "...",
            "일정목록": [...],
            "응시료": "80,000원"
        }
    }
    """
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one("#container")

    if container is None:
        return {
            "시험일정": {
                "제목": "",
                "일정목록": [],
                "응시료": "",
            }
        }

    block = container.select_one("div.sub_content")
    if block is None:
        return {
            "시험일정": {
                "제목": "",
                "일정목록": [],
                "응시료": "",
            }
        }

    title_tag = block.find("h3", class_="h3_title")
    table = block.find("table", class_="basic_table")

    title = normalize_text(title_tag.get_text(" ", strip=True)) if title_tag else ""
    schedule_rows = _parse_speaking_schedule_rows(table)
    fee = _parse_speaking_schedule_fee(block)

    return {
        "시험일정": {
            "제목": title,
            "일정목록": schedule_rows,
            "응시료": fee,
        }
    }

def crawl_topik_speaking() -> str:
    intro_html = read_local_html(str(DATA_DIR / "speaking_intro.html"))
    structure_html = read_local_html(str(DATA_DIR / "speaking_structure.html"))
    question_types_html = read_local_html(str(DATA_DIR / "speaking_question_types.html"))
    grade_system_html = read_local_html(str(DATA_DIR / "speaking_grade_system.html"))
    schedule_html = read_local_html(str(DATA_DIR / "speaking_schedule.html"))

    intro_data = parse_speaking_intro(intro_html)
    structure_data = parse_speaking_structure(structure_html)
    question_types_data = parse_speaking_question_types(question_types_html)
    grade_data = parse_speaking_grade_system(grade_system_html)
    schedule_data = parse_speaking_schedule_tab(schedule_html)

    tabs = {
        "시험 소개": {
            **intro_data["시험 소개"],
            "세부 문항구성": intro_data["세부 문항구성"],
            "평가요소": intro_data["평가요소"],
        },
        "문항 구성": structure_data["시험 수준별 구성"],
        "문항유형 및 학습방법": question_types_data["문항유형 및 학습방법"],
        "등급 체계": grade_data["등급 체계"],
        "시험일정": schedule_data["시험일정"],
    }

    output = build_output(
        exam_type="말하기",
        tabs=tabs,
    )

    output_path = DATA_DIR / "topik_speaking.json"
    save_json(output, str(output_path))
    return str(output_path)