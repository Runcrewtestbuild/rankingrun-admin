from fastapi import APIRouter, Query, Request
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/runs", tags=["runs"])


@router.get("/flagged")
async def flagged_runs(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit

    runs = await db.execute(text("""
        SELECT r.id, r.distance_meters, r.duration_seconds, r.avg_pace_seconds_per_km,
               r.max_speed_ms, r.is_flagged, r.flag_reason, r.created_at,
               u.nickname, u.user_code,
               c.title as course_title
        FROM run_records r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN courses c ON r.course_id = c.id
        WHERE r.is_flagged = true
        ORDER BY r.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset})

    count = await db.execute(text("SELECT COUNT(*) FROM run_records WHERE is_flagged = true"))

    return {
        "items": [dict(row._mapping) for row in runs.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.get("")
async def list_runs(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit

    runs = await db.execute(text("""
        SELECT r.id, r.distance_meters, r.duration_seconds, r.avg_pace_seconds_per_km,
               r.is_flagged, r.flag_reason, r.created_at,
               u.nickname, u.user_code
        FROM run_records r
        JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset})

    count = await db.execute(text("SELECT COUNT(*) FROM run_records"))

    return {
        "items": [dict(row._mapping) for row in runs.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.post("/{run_id}/unflag")
async def unflag_run(run_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await db.execute(text("""
        UPDATE run_records SET is_flagged = false, flag_reason = NULL WHERE id = :id
    """), {"id": run_id})
    await db.commit()

    await log_audit(db, admin, "run.unflag", request, "run_record", run_id)

    return {"message": "Run unflagged"}


@router.delete("/{run_id}")
async def delete_run(run_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await log_audit(db, admin, "run.delete", request, "run_record", run_id)
    await db.execute(text("DELETE FROM run_records WHERE id = :id"), {"id": run_id})
    await db.commit()

    return {"message": "Run deleted"}
