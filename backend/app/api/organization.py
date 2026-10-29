from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.entities import Organization, BrandProfile, User
from app.schemas.schemas import OrganizationResponse, BrandProfileResponse, BrandProfileUpdate
from app.api.deps import get_current_user, get_current_organization, require_roles

router = APIRouter(prefix="/organization", tags=["Organization"])

@router.get("/current", response_model=OrganizationResponse)
async def get_current_org_info(org: Organization = Depends(get_current_organization)):
    return org

@router.get("/brand-profile", response_model=BrandProfileResponse)
async def get_brand_profile(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(BrandProfile).where(BrandProfile.organization_id == org.id))
    profile = res.scalars().first()
    if not profile:
        profile = BrandProfile(
            organization_id=org.id,
            brand_name=org.name,
            voice_description="Authoritative, evidence-backed brand voice.",
            primary_colors=["#0B0F17", "#0F172A", "#6366F1"],
            secondary_colors=["#10B981", "#F59E0B", "#EF4444"]
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile

@router.patch("/brand-profile", response_model=BrandProfileResponse)
async def update_brand_profile(
    updates: BrandProfileUpdate,
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN"]))
):
    res = await db.execute(select(BrandProfile).where(BrandProfile.organization_id == org.id))
    profile = res.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Brand profile not found")

    for field, val in updates.model_dump(exclude_unset=True).items():
        setattr(profile, field, val)

    await db.commit()
    await db.refresh(profile)
    return profile
