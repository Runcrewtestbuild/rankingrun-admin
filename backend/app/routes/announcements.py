from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession, log_audit

router = APIRouter(prefix="/admin-api/announcements", tags=["announcements"])


class AnnouncementCreate(BaseModel):
    title: str
    content: str


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    is_active: bool | None = None


@router.get("/")
async def list_announcements(
    _admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit

    items = await db.execute(text("""
        SELECT id, title, content, is_active, created_at, updated_at
        FROM announcements
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset})

    count = await db.execute(text("SELECT COUNT(*) FROM announcements"))

    return {
        "items": [dict(row._mapping) for row in items.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.post("/")
async def create_announcement(body: AnnouncementCreate, admin: CurrentAdmin, db: DbSession, request: Request):
    result = await db.execute(text("""
        INSERT INTO announcements (title, content, is_active)
        VALUES (:title, :content, true)
        RETURNING id, title, content, is_active, created_at
    """), {"title": body.title, "content": body.content})

    row = result.first()
    await db.commit()

    await log_audit(db, admin, "announcement.create", request, "announcement", str(row.id))

    return dict(row._mapping)


@router.patch("/{announcement_id}")
async def update_announcement(
    announcement_id: str,
    body: AnnouncementUpdate,
    admin: CurrentAdmin,
    db: DbSession,
    request: Request,
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = announcement_id

    result = await db.execute(text(f"""
        UPDATE announcements SET {set_clauses}, updated_at = NOW()
        WHERE id = :id RETURNING id, title, content, is_active, updated_at
    """), updates)

    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")

    await db.commit()
    await log_audit(db, admin, "announcement.update", request, "announcement", announcement_id)

    return dict(row._mapping)


@router.delete("/{announcement_id}")
async def delete_announcement(announcement_id: str, admin: CurrentAdmin, db: DbSession, request: Request):
    await log_audit(db, admin, "announcement.delete", request, "announcement", announcement_id)
    await db.execute(text("DELETE FROM announcements WHERE id = :id"), {"id": announcement_id})
    await db.commit()

    return {"message": "Deleted"}
