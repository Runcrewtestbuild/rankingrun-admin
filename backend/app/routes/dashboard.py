from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import text

from app.auth import CurrentAdmin, DbSession

router = APIRouter(prefix="/admin-api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def stats(_admin: CurrentAdmin, db: DbSession):
    today = date.today()
    seven_days_ago = today - timedelta(days=7)

    result = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM users WHERE created_at >= :today) as new_users_today,
            (SELECT COUNT(*) FROM users WHERE created_at >= :week_ago) as new_users_week,
            (SELECT COUNT(*) FROM courses) as total_courses,
            (SELECT COUNT(*) FROM run_records) as total_runs,
            (SELECT COUNT(*) FROM run_records WHERE created_at >= :today) as runs_today,
            (SELECT COUNT(*) FROM run_records WHERE is_flagged = true) as flagged_runs,
            (SELECT COUNT(*) FROM crews) as total_crews
    """), {"today": today, "week_ago": seven_days_ago})

    row = result.one()

    return {
        "totalUsers": row.total_users,
        "newUsersToday": row.new_users_today,
        "newUsersWeek": row.new_users_week,
        "totalCourses": row.total_courses,
        "totalRuns": row.total_runs,
        "runsToday": row.runs_today,
        "flaggedRuns": row.flagged_runs,
        "totalCrews": row.total_crews,
    }


@router.get("/signup-trend")
async def signup_trend(_admin: CurrentAdmin, db: DbSession):
    thirty_days_ago = date.today() - timedelta(days=30)

    result = await db.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= :since
        GROUP BY DATE(created_at)
        ORDER BY date
    """), {"since": thirty_days_ago})

    return [{"date": str(row.date), "count": row.count} for row in result.all()]


@router.get("/run-trend")
async def run_trend(_admin: CurrentAdmin, db: DbSession):
    thirty_days_ago = date.today() - timedelta(days=30)

    result = await db.execute(text("""
        SELECT DATE(created_at) as date, COUNT(*) as count,
               COALESCE(SUM(distance_meters), 0) as total_distance
        FROM run_records
        WHERE created_at >= :since
        GROUP BY DATE(created_at)
        ORDER BY date
    """), {"since": thirty_days_ago})

    return [
        {"date": str(row.date), "count": row.count, "totalDistance": float(row.total_distance)}
        for row in result.all()
    ]
