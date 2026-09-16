"""migration2 - 2026-09-16

Revision ID: 05dd8477c7ae
Revises: 0001_create_translators_schema
Create Date: 2026-09-16 20:41:39.525537
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


revision: str = '05dd8477c7ae'
down_revision: str | Sequence[str] | None = '0001_create_translators_schema'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('company',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('legal_name', sa.String(length=150), nullable=False),
    sa.Column('trade_name', sa.String(length=150), nullable=False),
    sa.Column('cnpj', sa.String(length=18), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('industry', sa.String(length=100), nullable=False),
    sa.Column('phone', sa.String(length=30), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('zip_code', sa.String(length=10), nullable=False),
    sa.Column('street', sa.String(length=150), nullable=False),
    sa.Column('number', sa.String(length=10), nullable=False),
    sa.Column('complement', sa.String(length=100), nullable=True),
    sa.Column('neighborhood', sa.String(length=100), nullable=False),
    sa.Column('city', sa.String(length=100), nullable=False),
    sa.Column('state', sa.String(length=2), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('cnpj'),
    sa.UniqueConstraint('email')
    )


def downgrade() -> None:

    op.drop_table('company')

