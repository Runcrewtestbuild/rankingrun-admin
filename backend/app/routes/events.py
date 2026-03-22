from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/events", tags=["events"])


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_active: bool | None = None
    max_participants: int | None = None


@router.get("")
async def list_events(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query("", description="all, active, ended"),
):
    offset = (page - 1) * limit

    where_clauses = []
    if status == "active":
        where_clauses.append("e.is_active = true AND (e.ends_at IS NULL OR e.ends_at > NOW())")
    elif status == "ended":
        where_clauses.append("(e.is_active = false OR e.ends_at <= NOW())")

    where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    events = await db.execute(text(f"""
        SELECT e.id, e.title, e.description, e.event_type, e.is_active,
               e.starts_at, e.ends_at, e.max_participants,
               e.target_distance_meters, e.target_runs,
               e.badge_color, e.badge_icon,
               e.created_at,
               c.title as course_title,
               COUNT(ep.id) as participant_count
        FROM events e
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN event_participants ep ON ep.event_id = e.id
        {where}
        GROUP BY e.id, c.title
        ORDER BY e.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset})

    count = await db.execute(text(f"SELECT COUNT(*) FROM events e {where}"))

    return {
        "items": [dict(r._mapping) for r in events.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.get("/{event_id}")
async def get_event(_admin: CurrentAdmin, db: DbSession, event_id: str):
    event = await db.execute(text("""
        SELECT e.*, c.title as course_title, u.nickname as creator_nickname
        FROM events e
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN users u ON e.creator_id = u.id
        WHERE e.id = :id
    """), {"id": event_id})

    row = event.first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")

    participants = await db.execute(text("""
        SELECT ep.user_id, ep.progress_distance_meters, ep.progress_runs,
               ep.completed, ep.joined_at,
               u.nickname, u.user_code
        FROM event_participants ep
        JOIN users u ON ep.user_id = u.id
        WHERE ep.event_id = :id
        ORDER BY ep.completed DESC, ep.progress_distance_meters DESC
    """), {"id": event_id})

    stats = await db.execute(text("""
        SELECT
            COUNT(*) as total_participants,
            COUNT(*) FILTER (WHERE completed) as completed_count,
            COALESCE(SUM(progress_distance_meters), 0) as total_distance,
            COALESCE(SUM(progress_runs), 0) as total_runs
        FROM event_participants WHERE event_id = :id
    """), {"id": event_id})

    stats_row = stats.first()

    return {
        **dict(row._mapping),
        "participants": [dict(r._mapping) for r in participants.all()],
        "stats": dict(stats_row._mapping) if stats_row else {},
    }


@router.patch("/{event_id}")
async def update_event(
    event_id: str, body: EventUpdate,
    admin: CurrentAdmin, db: DbSession, request: Request,
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = event_id

    result = await db.execute(text(f"""
        UPDATE events SET {set_clauses}, updated_at = NOW()
        WHERE id = :id RETURNING id
    """), updates)

    if not result.first():
        raise HTTPException(status_code=404, detail="Event not found")

    await db.commit()
    await log_audit(db, admin, "event.update", request, "event", event_id, updates)

    return {"message": "Event updated"}


@router.post("/{event_id}/toggle-active")
async def toggle_event_active(
    event_id: str, admin: CurrentAdmin, db: DbSession, request: Request,
):
    result = await db.execute(text("""
        UPDATE events SET is_active = NOT is_active, updated_at = NOW()
        WHERE id = :id RETURNING id, is_active
    """), {"id": event_id})

    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.commit()
    await log_audit(db, admin, "event.toggle_active", request, "event", event_id)

    return {"message": "Toggled", "is_active": row.is_active}
