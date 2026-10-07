from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import SchemeUpdateResponse
from app.services import live_sync
from app.utils.auth import get_current_user_id

router = APIRouter()


@router.get("/updates", response_model=List[SchemeUpdateResponse])
def list_live_updates(db: Session = Depends(get_db)):
    """Latest informational snapshot per scheme, sourced live from official portals."""
    return live_sync.latest_updates(db)


@router.post("/sync", response_model=List[SchemeUpdateResponse])
def trigger_live_sync(
    db: Session = Depends(get_db),
    _user_id: str = Depends(get_current_user_id),
):
    """Force an immediate refresh from the official portals."""
    live_sync.sync_all(db)
    return live_sync.latest_updates(db)
