# 파일 기능: 회원가입/로그인/JWT 인증 및 내 정보 조회 API를 제공한다.
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID as UUIDType

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, status
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7
JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is missing. Set JWT_SECRET in backend/.env or container env.")


class RegisterRequest(BaseModel):
    # 회원가입 요청 바디 모델
    email: str
    full_name: str
    password: str


class LoginRequest(BaseModel):
    # 로그인 요청 바디 모델
    email: str
    password: str


def _validate_email(email: str) -> str:
    # 입력: email (원본 문자열)
    # 출력: str (정규화된 이메일) 또는 HTTPException
    normalized = email.strip().lower()
    if "@" not in normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email")
    local, _, domain = normalized.partition("@")
    if not local or "." not in domain:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email")
    return normalized


def _create_access_token(user_id: str) -> str:
    # 입력: user_id (사용자 UUID 문자열)
    # 출력: str (JWT 액세스 토큰)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_EXPIRE_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_bearer_token(authorization: Optional[str] = Header(default=None)) -> str:
    # 입력: authorization 헤더
    # 출력: str (토큰의 subject 값)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid bearer token")

    token = authorization[len("Bearer ") :].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token payload missing subject")
    return str(user_id)


def _parse_user_id(user_id: str = Depends(_decode_bearer_token)) -> UUIDType:
    # 입력: user_id (토큰에서 추출된 문자열)
    # 출력: UUIDType (유효한 사용자 UUID)
    try:
        return UUIDType(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject") from exc


@router.post("/register", status_code=status.HTTP_201_CREATED)

# 입력: RegisterRequest, DB 세션
# 출력: dict (생성된 사용자 요약)
# db: Session = Depends(get_db) 는 database.py 의 get_db() 에서 세션을 받아옴
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = _validate_email(body.email)
    full_name = body.full_name.strip()
    password = body.password

    if not full_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="full_name is required")
    if len(password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="password too short")

    # ORM 객체 생성 (backend/app/models.py)
    user = User(
        email=email,
        full_name=full_name,
        password_hash=pwd_context.hash(password),
    )

    try:
        db.add(user)        # SQLAlchemy 세션에 user 객체를 등록 (아직 DB에 저장되지는 않음)
        db.commit()         # 트랜잭션을 확정하여 PostgreSQL users 테이블에 INSERT 실행
        db.refresh(user)    # DB에 저장된 최신 상태(id, created_at 등)를 다시 user 객체에 반영
    
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already exists. Use another email."
        ) from exc

    # 회원가입 성공 -> 클라이언트에게 user.id, user.email 반환
    return {"id": str(user.id), "email": user.email}


@router.post("/login")
# 입력: LoginRequest, DB 세션
# 출력: dict (access_token, token_type)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    email = _validate_email(body.email)
    password = body.password

    user = db.query(User).filter(User.email == email).one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not pwd_context.verify(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = _create_access_token(str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
# 입력: 인증된 사용자 UUID, DB 세션
# 출력: dict (사용자 정보)
def me(user_uuid: UUIDType = Depends(_parse_user_id), db: Session = Depends(get_db)):
    current_user = db.get(User, user_uuid)
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"id": str(current_user.id), "email": current_user.email, "full_name": current_user.full_name}
