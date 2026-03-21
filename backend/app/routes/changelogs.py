from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession

router = APIRouter(prefix="/admin-api/changelogs", tags=["changelogs"])


class ChangelogCreate(BaseModel):
    categories: list[str]  # ["ui", "db", "feature"]
    title: str
    description: str | None = None
    author: str | None = None
    version: str | None = None


class CommentCreate(BaseModel):
    content: str


@router.get("")
async def list_changelogs(
    _admin: CurrentAdmin,
    db: DbSession,
    category: str = Query("", description="ui, db, feature or empty for all"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    where = "WHERE c.categories @> :cat_filter::jsonb" if category else ""
    params: dict = {"limit": limit, "offset": offset}
    if category:
        params["cat_filter"] = f'["{category}"]'

    rows = await db.execute(text(f"""
        SELECT c.*, (SELECT COUNT(*) FROM admin_changelog_comments cc WHERE cc.changelog_id = c.id) as comment_count
        FROM admin_changelogs c
        {where}
        ORDER BY c.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params)

    count_params = {"cat_filter": f'["{category}"]'} if category else {}
    count = await db.execute(text(f"SELECT COUNT(*) FROM admin_changelogs c {where}"), count_params)

    return {
        "items": [dict(r._mapping) for r in rows.all()],
        "total": count.scalar_one(),
        "page": page,
        "limit": limit,
    }


@router.post("", status_code=201)
async def create_changelog(body: ChangelogCreate, admin: CurrentAdmin, db: DbSession):
    import json
    author = body.author or admin.name
    result = await db.execute(text("""
        INSERT INTO admin_changelogs (categories, title, description, author, version)
        VALUES (:categories::jsonb, :title, :description, :author, :version)
        RETURNING id, categories, title, description, author, version, created_at
    """), {
        "categories": json.dumps(body.categories),
        "title": body.title,
        "description": body.description,
        "author": author,
        "version": body.version,
    })
    await db.commit()
    return dict(result.first()._mapping)


@router.delete("/{changelog_id}")
async def delete_changelog(_admin: CurrentAdmin, db: DbSession, changelog_id: str):
    result = await db.execute(text("DELETE FROM admin_changelogs WHERE id = :id RETURNING id"), {"id": changelog_id})
    if not result.first():
        raise HTTPException(status_code=404, detail="Changelog not found")
    await db.commit()
    return {"message": "Deleted"}


@router.get("/{changelog_id}/comments")
async def get_comments(_admin: CurrentAdmin, db: DbSession, changelog_id: str):
    rows = await db.execute(text("""
        SELECT id, author, content, created_at
        FROM admin_changelog_comments
        WHERE changelog_id = :id
        ORDER BY created_at ASC
    """), {"id": changelog_id})
    return [dict(r._mapping) for r in rows.all()]


@router.post("/{changelog_id}/comments", status_code=201)
async def add_comment(changelog_id: str, body: CommentCreate, admin: CurrentAdmin, db: DbSession):
    result = await db.execute(text("""
        INSERT INTO admin_changelog_comments (changelog_id, author, content)
        VALUES (:changelog_id, :author, :content)
        RETURNING id, author, content, created_at
    """), {"changelog_id": changelog_id, "author": admin.name, "content": body.content})
    await db.commit()
    return dict(result.first()._mapping)


@router.delete("/{changelog_id}/comments/{comment_id}")
async def delete_comment(_admin: CurrentAdmin, db: DbSession, changelog_id: str, comment_id: str):
    await db.execute(text("DELETE FROM admin_changelog_comments WHERE id = :id"), {"id": comment_id})
    await db.commit()
    return {"message": "Deleted"}
