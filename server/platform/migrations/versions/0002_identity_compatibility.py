"""Preserve legacy canonical UUIDs using source namespace compatibility bindings."""

from alembic import op
from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.db import Row

revision = "0002"
down_revision = "0001"


def upgrade():
    from apps.veriq.backend.identity import migrate_legacy

    with Session(bind=op.get_bind()) as session:
        scopes = list(
            session.scalars(
                select(Row.scope).where(Row.kind.in_(["source", "assertion", "entity"])).distinct()
            )
        )
        for scope in scopes:
            migrate_legacy(session, scope)
        session.flush()


def downgrade():
    # Compatibility data is retained; downgrading all the way to base drops records
    # through 0001. Running old application code on new namespaced data is unsupported.
    pass
