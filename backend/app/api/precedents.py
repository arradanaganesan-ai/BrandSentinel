from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import DecisionPrecedent, Organization
from app.schemas.schemas import DecisionPrecedentResponse
from app.api.deps import get_current_organization

router = APIRouter(prefix="/precedents", tags=["Decision Memory"])

@router.get("", response_model=List[DecisionPrecedentResponse])
async def list_precedents(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    q = select(DecisionPrecedent).where(DecisionPrecedent.organization_id == org.id)
    if category:
        q = q.where(DecisionPrecedent.finding_category == category)
    if search:
        q = q.where(DecisionPrecedent.title.ilike(f"%{search}%") | DecisionPrecedent.scenario_description.ilike(f"%{search}%"))

    res = await db.execute(q.order_by(DecisionPrecedent.created_at.desc()))
    return res.scalars().all()
