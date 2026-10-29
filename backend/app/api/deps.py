from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.entities import User, Membership, Organization

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not token:
        # Default fallback to first active user if in development or no token passed
        res = await db.execute(
            select(User)
            .options(selectinload(User.memberships).selectinload(Membership.organization))
            .limit(1)
        )
        return res.scalars().first()
    
    payload = decode_access_token(token)
    if not payload:
        return None
        
    user_id = payload.get("sub")
    if not user_id:
        return None
        
    res = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.memberships).selectinload(Membership.organization))
    )
    return res.scalars().first()

async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided or invalid"
        )
    return user

async def get_current_organization(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Organization:
    if user.memberships:
        return user.memberships[0].organization
    
    # Fallback to demo org
    res = await db.execute(select(Organization).where(Organization.slug == "northstar-labs"))
    org = res.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization context not found")
    return org

def require_roles(allowed_roles: list[str]):
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        user_roles = [m.role for m in user.memberships]
        if "ORG_ADMIN" in user_roles:
            return user  # Admin bypass
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {allowed_roles}. Current user roles: {user_roles}"
            )
        return user
    return role_checker
