from typing import Optional
from datetime import datetime
from decimal import Decimal

from sqlmodel import Field, SQLModel


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_code: str = Field(max_length=50, unique=True)
    product_name: str = Field(max_length=200)
    description: Optional[str] = None
    type: str = Field(max_length=50)  # 'finished-product', 'semi-product', 'raw-material'
    unit: str = Field(max_length=20)
    standard_cost: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=15)
    lead_time_days: Optional[int] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)
