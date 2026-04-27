# backend/alembic

백엔드 데이터베이스 스키마 변경 이력을 관리하는 Alembic 마이그레이션 디렉토리입니다.

## 현재 상태

- 현재 최신 마이그레이션 head: `a8b9c0d1e2f3`
- 로컬 DB의 Alembic 버전 표시는 아래 명령으로 최신 head에 맞췄습니다.

```bash
python -m alembic stamp head --purge
```

이 명령은 DB의 `alembic_version` 값만 수정합니다. 실제 테이블 생성, 컬럼 추가, 인덱스 변경 같은 스키마 변경은 실행하지 않습니다.

따라서 DB 스키마가 이미 최신 마이그레이션 상태와 같다고 확신할 때만 사용해야 합니다.

## 리비전 순서

```text
e97b8af26a78
  -> b12d9c3e7a01
  -> c3f2a6d8b1c0
  -> 6f4a2d1c9e11
  -> cf02b2a86bf8
  -> a8b9c0d1e2f3 (head)
```

## 파일 설명

| 파일 | 설명 |
| --- | --- |
| `env.py` | Alembic 실행 시 DB 설정과 SQLAlchemy metadata를 불러옵니다. |
| `script.py.mako` | 새 마이그레이션 파일을 만들 때 사용하는 템플릿입니다. |
| `versions/e97b8af26a78_baseline_schema.py` | 초기 스키마 기준 마이그레이션입니다. |
| `versions/b12d9c3e7a01_cleanup_runtime_indexes.py` | 런타임 인덱스를 정리합니다. |
| `versions/c3f2a6d8b1c0_merge_categories_into_keywords.py` | 카테고리와 키워드 관련 스키마를 병합합니다. |
| `versions/6f4a2d1c9e11_drop_notice_keywords_table.py` | 사용하지 않는 `notice_keywords` 테이블을 제거합니다. |
| `versions/cf02b2a86bf8_fix_embedding_size.py` | 임베딩 벡터 크기를 수정합니다. |
| `versions/a8b9c0d1e2f3_add_expo_push_token_to_users.py` | 사용자 테이블에 Expo push token 지원을 추가합니다. |

## 자주 쓰는 명령어

명령어는 `backend/` 디렉토리에서 실행합니다.

```bash
# versions 폴더 기준 최신 head 확인
python -m alembic heads

# 현재 연결된 DB에 기록된 Alembic revision 확인
python -m alembic current

# 최신 head까지 마이그레이션 적용
python -m alembic upgrade head

# 마이그레이션 하나 롤백
python -m alembic downgrade -1

# SQLAlchemy 모델 변경을 기준으로 새 마이그레이션 생성
python -m alembic revision --autogenerate -m "변경 내용 설명"
```

## 누락된 리비전 오류 복구

아래와 같은 오류가 발생할 수 있습니다.

```text
Can't locate revision identified by '<revision_id>'
```

이 오류는 DB의 `alembic_version` 테이블이 가리키는 revision 파일이 `backend/alembic/versions` 폴더에 없을 때 발생합니다.

DB 스키마가 이미 최신 상태와 동일하다고 확인된 경우, 아래 명령으로 DB에 기록된 revision 값을 최신 head로 다시 맞출 수 있습니다.

```bash
python -m alembic stamp head --purge
python -m alembic current
```

정상 결과는 다음과 같습니다.

```text
a8b9c0d1e2f3 (head)
```

주의: `stamp head --purge`는 실제 마이그레이션을 실행하지 않습니다. 스키마 변경이 필요한 DB에서는 `python -m alembic upgrade head`를 사용해야 합니다.
