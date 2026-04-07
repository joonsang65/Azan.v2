from __future__ import annotations


def categorize(title: str, body: str) -> tuple[str, str]:
    """Keyword-based category classification for crawler output."""
    text = f"{title or ''}\n{body or ''}".lower()

    rules: list[tuple[str, list[str]]] = [
        ("topik", ["topik", "korean proficiency"]),
        ("visa", ["visa", "immigration", "arc", "d-2", "d2", "residence"]),
        ("scholarship", ["scholarship", "grant", "financial aid"]),
        ("dorm", ["dorm", "dormitory", "housing", "move-in", "move in"]),
        ("events", ["event", "festival", "orientation", "workshop", "seminar"]),
        ("exchange", ["exchange", "visiting", "outgoing", "incoming"]),
        ("work", ["part-time", "part time", "job", "internship", "employment"]),
        ("academic", ["course", "registration", "semester", "academic", "grade", "class", "tuition"]),
    ]

    for category, keywords in rules:
        for keyword in keywords:
            if keyword in text:
                return category, keyword

    return "general", "no_match"


def to_app_category(category: str | None) -> str:
    normalized = (category or "").strip().lower()

    mapping = {
        "visa": "Visa",
        "topik": "TOPIK",
        "academic": "Academic",
        "exchange": "Academic",
        "work": "Academic",
        "general": "Academic",
        "events": "Events",
        "event": "Events",
        "scholarship": "Scholarship",
        "dorm": "Dormitory",
        "dormitory": "Dormitory",
    }

    return mapping.get(normalized, "Academic")
