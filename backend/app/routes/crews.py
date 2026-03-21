from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

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
        SELECT cm.role, cm.joined_at, u.nickname, u.user_code
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
               u.nickname, u.user_code
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
        SELECT cc.id, cc.content, cc.created_at, u.nickname, u.user_code
        FROM community_comments cc
        JOIN users u ON cc.user_id = u.id
        WHERE cc.post_id = :post_id
        ORDER BY cc.created_at ASC
    """), {"post_id": post_id})

    return [dict(r._mapping) for r in comments.all()]


@router.delete("/{crew_id}")
async def delete_crew(crew_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await log_audit(db, admin, "crew.delete", request, "crew", crew_id)
    await db.execute(text("DELETE FROM crews WHERE id = :id"), {"id": crew_id})
    await db.commit()

    return {"message": "Crew deleted"}
