from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit


class AdminDeleteRequest(BaseModel):
    reason: str

router = APIRouter(prefix="/admin-api/crews", tags=["crews"])


@router.get("")
async def list_crews(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
):
    offset = (page - 1) * limit

    if search:
        where = "WHERE c.name ILIKE :search"
        params = {"search": f"%{search}%", "limit": limit, "offset": offset}
    else:
        where = ""
        params = {"limit": limit, "offset": offset}

    crews = await db.execute(text(f"""
        SELECT c.id, c.name, c.description, c.logo_url, c.region,
               c.member_count, c.max_members, c.is_public, c.level,
               c.created_at, u.nickname as owner_nickname
        FROM crews c
        LEFT JOIN users u ON c.owner_id = u.id
        {where}
        ORDER BY c.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params)

    count = await db.execute(text(f"SELECT COUNT(*) FROM crews c {where}"), params)

    return {
        "items": [dict(row._mapping) for row in crews.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.get("/{crew_id}")
async def get_crew(_admin: CurrentAdmin, db: DbSession, crew_id: str):
    crew = await db.execute(text("""
        SELECT c.id, c.name, c.description, c.logo_url, c.region,
               c.member_count, c.max_members, c.is_public, c.level, c.total_xp,
               c.badge_color, c.badge_icon, c.requires_approval,
               c.recurring_schedule, c.meeting_point,
               c.created_at, u.nickname as owner_nickname
        FROM crews c
        LEFT JOIN users u ON c.owner_id = u.id
        WHERE c.id = :id
    """), {"id": crew_id})

    row = crew.first()
    if not row:
        raise HTTPException(status_code=404, detail="Crew not found")

    members = await db.execute(text("""
        SELECT u.id as user_id, cm.role, cm.joined_at, u.nickname, u.user_code
        FROM crew_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.crew_id = :id
        ORDER BY cm.joined_at
    """), {"id": crew_id})

    return {
        **dict(row._mapping),
        "members": [dict(r._mapping) for r in members.all()],
    }


@router.get("/{crew_id}/posts")
async def get_crew_posts(
    _admin: CurrentAdmin,
    db: DbSession,
    crew_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit

    posts = await db.execute(text("""
        SELECT cp.id, cp.title, cp.content, cp.post_type, cp.image_url, cp.image_urls,
               cp.like_count, cp.comment_count, cp.is_active, cp.created_at,
               cp.admin_deleted_at, cp.admin_delete_reason,
               cp.user_id, u.nickname, u.user_code
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.crew_id = :crew_id
        ORDER BY cp.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"crew_id": crew_id, "limit": limit, "offset": offset})

    count = await db.execute(text(
        "SELECT COUNT(*) FROM community_posts WHERE crew_id = :crew_id"
    ), {"crew_id": crew_id})

    return {
        "items": [dict(r._mapping) for r in posts.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.get("/{crew_id}/posts/{post_id}/comments")
async def get_post_comments(_admin: CurrentAdmin, db: DbSession, crew_id: str, post_id: str):
    comments = await db.execute(text("""
        SELECT cc.id, cc.content, cc.created_at,
               cc.admin_deleted_at, cc.admin_delete_reason,
               cc.user_id, u.nickname, u.user_code
        FROM community_comments cc
        JOIN users u ON cc.user_id = u.id
        WHERE cc.post_id = :post_id
        ORDER BY cc.created_at ASC
    """), {"post_id": post_id})

    return [dict(r._mapping) for r in comments.all()]


@router.post("/{crew_id}/posts/{post_id}/admin-delete")
async def admin_delete_post(
    crew_id: str, post_id: str, body: AdminDeleteRequest,
    admin: CurrentAdmin, db: DbSession, request: Request,
):
    post = await db.execute(text(
        "SELECT id, user_id, title, content FROM community_posts WHERE id = :id AND crew_id = :crew_id"
    ), {"id": post_id, "crew_id": crew_id})
    row = post.first()
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")

    await db.execute(text("""
        UPDATE community_posts
        SET admin_deleted_at = NOW(), admin_delete_reason = :reason, is_active = false
        WHERE id = :id
    """), {"id": post_id, "reason": body.reason})

    # 작성자에게 알림
    import json
    notif_data = json.dumps({"reason": body.reason, "content_preview": (row.content or "")[:50]})
    await db.execute(text("""
        INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, data)
        VALUES (:user_id, 'admin_delete', :user_id, :post_id, 'post', cast(:data as jsonb))
    """), {"user_id": str(row.user_id), "post_id": post_id, "data": notif_data})

    await db.commit()
    await log_audit(db, admin, "post.admin_delete", request, "post", post_id, {"reason": body.reason})

    return {"message": "Post deleted"}


@router.post("/{crew_id}/posts/{post_id}/comments/{comment_id}/admin-delete")
async def admin_delete_comment(
    crew_id: str, post_id: str, comment_id: str, body: AdminDeleteRequest,
    admin: CurrentAdmin, db: DbSession, request: Request,
):
    comment = await db.execute(text(
        "SELECT id, user_id, content FROM community_comments WHERE id = :id AND post_id = :post_id"
    ), {"id": comment_id, "post_id": post_id})
    row = comment.first()
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")

    await db.execute(text("""
        UPDATE community_comments
        SET admin_deleted_at = NOW(), admin_delete_reason = :reason
        WHERE id = :id
    """), {"id": comment_id, "reason": body.reason})

    # 작성자에게 알림
    import json
    notif_data = json.dumps({"reason": body.reason, "content_preview": (row.content or "")[:50]})
    await db.execute(text("""
        INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, data)
        VALUES (:user_id, 'admin_delete', :user_id, :comment_id, 'comment', cast(:data as jsonb))
    """), {"user_id": str(row.user_id), "comment_id": comment_id, "data": notif_data})

    await db.commit()
    await log_audit(db, admin, "comment.admin_delete", request, "comment", comment_id, {"reason": body.reason})

    return {"message": "Comment deleted"}


@router.get("/{crew_id}/join-requests")
async def get_crew_join_requests(
    _admin: CurrentAdmin, db: DbSession, crew_id: str,
    status: str = Query("pending"),
):
    where = "WHERE cjr.crew_id = :crew_id"
    if status:
        where += " AND cjr.status = :status"

    requests = await db.execute(text(f"""
        SELECT cjr.id, cjr.message, cjr.status, cjr.created_at, cjr.reviewed_at,
               u.id as user_id, u.nickname, u.user_code, u.avatar_url,
               rv.nickname as reviewer_nickname
        FROM crew_join_requests cjr
        JOIN users u ON cjr.user_id = u.id
        LEFT JOIN users rv ON cjr.reviewed_by = rv.id
        {where}
        ORDER BY cjr.created_at DESC
    """), {"crew_id": crew_id, "status": status})

    return [dict(r._mapping) for r in requests.all()]


@router.delete("/{crew_id}")
async def delete_crew(crew_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await log_audit(db, admin, "crew.delete", request, "crew", crew_id)
    await db.execute(text("DELETE FROM crews WHERE id = :id"), {"id": crew_id})
    await db.commit()

    return {"message": "Crew deleted"}
