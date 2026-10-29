from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.entities import User, Membership, Organization
from app.schemas.schemas import UserLogin, TokenResponse, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(User)
        .where(User.email == credentials.email)
        .options(selectinload(User.memberships).selectinload(Membership.organization))
    )
    user = res.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    role = user.memberships[0].role if user.memberships else "CONTENT_CREATOR"
    org_id = user.memberships[0].organization_id if user.memberships else None
    org_name = user.memberships[0].organization.name if user.memberships else "Demo Org"

    access_token = create_access_token(
        subject=user.id,
        role=role,
        org_id=org_id
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        role=role,
        organization_id=org_id,
        organization_name=org_name,
        created_at=user.created_at
    )

    return TokenResponse(access_token=access_token, user=user_resp)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    role = current_user.memberships[0].role if current_user.memberships else "CONTENT_CREATOR"
    org_id = current_user.memberships[0].organization_id if current_user.memberships else None
    org_name = current_user.memberships[0].organization.name if current_user.memberships else "Northstar Labs"

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        role=role,
        organization_id=org_id,
        organization_name=org_name,
        created_at=current_user.created_at
    )

@router.get("/demo-users")
async def list_demo_users(db: AsyncSession = Depends(get_db)):
    """Convenient endpoint for judges to quickly switch roles in Demo Mode."""
    res = await db.execute(
        select(User)
        .options(selectinload(User.memberships).selectinload(Membership.organization))
    )
    users = res.scalars().all()
    result = []
    for u in users:
        role = u.memberships[0].role if u.memberships else "CONTENT_CREATOR"
        result.append({
            "id": u.id,
            "email": u.email,
            "name": u.full_name,
            "role": role,
            "default_password": "Northstar2026!"
        })
    return result
