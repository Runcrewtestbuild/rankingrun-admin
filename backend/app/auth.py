from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models import AdminAccount, AdminAuditLog

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(admin_id: str, email: str, role: str) -> str:
    payload = {
        "sub": admin_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.ADMIN_JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.ADMIN_JWT_SECRET, algorithm=settings.ADMIN_JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.ADMIN_JWT_SECRET, algorithms=[settings.ADMIN_JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminAccount:
    payload = decode_token(credentials.credentials)

    result = await db.execute(select(AdminAccount).where(AdminAccount.id == payload["sub"]))
    admin = result.scalar_one_or_none()

    if not admin or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account disabled")

    return admin


CurrentAdmin = Annotated[AdminAccount, Depends(get_current_admin)]
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def log_audit(
    db: AsyncSession,
    admin: AdminAccount,
    action: str,
    request: Request,
    target_type: str | None = None,
    target_id: str | None = None,
    details: dict | None = None,
):
    log = AdminAuditLog(
        admin_id=admin.id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    await db.commit()
