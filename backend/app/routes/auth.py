from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.auth import (
    CurrentAdmin,
    DbSession,
    create_token,
    hash_password,
    verify_password,
)
from app.models import AdminAccount

router = APIRouter(prefix="/admin-api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    admin: dict


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def login(body: LoginRequest, db: DbSession):
    result = await db.execute(select(AdminAccount).where(AdminAccount.email == body.email))
    admin = result.scalar_one_or_none()

    if not admin or not admin.is_active or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    admin.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    token = create_token(str(admin.id), admin.email, admin.role)

    return {
        "token": token,
        "admin": {"id": str(admin.id), "email": admin.email, "name": admin.name, "role": admin.role},
    }


@router.get("/me")
async def me(admin: CurrentAdmin):
    return {
        "admin": {
            "id": str(admin.id),
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
            "last_login_at": admin.last_login_at,
        }
    }


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, admin: CurrentAdmin, db: DbSession):
    if not verify_password(body.current_password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    admin.password_hash = hash_password(body.new_password)
    await db.commit()

    return {"message": "Password changed"}
