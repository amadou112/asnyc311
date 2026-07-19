from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.schemas import PaginatedInspections

router = APIRouter(prefix="/inspections", tags=["inspections"])


@router.get("", response_model=PaginatedInspections)
def list_inspections(
    status: str | None = Query(None),
    violation: bool | None = Query(None),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    total, items = crud.list_inspections(db, status=status, violation=violation, limit=limit, offset=offset)
    return PaginatedInspections(total=total, limit=limit, offset=offset, items=items)
