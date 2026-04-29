from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class NoticeRow:
    # 기존(DB/CSV 헤더)
    source_type: str
    source_name: str
    source_url: str
    source_notice_id: Optional[str]
    title: str
    body: str
    eng_body: Optional[str] = None
    published_at: Optional[str] = None
    deadline_at: Optional[str] = None
    dedupe_hash: str = ""
    is_processed: bool = False
    is_embedded: bool = False
    is_deleted: bool = False
    created_at: str = ""
    updated_at: str = ""

    # 정제 확장 컬럼
    published_at_raw: Optional[str] = None
    published_at_inferred: Optional[str] = None
    published_at_final: Optional[str] = None
    published_at_confidence: Optional[str] = None
    notice_tag: Optional[str] = None
    category_final: Optional[str] = None
    category_reason: Optional[str] = None
    deadline_text: Optional[str] = None
    content_hash: Optional[str] = None

    def to_row(self) -> Dict[str, Any]:
        return {
            # base
            "source_type": self.source_type,
            "source_name": self.source_name,
            "source_url": self.source_url,
            "source_notice_id": self.source_notice_id,
            "title": self.title,
            "body": self.body,
            "eng_body": self.eng_body,
            "published_at": self.published_at,
            "deadline_at": self.deadline_at,
            "dedupe_hash": self.dedupe_hash,
            "is_processed": self.is_processed,
            "is_embedded": self.is_embedded,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at,
            "updated_at": self.updated_at,

            # enriched
            "published_at_raw": self.published_at_raw,
            "published_at_inferred": self.published_at_inferred,
            "published_at_final": self.published_at_final,
            "published_at_confidence": self.published_at_confidence,
            "notice_tag": self.notice_tag,
            "category_final": self.category_final,
            "category_reason": self.category_reason,
            "deadline_text": self.deadline_text,
            "content_hash": self.content_hash,
        }
@dataclass
class TopikScheduleRow:
    category: str
    round_label: str
    apply_start: Optional[str]
    apply_end: Optional[str]
    apply_status: Optional[str]
    exam_date_kr: Optional[str]
    exam_date_global: Optional[str]
    exam_date_asia: Optional[str]
    exam_level: Optional[str]
    result_announce_at: Optional[str]
    notice_link: Optional[str]
    source_url: str 