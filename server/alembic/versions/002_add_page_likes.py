"""Add page_likes table

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('page_likes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('page_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['page_id'], ['pages.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('page_id', 'user_id', name='unique_page_user_like')
    )
    op.create_index('ix_page_likes_page_id', 'page_likes', ['page_id'])
    op.create_index('ix_page_likes_user_id', 'page_likes', ['user_id'])

def downgrade():
    op.drop_table('page_likes')

