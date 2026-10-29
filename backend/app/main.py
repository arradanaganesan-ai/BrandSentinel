import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.entities import Organization
from app.services.seed_service import seed_northstar_demo

# Import API routers
from app.api.auth import router as auth_router
from app.api.organization import router as org_router
from app.api.knowledge import router as knowledge_router
from app.api.content import router as content_router
from app.api.review import router as review_router
from app.api.claim_dna import router as claim_dna_router
from app.api.evidence_graph import router as evidence_graph_router
from app.api.drift import router as drift_router
from app.api.conflicts import router as conflicts_router
from app.api.precedents import router as precedents_router
from app.api.risk_propagation import router as risk_propagation_router
from app.api.comments import router as comments_router
from app.api.approvals import router as approvals_router
from app.api.audit import router as audit_router
from app.api.visual import router as visual_router
from app.api.team import router as team_router
from app.api.demo import router as demo_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Check if demo organization is already seeded; if not, seed it automatically
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Organization).where(Organization.slug == "northstar-labs"))
        existing_demo = res.scalars().first()
        if not existing_demo and settings.DEMO_MODE:
            print("🚀 Auto-seeding Northstar Labs [Fictional Demo] data...")
            await seed_northstar_demo(session)
            print("✅ Northstar Labs seeded successfully.")

    yield

    # Clean shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Evidence-Backed Brand Governance Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all module routers
api_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_prefix)
app.include_router(org_router, prefix=api_prefix)
app.include_router(knowledge_router, prefix=api_prefix)
app.include_router(content_router, prefix=api_prefix)
app.include_router(review_router, prefix=api_prefix)
app.include_router(claim_dna_router, prefix=api_prefix)
app.include_router(evidence_graph_router, prefix=api_prefix)
app.include_router(drift_router, prefix=api_prefix)
app.include_router(conflicts_router, prefix=api_prefix)
app.include_router(precedents_router, prefix=api_prefix)
app.include_router(risk_propagation_router, prefix=api_prefix)
app.include_router(comments_router, prefix=api_prefix)
app.include_router(approvals_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(visual_router, prefix=api_prefix)
app.include_router(team_router, prefix=api_prefix)
app.include_router(demo_router, prefix=api_prefix)

# Also mount under /api for seamless proxying
app.include_router(auth_router, prefix="/api")
app.include_router(org_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(content_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(claim_dna_router, prefix="/api")
app.include_router(evidence_graph_router, prefix="/api")
app.include_router(drift_router, prefix="/api")
app.include_router(conflicts_router, prefix="/api")
app.include_router(precedents_router, prefix="/api")
app.include_router(risk_propagation_router, prefix="/api")
app.include_router(comments_router, prefix="/api")
app.include_router(approvals_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(visual_router, prefix="/api")
app.include_router(team_router, prefix="/api")
app.include_router(demo_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "demo_mode": settings.DEMO_MODE,
        "ai_provider": settings.AI_PROVIDER
    }
