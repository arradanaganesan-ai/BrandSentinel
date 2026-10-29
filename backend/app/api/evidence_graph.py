from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Organization
from app.api.deps import get_current_organization
from app.services.evidence_graph import EvidenceGraphService

router = APIRouter(prefix="/evidence-graph", tags=["Brand Evidence Graph"])

@router.get("")
async def get_evidence_graph(
    version_id: Optional[str] = Query(None, description="Optional content version filter"),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    service = EvidenceGraphService(db)
    graph_data = await service.build_graph(org_id=org.id, content_version_id=version_id)
    return graph_data
