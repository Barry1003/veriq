"""Initial independent application storage; immutable JSON payloads plus indexed identities."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade():
    op.create_table(
        "domain_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("scope", sa.String(220), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("key", sa.String(250), nullable=False),
        sa.Column("classification", sa.String(20), nullable=False),
        sa.Column("created_at", sa.String(40), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.UniqueConstraint("scope", "kind", "key", name="uq_record_identity"),
    )
    op.create_index("ix_domain_records_scope", "domain_records", ["scope"])
    op.create_index("ix_domain_records_kind", "domain_records", ["kind"])
    op.create_table(
        "source_feed",
        sa.Column("sequence", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("scope", sa.String(220), nullable=False),
        sa.Column("envelope", sa.JSON(), nullable=False),
    )
    op.create_index("ix_source_feed_scope", "source_feed", ["scope"])


def downgrade():
    op.drop_table("source_feed")
    op.drop_table("domain_records")
