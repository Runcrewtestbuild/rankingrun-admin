from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/courses", tags=["courses"])


@router.get("")
async def list_courses(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
):
    offset = (page - 1) * limit

    if search:
        where = "WHERE c.title ILIKE :search"
        params = {"search": f"%{search}%", "limit": limit, "offset": offset}
    else:
        where = ""
        params = {"limit": limit, "offset": offset}

    courses = await db.execute(text(f"""
        SELECT c.id, c.title, c.distance_meters, c.difficulty, c.is_public,
               c.created_at, u.nickname as creator_nickname,
               cs.total_runs, cs.unique_runners
        FROM courses c
        LEFT JOIN users u ON c.creator_id = u.id
        LEFT JOIN course_stats cs ON cs.course_id = c.id
        {where}
        ORDER BY c.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params)

    count = await db.execute(text(f"SELECT COUNT(*) FROM courses c {where}"), params)

    return {
        "items": [dict(row._mapping) for row in courses.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.post("/{course_id}/toggle-public")
async def toggle_public(course_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    result = await db.execute(text("""
        UPDATE courses SET is_public = NOT is_public, updated_at = NOW()
        WHERE id = :id RETURNING id, is_public
    """), {"id": course_id})

    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    await db.commit()
    await log_audit(db, admin, "course.toggle_public", request, "course", course_id, {"is_public": row.is_public})

    return dict(row._mapping)


@router.delete("/{course_id}")
async def delete_course(course_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await log_audit(db, admin, "course.delete", request, "course", course_id)
    await db.execute(text("DELETE FROM courses WHERE id = :id"), {"id": course_id})
    await db.commit()

    return {"message": "Course deleted"}
