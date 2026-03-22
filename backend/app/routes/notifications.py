import json

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/notifications", tags=["notifications"])


class SendNotificationRequest(BaseModel):
    user_ids: list[str] | None = None  # None = 전체 발송
    title: str
    message: str


@router.get("/stats")
async def notification_stats(_admin: CurrentAdmin, db: DbSession):
    result = await db.execute(text("""
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_read) as read_count,
            COUNT(*) FILTER (WHERE NOT is_read) as unread_count,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(*) FILTER (WHERE type = 'admin_notice') as admin_notices
        FROM notifications
    """))
    row = result.first()
    return dict(row._mapping) if row else {}


@router.get("/history")
async def notification_history(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit

    items = await db.execute(text("""
        SELECT n.id, n.user_id, n.type, n.target_type, n.data,
               n.is_read, n.created_at,
               u.nickname, u.user_code
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.type = 'admin_notice'
        ORDER BY n.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset})

    count = await db.execute(text(
        "SELECT COUNT(*) FROM notifications WHERE type = 'admin_notice'"
    ))

    return {
        "items": [dict(r._mapping) for r in items.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.post("/send")
async def send_notification(
    body: SendNotificationRequest,
    admin: CurrentAdmin, db: DbSession, request: Request,
):
    notif_data = json.dumps({"title": body.title, "message": body.message})

    if body.user_ids:
        # 특정 유저에게 발송
        for uid in body.user_ids:
            await db.execute(text("""
                INSERT INTO notifications (user_id, type, actor_id, target_type, data)
                VALUES (:user_id, 'admin_notice', :admin_id, 'admin', cast(:data as jsonb))
            """), {"user_id": uid, "admin_id": str(admin.id), "data": notif_data})
        sent_count = len(body.user_ids)
    else:
        # 전체 유저에게 발송
        result = await db.execute(text("""
            INSERT INTO notifications (user_id, type, actor_id, target_type, data)
            SELECT id, 'admin_notice', :admin_id, 'admin', cast(:data as jsonb)
            FROM users
            WHERE is_banned = false OR is_banned IS NULL
        """), {"admin_id": str(admin.id), "data": notif_data})
        sent_count = result.rowcount

    await db.commit()
    await log_audit(db, admin, "notification.send", request, "notification", None, {
        "title": body.title,
        "target": body.user_ids or "all",
        "sent_count": sent_count,
    })

    return {"message": f"Sent to {sent_count} users", "sent_count": sent_count}


@router.get("/device-stats")
async def device_stats(_admin: CurrentAdmin, db: DbSession):
    result = await db.execute(text("""
        SELECT
            platform,
            COUNT(*) as count,
            COUNT(DISTINCT user_id) as unique_users
        FROM device_tokens
        GROUP BY platform
    """))
    return [dict(r._mapping) for r in result.all()]
