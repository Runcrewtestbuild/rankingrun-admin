"""
초기 super_admin 계정 생성 스크립트
실행: python -m scripts.create_admin <email> <password> [name]
"""
import asyncio
import sys

from sqlalchemy import select

from app.db import async_session_factory, engine
from app.models import AdminAccount, Base
from app.auth import hash_password


async def main():
    if len(sys.argv) < 3:
        print("Usage: python -m scripts.create_admin <email> <password> [name]")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "Super Admin"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        existing = await session.execute(select(AdminAccount).where(AdminAccount.email == email))
        if existing.scalar_one_or_none():
            print(f"Admin {email} already exists")
            sys.exit(1)

        admin = AdminAccount(
            email=email,
            password_hash=hash_password(password),
            name=name,
            role="super_admin",
        )
        session.add(admin)
        await session.commit()
        print(f"Created super_admin: {email} ({admin.id})")

    await engine.dispose()


asyncio.run(main())
