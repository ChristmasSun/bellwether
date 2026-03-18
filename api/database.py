"""
Database setup and session management.
"""
import os
import sqlite3
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import StaticPool

from api.models import Base

DB_PATH = os.environ.get("DB_PATH", "polls.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"
SYNC_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Enable WAL mode directly on the file before SQLAlchemy touches it
_db_dir = os.path.dirname(os.path.abspath(DB_PATH)) or "."
os.makedirs(_db_dir, exist_ok=True)
_conn = sqlite3.connect(DB_PATH)
_conn.execute("PRAGMA journal_mode=WAL")
_conn.execute("PRAGMA busy_timeout=10000")
_conn.close()

# Async engine for FastAPI
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"timeout": 30},
)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)

# Sync engine for scripts/scrapers
sync_engine = create_engine(SYNC_DATABASE_URL, echo=False)


# Set pragmas on every new connection
@event.listens_for(sync_engine, "connect")
def _set_sqlite_pragmas_sync(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=10000")
    cursor.close()


async def init_db():
    """Create all tables and run lightweight migrations."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Set pragmas for this connection
        await conn.execute(text("PRAGMA busy_timeout=10000"))

        # Lightweight migration: add columns that may be missing on older DBs
        for col, col_type, default in [
            ("called", "BOOLEAN", "0"),
            ("called_winner", "VARCHAR", "NULL"),
        ]:
            try:
                await conn.execute(
                    text(f"ALTER TABLE senate_races ADD COLUMN {col} {col_type} DEFAULT {default}")
                )
            except Exception:
                pass  # column already exists


async def get_db() -> AsyncSession:
    """FastAPI dependency for DB sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
