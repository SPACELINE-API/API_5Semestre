"""create request table - 2026-09-15

Revision ID: 8a034d60c7ab
Revises: 0001_create_translators_schema
Create Date: 2026-09-15 21:16:31.922441
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


revision: str = '0002_create_request_schema.py'
down_revision: str | Sequence[str] | None = '0001_create_translators_schema'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('request',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('customer_name', sa.String(length=255), nullable=False),
    sa.Column('enterprise', sa.String(length=155), nullable=False),
    sa.Column('email', sa.String(length=155), nullable=False),
    sa.Column('original_language', sa.String(length=50), nullable=False),
    sa.Column('translation_language', sa.String(length=50), nullable=False),
    sa.Column('customer_need', sa.String(length=100), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'APPROVED', name='statusenum'), nullable=False),
    sa.Column('request_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('request')