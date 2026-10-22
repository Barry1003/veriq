"""Separate database per application; portable relational persistence."""

import hashlib
from contextlib import contextmanager

from sqlalchemy import (
    JSON,
    Integer,
    String,
    UniqueConstraint,
    create_engine,
    event,
    or_,
    select,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column
from sqlalchemy.pool import StaticPool

from shared.contracts import now, uid


class Base(DeclarativeBase):
    pass


class Row(Base):
    __tablename__ = "domain_records"
    __table_args__ = (UniqueConstraint("scope", "kind", "key", name="uq_record_identity"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    scope: Mapped[str] = mapped_column(String(220), index=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    key: Mapped[str] = mapped_column(String(250))
    classification: Mapped[str] = mapped_column(String(20), default="internal")
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    data: Mapped[dict] = mapped_column(JSON)


class Feed(Base):
    __tablename__ = "source_feed"
    sequence: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(220), index=True)
    envelope: Mapped[dict] = mapped_column(JSON)


class Database:
    def __init__(self, url: str):
        options = {}
        if url.startswith("sqlite"):
            options["connect_args"] = {"check_same_thread": False, "timeout": 30}
            if url.endswith(":memory:"):
                options["poolclass"] = StaticPool
        self.engine = create_engine(url, **options)
        if url.startswith("sqlite"):

            @event.listens_for(self.engine, "connect")
            def sqlite_settings(connection, _):
                connection.isolation_level = None
                connection.execute("PRAGMA foreign_keys=ON")
                connection.execute("PRAGMA busy_timeout=30000")

            @event.listens_for(self.engine, "begin")
            def sqlite_begin(connection):
                # SQLite is the single-writer developer fallback. Acquire its write lock
                # before reading mutable bank balances or investigation revision counters.
                connection.exec_driver_sql("BEGIN IMMEDIATE")

    def create_schema(self):
        Base.metadata.create_all(self.engine)

    @contextmanager
    def session(self):
        with Session(self.engine, expire_on_commit=False) as session:
            with session.begin():
                yield session


def rows(s: Session, scope: str, kind: str) -> list[Row]:
    return list(
        s.scalars(
            select(Row).where(Row.scope == scope, Row.kind == kind).order_by(Row.created_at, Row.id)
        )
    )


def get(s: Session, scope: str, kind: str, key: str) -> Row | None:
    identity = or_(Row.key == key, Row.id == key) if kind == "ai_task" else Row.key == key
    return s.scalar(select(Row).where(Row.scope == scope, Row.kind == kind, identity))


def put(
    s: Session,
    scope: str,
    kind: str,
    key: str,
    data: dict,
    classification: str = "internal",
    record_id: str | None = None,
) -> Row:
    row = Row(
        id=record_id or uid(),
        scope=scope,
        kind=kind,
        key=key,
        data=data,
        classification=classification,
    )
    s.add(row)
    s.flush()
    return row


def audit(
    s: Session,
    scope: str,
    actor: str,
    action: str,
    target: str,
    classification: str = "internal",
    detail: dict | None = None,
):
    put(
        s,
        scope,
        "audit",
        uid(),
        {"actor": actor, "action": action, "target": target, "detail": detail or {}},
        classification,
    )


def view(row: Row) -> dict:
    return {
        "id": row.id,
        "kind": row.kind,
        "classification": row.classification,
        "created_at": row.created_at,
        "data": row.data,
    }


def lock_scope(s: Session, scope: str):
    """Serialize dependent projections across sources within one bank deployment."""
    if s.get_bind().dialect.name == "postgresql":
        key = int.from_bytes(hashlib.sha256(scope.encode()).digest()[:8], "big", signed=True)
        s.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})
