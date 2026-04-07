import hashlib

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def make_dedupe_hash(source_url: str) -> str:
    # 중복 방지: URL 기반이 가장 안정적
    return sha256_hex(f"url:{source_url}")

def make_content_hash(title: str, body: str) -> str:
    # 수정 감지/내용 기반 검색품질 향상용
    normalized = f"title:{title.strip()}\nbody:{body.strip()}"
    return sha256_hex(normalized)
