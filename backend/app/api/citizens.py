from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.schemas import CitizenDetail, CitizenOut, PaginatedCitizens

router = APIRouter(prefix="/citizens", tags=["citizens"])


@router.get("", response_model=PaginatedCitizens)
def list_citizens(
    search: str | None = Query(None),
    borough: str | None = Query(None),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    total, items = crud.list_citizens(db, search=search, borough=borough, limit=limit, offset=offset)
    return PaginatedCitizens(total=total, limit=limit, offset=offset, items=items)


@router.get("/{citizen_id}", response_model=CitizenDetail)
def get_citizen(citizen_id: int, db: Session = Depends(get_db)):
    citizen = crud.get_citizen(db, citizen_id)
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found")
    _, requests = crud.list_requests(db, citizen_id=citizen_id, limit=100)
    return CitizenDetail(citizen=CitizenOut(**citizen), requests=requests)
