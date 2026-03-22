from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/reviews", tags=["reviews"])


@router.get("")
async def list_reviews(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
):
    offset = (page - 1) * limit

    if search:
        where = "WHERE r.content ILIKE :search OR u.nickname ILIKE :search OR c.title ILIKE :search"
        params = {"search": f"%{search}%", "limit": limit, "offset": offset}
    else:
        where = ""
        params = {"limit": limit, "offset": offset}

    reviews = await db.execute(text(f"""
        SELECT r.id, r.rating, r.content, r.creator_reply, r.created_at,
               u.id as user_id, u.nickname, u.user_code,
               c.id as course_id, c.title as course_title
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN courses c ON r.course_id = c.id
        {where}
        ORDER BY r.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params)

    count = await db.execute(text(f"""
        SELECT COUNT(*) FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN courses c ON r.course_id = c.id
        {where}
    """), params)

    return {
        "items": [dict(r._mapping) for r in reviews.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.delete("/{review_id}")
async def delete_review(
    review_id: str, admin: CurrentAdmin, db: DbSession, request: Request,
):
    row = await db.execute(text(
        "SELECT id FROM reviews WHERE id = :id"
    ), {"id": review_id})

    if not row.first():
        raise HTTPException(status_code=404, detail="Review not found")

    await db.execute(text("DELETE FROM reviews WHERE id = :id"), {"id": review_id})
    await db.commit()
    await log_audit(db, admin, "review.delete", request, "review", review_id)

    return {"message": "Review deleted"}
