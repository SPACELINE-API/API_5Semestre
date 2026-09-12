"""create translators schema

Revision ID: 0001_create_translators_schema
Revises:
Create Date: 2026-09-12 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_create_translators_schema"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "translators",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_translators_email"), "translators", ["email"], unique=False)

    op.create_table(
        "technical_qualifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(
        op.f("ix_technical_qualifications_name"),
        "technical_qualifications",
        ["name"],
        unique=False,
    )

    op.create_table(
        "language_pairs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("source_language", sa.String(length=10), nullable=False),
        sa.Column("target_language", sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_language", "target_language", name="uq_language_pair_source_target"
        ),
    )

    op.create_table(
        "translator_qualifications",
        sa.Column("translator_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("qualification_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["qualification_id"], ["technical_qualifications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["translator_id"], ["translators.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("translator_id", "qualification_id"),
    )

    op.create_table(
        "translator_language_pairs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("translator_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language_pair_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("proficiency_level", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["language_pair_id"], ["language_pairs.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["translator_id"], ["translators.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "translator_id", "language_pair_id", name="uq_translator_language_pair"
        ),
    )
    op.create_index(
        op.f("ix_translator_language_pairs_language_pair_id"),
        "translator_language_pairs",
        ["language_pair_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_translator_language_pairs_translator_id"),
        "translator_language_pairs",
        ["translator_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_translator_language_pairs_translator_id"), table_name="translator_language_pairs"
    )
    op.drop_index(
        op.f("ix_translator_language_pairs_language_pair_id"),
        table_name="translator_language_pairs",
    )
    op.drop_table("translator_language_pairs")
    op.drop_table("translator_qualifications")
    op.drop_table("language_pairs")
    op.drop_index(op.f("ix_technical_qualifications_name"), table_name="technical_qualifications")
    op.drop_table("technical_qualifications")
    op.drop_index(op.f("ix_translators_email"), table_name="translators")
    op.drop_table("translators")
