"""
workers/risk_alarm/expo/msg_templates.py

Push notification message templates for visa and TOPIK risk alerts.
Keyed by preferred_language ("Korean" | "English").
VISA_TEMPLATES[lang][2] uses {days_left} — inject via .format(days_left=...) at render time.

Templates are loaded from the Neon DB `risk_msg` table at startup via load_templates(engine).
If the DB load fails the hardcoded dicts below are used as fallback.
"""

import logging

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hardcoded fallback templates (also the initial seed in the DB)
# ---------------------------------------------------------------------------

VISA_TEMPLATES: dict[str, dict[int, str]] = {
    "Korean": {
        1: "비자 만료일까지 90일 이상 남았습니다. 갱신 준비는 D-40부터 시작됩니다.",
        2: "비자 만료까지 {days_left}일 남았습니다. 조속히 국제대학원 교학팀(국제교류팀)에 문의하세요.",
        3: "교학팀 서류 접수 마감일이 다가오고 있습니다. 지금 바로 서류를 제출해 주세요.",
        4: "교학팀 서류 접수 마감이 지났습니다. 즉시 출입국관리사무소 방문 예약을 진행하세요.",
        5: "[긴급] 지금 즉시 출입국관리사무소 또는 국제대학원 교학팀에 연락하시기 바랍니다.",
    },
    "English": {
        1: "Your visa expiry is more than 90 days away. Renewal preparation begins at D-40.",
        2: "Your visa expires in {days_left} days. Contact the International Student Support Office soon.",
        3: "School office processing deadline is approaching. Submit your documents now.",
        4: "School office deadline has passed. Book an appointment at the Immigration Office immediately.",
        5: "URGENT: Contact the Immigration Office or International Student Support Office right now.",
    },
}

TOPIK_TEMPLATES: dict[str, dict[int, str]] = {
    "Korean": {
        1: "D-2 비자 입학 요건으로 TOPIK 3급 이상이 필요합니다. 다가오는 시험 일정을 확인하세요.",
        2: "곧 TOPIK 시험에 등록해야 합니다. 접수 마감이 임박했을 수 있습니다.",
        3: "[긴급] 지금 즉시 TOPIK 시험에 접수하거나 아주대학교 국제교류팀에 문의하세요.",
    },
    "English": {
        1: "TOPIK Level 3+ is required for D-2 Visa admission. Check the upcoming exam schedule.",
        2: "You need to register for TOPIK soon. Exam registration may close shortly.",
        3: "URGENT: Register for TOPIK immediately, or contact the Ajou International Student Office.",
    },
}

# ---------------------------------------------------------------------------
# Module-level cache populated by load_templates()
# ---------------------------------------------------------------------------

_visa_cache: dict[str, dict[int, str]] = {}
_topik_cache: dict[str, dict[int, str]] = {}
_cache_loaded: bool = False


def load_templates(engine) -> None:
    """Fetch risk_msg rows from DB and fill the in-memory cache.

    Safe to call multiple times — subsequent calls are no-ops once loaded.
    Falls back silently to the hardcoded dicts if the query fails.
    """
    global _visa_cache, _topik_cache, _cache_loaded
    if _cache_loaded:
        return

    try:
        from sqlalchemy import text  # type: ignore[import-untyped]

        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT alarm_type, risk_level, lang, message FROM risk_msg")
            ).fetchall()

        visa: dict[str, dict[int, str]] = {}
        topik: dict[str, dict[int, str]] = {}

        for alarm_type, risk_level, lang, message in rows:
            if alarm_type == "visa":
                visa.setdefault(lang, {})[risk_level] = message
            elif alarm_type == "topik":
                topik.setdefault(lang, {})[risk_level] = message

        if visa:
            _visa_cache = visa
        if topik:
            _topik_cache = topik

        _cache_loaded = True
        log.info("Loaded %d risk_msg template(s) from DB.", len(rows))

    except Exception as exc:
        log.warning("Could not load risk_msg from DB — using hardcoded fallback. (%s)", exc)


def get_visa_msg(lang: str, risk: int, days_left: int | None = None) -> str:
    templates = (_visa_cache or VISA_TEMPLATES).get(lang) or (_visa_cache or VISA_TEMPLATES)["English"]
    msg = templates[risk]
    if risk == 2 and days_left is not None:
        msg = msg.format(days_left=days_left)
    return msg


def get_topik_msg(lang: str, risk: int) -> str:
    templates = (_topik_cache or TOPIK_TEMPLATES).get(lang) or (_topik_cache or TOPIK_TEMPLATES)["English"]
    return templates[risk]
