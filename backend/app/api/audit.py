from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import AuditEvent, Organization
from app.schemas.schemas import AuditEventResponse
from app.api.deps import get_current_organization

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditEventResponse])
async def list_audit_events(
    action_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    q = select(AuditEvent).where(AuditEvent.organization_id == org.id)
    if action_type:
        q = q.where(AuditEvent.action_type == action_type)
    q = q.order_by(AuditEvent.created_at.desc()).limit(limit)

    res = await db.execute(q)
    return res.scalars().all()
