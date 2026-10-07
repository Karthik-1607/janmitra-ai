from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Scheme, Profile, Category, Department
from app.schemas import SchemeResponse, EligibilityCheckResult
from app.services.rule_engine import evaluate_scheme_eligibility
from app.utils.auth import get_current_user_id

router = APIRouter()


@router.get("", response_model=List[SchemeResponse])
def list_schemes(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, description="Free-text search over name and description"),
    category: Optional[str] = Query(default=None, description="Filter by category code"),
):
    """Return the seeded government schemes, optionally searched/filtered."""
    query = db.query(Scheme)
    if category:
        query = query.join(Category, Scheme.category_id == Category.id).filter(Category.code == category)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter(
            (Scheme.name.ilike(like)) | (Scheme.description.ilike(like)) | (Scheme.benefits_summary.ilike(like))
        )
    return query.order_by(Scheme.name).all()


@router.get("/meta")
def get_catalogue_meta(db: Session = Depends(get_db)):
    """Categories, departments and summary statistics for the catalogue."""
    categories = db.query(Category).order_by(Category.name).all()
    departments = db.query(Department).order_by(Department.name).all()
    schemes = db.query(Scheme).all()

    counts: dict[str, int] = {}
    for scheme in schemes:
        code = scheme.category.code if scheme.category else "OTHER"
        counts[code] = counts.get(code, 0) + 1

    return {
        "categories": [
            {"id": c.id, "code": c.code, "name": c.name, "description": c.description,
             "scheme_count": counts.get(c.code, 0)}
            for c in categories
        ],
        "departments": [
            {"id": d.id, "code": d.code, "name": d.name, "website": d.website}
            for d in departments
        ],
        "stats": {
            "total_schemes": len(schemes),
            "total_categories": len(categories),
            "total_departments": len(departments),
            "districts": 26,
        },
    }


@router.get("/match/me", response_model=List[EligibilityCheckResult])
def match_my_eligibility(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Evaluate the signed-in user's profile against every scheme via the rule engine."""
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Setup profile first.",
        )

    schemes = db.query(Scheme).all()
    results = []
    for scheme in schemes:
        eligible, rules_checked = evaluate_scheme_eligibility(profile, scheme.name, scheme.rules)
        results.append(EligibilityCheckResult(
            scheme_id=scheme.id,
            scheme_name=scheme.name,
            scheme_code=scheme.code,
            eligible=eligible,
            benefits_summary=scheme.benefits_summary,
            rules_checked=rules_checked,
            required_documents=scheme.documents,
            official_website=scheme.official_website,
            helpline=scheme.helpline,
            pdf_source_url=scheme.pdf_source_url,
            category=scheme.category.name if scheme.category else None,
            category_code=scheme.category.code if scheme.category else None,
            department=scheme.department.name if scheme.department else None,
        ))

    # Eligible first, then alphabetically for a stable, useful ordering.
    results.sort(key=lambda r: (not r.eligible, r.scheme_name))
    return results


@router.get("/{scheme_id}", response_model=SchemeResponse)
def get_scheme_by_id(scheme_id: str, db: Session = Depends(get_db)):
    """Return full details for a single scheme."""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    return scheme
