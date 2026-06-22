"""make post media optional

Revision ID: 8c1f7a2c4d10
Revises: d72c42ff31bb
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c1f7a2c4d10'
down_revision: Union[str, Sequence[str], None] = 'd72c42ff31bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('posts', 'media_url', existing_type=sa.String(), nullable=True)
    op.alter_column('posts', 'media_type', existing_type=sa.String(), nullable=True)
    op.alter_column('posts', 'public_id', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('posts', 'public_id', existing_type=sa.String(), nullable=False)
    op.alter_column('posts', 'media_type', existing_type=sa.String(), nullable=False)
    op.alter_column('posts', 'media_url', existing_type=sa.String(), nullable=False)