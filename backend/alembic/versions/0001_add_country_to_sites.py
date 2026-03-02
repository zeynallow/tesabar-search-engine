"""add country to sites

Revision ID: 0001_add_country_to_sites
Revises:
Create Date: 2026-03-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_add_country_to_sites"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sites",
        sa.Column("country", sa.String(2), nullable=True, index=True),
    )


def downgrade() -> None:
    op.drop_column("sites", "country")

