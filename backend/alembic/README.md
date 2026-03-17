# backend/alembic/

## 역할

Alembic을 이용한 데이터베이스 마이그레이션 관리 디렉토리입니다. 스키마 변경 이력을 버전 파일로 관리하며, `alembic upgrade` / `alembic downgrade` 명령으로 적용합니다.

## 파일 구조

```
alembic/
├── env.py              # Alembic 런타임 설정 (DB URL, ORM 연결)
├── script.py.mako      # 마이그레이션 파일 생성 템플릿
└── versions/           # 마이그레이션 리비전 파일
    ├── e97b8af26a78_baseline_schema.py
    ├── c3f2a6d8b1c0_merge_categories_into_keywords.py
    ├── b12d9c3e7a01_cleanup_runtime_indexes.py
    └── 6f4a2d1c9e11_drop_notice_keywords_table.py
```

---

## 파일별 설명

### env.py — Alembic 런타임 설정

Alembic이 마이그레이션을 실행할 때 사용하는 환경 설정 파일입니다. `app.database`에서 `Base`와 DB URL을 가져와 Alembic 컨텍스트에 연결합니다.

---

### versions/ — 마이그레이션 리비전 파일

각 파일은 `upgrade()` 와 `downgrade()` 함수를 포함합니다.

| 파일 | 설명 |
|------|------|
| `e97b8af26a78_baseline_schema.py` | 초기 스키마 생성 (`users`, `keywords`, `notices`, `user_keywords`, `alert_outbox`) |
| `c3f2a6d8b1c0_merge_categories_into_keywords.py` | 카테고리 테이블을 키워드로 통합 |
| `b12d9c3e7a01_cleanup_runtime_indexes.py` | 런타임 성능 최적화를 위한 인덱스 정리 |
| `6f4a2d1c9e11_drop_notice_keywords_table.py` | 더 이상 사용하지 않는 `notice_keywords` 테이블 제거 |

---

## 주요 명령어

```bash
# 최신 상태로 마이그레이션 적용
alembic upgrade head

# 이전 리비전으로 롤백
alembic downgrade -1

# 새 마이그레이션 파일 자동 생성
alembic revision --autogenerate -m "변경 내용 설명"

# 현재 적용된 리비전 확인
alembic current
```
