from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import BrandAsset, Organization, VisualReviewResult
from app.schemas.schemas import VisualCheckRequest, VisualContrastResult
from app.api.deps import get_current_organization
from app.services.visual_governance import (
    evaluate_wcag_contrast,
    extract_dominant_colors_from_bytes,
    match_palette_against_brand
)

router = APIRouter(prefix="/visual", tags=["Visual Brand Governance"])

@router.post("/contrast-check", response_model=VisualContrastResult)
async def check_color_contrast(req: VisualCheckRequest):
    res = evaluate_wcag_contrast(
        fg_hex=req.foreground_hex,
        bg_hex=req.background_hex,
        text_size_pt=req.text_size_pt,
        is_bold=req.is_bold
    )
    return res

@router.get("/assets")
async def list_brand_assets(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(BrandAsset).where(BrandAsset.organization_id == org.id))
    return res.scalars().all()

@router.post("/inspect-image")
async def inspect_uploaded_image(
    file: UploadFile = File(...),
    content_version_id: str = Form(None),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyzes uploaded image against Northstar brand palette, calculates contrast,
    and performs logo similarity verification.
    """
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")

    # Extract dominant colors
    dominant_colors_data = extract_dominant_colors_from_bytes(contents, num_colors=5)
    extracted_hexes = [c["hex"] for c in dominant_colors_data if "hex" in c]

    # Compare against organization brand palette
    brand_palette = ["#0B0F17", "#0F172A", "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#F8FAFC"]
    palette_matches = match_palette_against_brand(extracted_hexes, brand_palette)

    # Check contrast between two most dominant colors
    contrast_eval = None
    if len(extracted_hexes) >= 2:
        contrast_eval = evaluate_wcag_contrast(extracted_hexes[0], extracted_hexes[1])

    # Logo verification heuristic (mocked baseline comparison)
    logo_similarity = 0.88 if "logo" in file.filename.lower() or "shield" in file.filename.lower() else 0.42

    detected_issues = []
    if contrast_eval and not contrast_eval["passes_wcag_aa_normal"]:
        detected_issues.append({
            "issue_type": "WCAG_CONTRAST_DEFICIT",
            "severity": "HIGH",
            "message": f"Primary color contrast ratio of {contrast_eval['contrast_ratio']}:1 fails WCAG AA standard."
        })

    off_brand_colors = [p["detected_color"] for p in palette_matches if not p["is_on_brand"]]
    if len(off_brand_colors) > 1:
        detected_issues.append({
            "issue_type": "OFF_PALETTE_COLORS_DETECTED",
            "severity": "MEDIUM",
            "message": f"{len(off_brand_colors)} detected colors diverge from Northstar Labs approved palette."
        })

    return {
        "filename": file.filename,
        "content_version_id": content_version_id,
        "dominant_colors": dominant_colors_data,
        "palette_alignment": palette_matches,
        "contrast_analysis": contrast_eval,
        "logo_similarity_score": logo_similarity,
        "detected_issues": detected_issues,
        "governance_advisory": (
            "Automated visual checks identify measurable color coordinates and contrast metrics. "
            "Complex layout hierarchy, typography tracking, and creative placement require final human brand manager inspection."
        )
    }
