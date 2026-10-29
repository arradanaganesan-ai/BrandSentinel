from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Organization
from app.api.deps import get_current_organization
from app.services.drift_radar import DriftRadarService

router = APIRouter(prefix="/drift", tags=["Brand Drift Radar"])

@router.get("/metrics")
async def get_drift_metrics(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    service = DriftRadarService(db)
    metrics = await service.get_drift_metrics(org.id)
    return metrics
