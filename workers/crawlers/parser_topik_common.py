from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    return text.strip()


def read_local_html(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def save_json(data: dict[str, Any], path: str) -> None:
    Path(path).write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def build_output(exam_type: str, tabs: dict[str, Any]) -> dict[str, Any]:
    return {
        "페이지메타": {
            "시험유형": exam_type,
            "페이지제목": "시험별 안내",
        },
        "탭들": tabs,
    }