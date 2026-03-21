from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/users", tags=["users"])


class BanRequest(BaseModel):
    reason: str = "Admin action"
    duration_days: int | None = None


@router.get("/")
async def list_users(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
):
    offset = (page - 1) * limit

    if search:
        where = "WHERE nickname ILIKE :search OR email ILIKE :search OR user_code ILIKE :search"
        params = {"search": f"%{search}%", "limit": limit, "offset": offset}
    else:
        where = ""
        params = {"limit": limit, "offset": offset}

    users = await db.execute(text(f"""
        SELECT id, user_code, email, nickname, avatar_url, total_distance_meters,
               total_runs, runner_level, is_banned, created_at
        FROM users {where}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """), params)

    count = await db.execute(text(f"SELECT COUNT(*) as cnt FROM users {where}"), params)

    return {
        "items": [dict(row._mapping) for row in users.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.get("/{user_id}")
async def get_user(_admin: CurrentAdmin, db: DbSession, user_id: str):
    user = await db.execute(text("""
        SELECT id, user_code, email, nickname, avatar_url, bio,
               total_distance_meters, total_runs, total_points, runner_level,
               is_banned, banned_reason, banned_until,
               consent_terms_at, consent_privacy_at, consent_location_at,
               created_at, updated_at
        FROM users WHERE id = :id
    """), {"id": user_id})

    row = user.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    recent_runs = await db.execute(text("""
        SELECT id, distance_meters, duration_seconds, avg_pace_seconds_per_km,
               is_flagged, flag_reason, created_at
        FROM run_records WHERE user_id = :id
        ORDER BY created_at DESC LIMIT 10
    """), {"id": user_id})

    social = await db.execute(text("""
        SELECT provider, provider_email, created_at
        FROM social_accounts WHERE user_id = :id
    """), {"id": user_id})

    return {
        **dict(row._mapping),
        "recentRuns": [dict(r._mapping) for r in recent_runs.all()],
        "socialAccounts": [dict(r._mapping) for r in social.all()],
    }


@router.post("/{user_id}/ban")
async def ban_user(user_id: str, body: BanRequest, admin: CurrentAdmin, db: DbSession, request: Request):
    banned_until = None
    if body.duration_days:
        from datetime import datetime, timedelta, timezone
        banned_until = datetime.now(timezone.utc) + timedelta(days=body.duration_days)

    await db.execute(text("""
        UPDATE users SET is_banned = true, banned_reason = :reason, banned_until = :until, updated_at = NOW()
        WHERE id = :id
    """), {"reason": body.reason, "until": banned_until, "id": user_id})
    await db.commit()

    await log_audit(db, admin, "user.ban", request, "user", user_id, {"reason": body.reason})

    return {"message": "User banned"}


@router.post("/{user_id}/unban")
async def unban_user(user_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await db.execute(text("""
        UPDATE users SET is_banned = false, banned_reason = NULL, banned_until = NULL, updated_at = NOW()
        WHERE id = :id
    """), {"id": user_id})
    await db.commit()

    await log_audit(db, admin, "user.unban", request, "user", user_id)

    return {"message": "User unbanned"}
