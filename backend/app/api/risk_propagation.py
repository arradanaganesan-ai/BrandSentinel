from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Organization, User, ContentItem, AuditEvent
from app.api.deps import get_current_organization, require_roles
from app.services.risk_propagation import RiskPropagationService
from app.schemas.schemas import ReReviewRequest

router = APIRouter(prefix="/risk-propagation", tags=["Risk Propagation Center"])

@router.get("")
async def get_risk_propagation(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    service = RiskPropagationService(db)
    return await service.get_propagation_map(org.id)

@router.post("/request-re-review")
async def request_re_review(
    req: ReReviewRequest,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN", "LEGAL_COMPLIANCE"])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ContentItem).where(
            ContentItem.id == req.content_item_id,
            ContentItem.organization_id == org.id
        )
    )
    content_item = res.scalars().first()
    if not content_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found")

    content_item.current_status = "CHANGES_REQUESTED"

    audit = AuditEvent(
        organization_id=org.id,
        user_id=user.id,
        action_type="RE_REVIEW_REQUESTED",
        entity_type="CONTENT_ITEM",
        entity_id=content_item.id,
        description=f"{user.full_name} initiated governance re-review on '{content_item.title}'. Reason: {req.reason}",
        details_json={
            "content_item_id": content_item.id,
            "title": content_item.title,
            "reason": req.reason,
            "new_status": content_item.current_status
        },
        actor_name=user.full_name,
        actor_role="BRAND_MANAGER"
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "success",
        "message": f"Re-review initiated for '{content_item.title}'",
        "content_item_id": content_item.id,
        "new_status": content_item.current_status
    }
