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


@router.get("/{course_id}")
async def get_course(_admin: CurrentAdmin, db: DbSession, course_id: str):
    course = await db.execute(text("""
        SELECT c.id, c.title, c.description, c.distance_meters, c.difficulty,
               c.course_type, c.lap_count, c.elevation_gain_meters,
               c.is_public, c.tags, c.thumbnail_url,
               c.created_at, c.updated_at,
               u.nickname as creator_nickname, u.user_code as creator_code,
               ST_AsGeoJSON(c.route_geometry)::json as route_geometry,
               json_build_object(
                   'lat', ST_Y(ST_StartPoint(c.route_geometry::geometry)),
                   'lng', ST_X(ST_StartPoint(c.route_geometry::geometry))
               ) as start_point
        FROM courses c
        LEFT JOIN users u ON c.creator_id = u.id
        WHERE c.id = :id
    """), {"id": course_id})

    row = course.first()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    stats = await db.execute(text("""
        SELECT total_runs, unique_runners, avg_duration_seconds,
               avg_pace_seconds_per_km, best_duration_seconds,
               best_pace_seconds_per_km, completion_rate
        FROM course_stats WHERE course_id = :id
    """), {"id": course_id})
    stats_row = stats.first()

    recent_runs = await db.execute(text("""
        SELECT r.id, r.distance_meters, r.duration_seconds, r.avg_pace_seconds_per_km,
               r.is_flagged, r.created_at, u.nickname
        FROM run_records r
        JOIN users u ON r.user_id = u.id
        WHERE r.course_id = :id
        ORDER BY r.created_at DESC LIMIT 10
    """), {"id": course_id})

    return {
        **dict(row._mapping),
        "stats": dict(stats_row._mapping) if stats_row else None,
        "recentRuns": [dict(r._mapping) for r in recent_runs.all()],
    }


@router.get("/{course_id}/reviews")
async def get_course_reviews(
    _admin: CurrentAdmin, db: DbSession, course_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit

    reviews = await db.execute(text("""
        SELECT r.id, r.rating, r.content, r.creator_reply, r.created_at,
               u.id as user_id, u.nickname, u.user_code
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.course_id = :course_id
        ORDER BY r.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"course_id": course_id, "limit": limit, "offset": offset})

    count = await db.execute(text(
        "SELECT COUNT(*) FROM reviews WHERE course_id = :course_id"
    ), {"course_id": course_id})

    avg = await db.execute(text(
        "SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE course_id = :course_id"
    ), {"course_id": course_id})

    return {
        "items": [dict(r._mapping) for r in reviews.all()],
        "total": count.scalar_one(),
        "avg_rating": round(float(avg.scalar_one()), 1),
        "page": page,
        "limit": limit,
    }


@router.delete("/{course_id}/reviews/{review_id}")
async def delete_course_review(
    course_id: str, review_id: str,
    admin: CurrentAdmin, db: DbSession, request: Request,
):
    row = await db.execute(text(
        "SELECT id FROM reviews WHERE id = :id AND course_id = :course_id"
    ), {"id": review_id, "course_id": course_id})

    if not row.first():
        raise HTTPException(status_code=404, detail="Review not found")

    await db.execute(text("DELETE FROM reviews WHERE id = :id"), {"id": review_id})
    await db.commit()
    await log_audit(db, admin, "review.delete", request, "review", review_id)

    return {"message": "Review deleted"}


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
