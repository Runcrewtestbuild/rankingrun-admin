from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/users", tags=["users"])


class BanRequest(BaseModel):
    reason: str = "Admin action"
    duration_days: int | None = None


@router.get("")
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


class PointAdjustRequest(BaseModel):
    amount: int
    description: str = "관리자 수동 조정"


@router.get("/{user_id}/points")
async def get_user_points(
    _admin: CurrentAdmin, db: DbSession, user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit

    items = await db.execute(text("""
        SELECT id, amount, balance_after, tx_type, description, reference_id, created_at
        FROM point_transactions
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"user_id": user_id, "limit": limit, "offset": offset})

    count = await db.execute(text(
        "SELECT COUNT(*) FROM point_transactions WHERE user_id = :user_id"
    ), {"user_id": user_id})

    balance = await db.execute(text(
        "SELECT total_points FROM users WHERE id = :id"
    ), {"id": user_id})

    return {
        "items": [dict(r._mapping) for r in items.all()],
        "total": count.scalar_one(),
        "balance": balance.scalar_one() or 0,
        "page": page,
        "limit": limit,
    }


@router.post("/{user_id}/points/adjust")
async def adjust_user_points(
    user_id: str, body: PointAdjustRequest,
    admin: CurrentAdmin, db: DbSession, request: Request,
):
    # 현재 잔액 조회
    bal = await db.execute(text(
        "SELECT total_points FROM users WHERE id = :id"
    ), {"id": user_id})
    current = bal.scalar_one_or_none()
    if current is None:
        raise HTTPException(status_code=404, detail="User not found")

    new_balance = (current or 0) + body.amount

    # 포인트 트랜잭션 기록
    await db.execute(text("""
        INSERT INTO point_transactions (user_id, amount, balance_after, tx_type, description)
        VALUES (:user_id, :amount, :balance, 'admin_adjust', :desc)
    """), {"user_id": user_id, "amount": body.amount, "balance": new_balance, "desc": body.description})

    # 유저 잔액 갱신
    await db.execute(text(
        "UPDATE users SET total_points = :balance WHERE id = :id"
    ), {"balance": new_balance, "id": user_id})

    await db.commit()
    await log_audit(db, admin, "user.points_adjust", request, "user", user_id, {
        "amount": body.amount, "new_balance": new_balance, "description": body.description,
    })

    return {"message": "Points adjusted", "new_balance": new_balance}


@router.post("/{user_id}/unban")
async def unban_user(user_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await db.execute(text("""
        UPDATE users SET is_banned = false, banned_reason = NULL, banned_until = NULL, updated_at = NOW()
        WHERE id = :id
    """), {"id": user_id})
    await db.commit()

    await log_audit(db, admin, "user.unban", request, "user", user_id)

    return {"message": "User unbanned"}
