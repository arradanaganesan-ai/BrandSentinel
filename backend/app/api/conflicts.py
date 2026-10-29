from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Organization
from app.api.deps import get_current_organization
from app.services.conflict_detector import GuidelineConflictDetector

router = APIRouter(prefix="/conflicts", tags=["Guideline Conflict Center"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_guideline_conflicts(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    detector = GuidelineConflictDetector(db)
    return await detector.detect_conflicts(org.id)
