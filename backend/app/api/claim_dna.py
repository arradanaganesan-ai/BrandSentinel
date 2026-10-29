from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import ClaimDNA, ContentVersion
from app.schemas.schemas import ClaimDNAResponse

router = APIRouter(prefix="/claim-dna", tags=["Claim DNA Inspector"])

@router.get("/versions/{version_id}", response_model=List[ClaimDNAResponse])
async def get_claim_dna_for_version(
    version_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ClaimDNA).where(ClaimDNA.content_version_id == version_id)
    )
    claims = res.scalars().all()
    return claims

@router.get("/all", response_model=List[ClaimDNAResponse])
async def list_all_claims(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ClaimDNA).order_by(ClaimDNA.id.desc()))
    return res.scalars().all()
