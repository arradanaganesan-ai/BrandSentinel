from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.entities import Comment, ContentVersion, User, AuditEvent
from app.schemas.schemas import CommentCreate, CommentResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/comments", tags=["Review Collaboration"])

@router.get("/versions/{version_id}", response_model=List[CommentResponse])
async def list_version_comments(
    version_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Comment)
        .where(Comment.content_version_id == version_id)
        .options(selectinload(Comment.user))
        .order_by(Comment.created_at.asc())
    )
    comments = res.scalars().all()
    out = []
    for c in comments:
        out.append(CommentResponse(
            id=c.id,
            content_version_id=c.content_version_id,
            user_id=c.user_id,
            user_name=c.user.full_name if c.user else "Reviewer",
            role_tag=c.role_tag or (c.user.memberships[0].role if c.user and c.user.memberships else "REVIEWER"),
            finding_id=c.finding_id,
            message=c.message,
            created_at=c.created_at
        ))
    return out

@router.post("/versions/{version_id}", response_model=CommentResponse)
async def post_comment(
    version_id: str,
    comment_in: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ContentVersion)
        .where(ContentVersion.id == version_id)
        .options(selectinload(ContentVersion.content_item))
    )
    ver = res.scalars().first()
    if not ver:
        raise HTTPException(status_code=404, detail="Content version not found")

    user_role = comment_in.role_tag or (user.memberships[0].role if user.memberships else "REVIEWER")
    comment = Comment(
        content_version_id=version_id,
        user_id=user.id,
        finding_id=comment_in.finding_id,
        message=comment_in.message,
        role_tag=user_role
    )
    db.add(comment)
    await db.flush()

    audit = AuditEvent(
        organization_id=ver.content_item.organization_id,
        user_id=user.id,
        action_type="COMMENT_ADDED",
        entity_type="COMMENT",
        entity_id=comment.id,
        description=f"{user.full_name} ({user_role}) posted review comment on '{ver.content_item.title}' v{ver.version_number}.",
        actor_name=user.full_name,
        actor_role=user_role
    )
    db.add(audit)

    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        content_version_id=comment.content_version_id,
        user_id=comment.user_id,
        user_name=user.full_name,
        role_tag=user_role,
        finding_id=comment.finding_id,
        message=comment.message,
        created_at=comment.created_at
    )
