from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.entities import User, Membership, Organization, AuditEvent
from app.api.deps import get_current_user, get_current_organization, require_roles

router = APIRouter(prefix="/team", tags=["Team & Permissions"])

@router.get("/members")
async def list_team_members(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Membership)
        .where(Membership.organization_id == org.id)
        .options(selectinload(Membership.user))
    )
    memberships = res.scalars().all()
    results = []
    for m in memberships:
        results.append({
            "membership_id": m.id,
            "user_id": m.user.id,
            "email": m.user.email,
            "full_name": m.user.full_name,
            "role": m.role,
            "created_at": m.created_at.isoformat()
        })
    return results

@router.patch("/members/{membership_id}/role")
async def update_member_role(
    membership_id: str,
    payload: Dict[str, str],
    admin: User = Depends(require_roles(["ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    new_role = payload.get("role")
    valid_roles = ["CONTENT_CREATOR", "BRAND_MANAGER", "LEGAL_COMPLIANCE", "APPROVER", "ORG_ADMIN"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    res = await db.execute(
        select(Membership)
        .where(Membership.id == membership_id)
        .options(selectinload(Membership.user))
    )
    membership = res.scalars().first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    old_role = membership.role
    membership.role = new_role

    audit = AuditEvent(
        organization_id=membership.organization_id,
        user_id=admin.id,
        action_type="USER_ROLE_CHANGED",
        entity_type="MEMBERSHIP",
        entity_id=membership.id,
        description=f"{admin.full_name} updated role for {membership.user.full_name} from {old_role} to {new_role}.",
        actor_name=admin.full_name,
        actor_role="ORG_ADMIN"
    )
    db.add(audit)

    await db.commit()
    return {"message": "Role updated", "membership_id": membership.id, "new_role": new_role}
