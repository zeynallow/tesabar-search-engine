"""add country to sites

Revision ID: 0001_add_country_to_sites
Revises: 0000_initial
Create Date: 2026-03-02 00:00:00.000000

NOTE: The 'country' column is already included in the 0000_initial migration.
This migration is kept as a no-op to preserve the revision history chain.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_add_country_to_sites"
down_revision: Union[str, None] = "0000_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 'country' column is already created in 0000_initial — no-op
    pass


def downgrade() -> None:
    # 'country' column is managed by 0000_initial — no-op
    pass

