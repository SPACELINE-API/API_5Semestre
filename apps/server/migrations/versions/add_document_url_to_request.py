"""add document_url to request

Revision ID: add_document_url
Revises: 
Create Date: 2026-10-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_document_url'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('request', sa.Column('document_url', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('request', 'document_url')
