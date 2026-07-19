from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud
from app.constants import PRIORITIES, REQUEST_STATUSES
from app.db import get_db
from app.schemas import (
    PaginatedRequests,
    RequestStats,
    ServiceRequestClose,
    ServiceRequestCreate,
    ServiceRequestOut,
    ServiceRequestUpdate,
)

router = APIRouter(prefix="/requests", tags=["service-requests"])


@router.get("", response_model=PaginatedRequests)
def list_requests(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    borough: str | None = Query(None),
    complaint_type: str | None = Query(None),
    search: str | None = Query(None),
    citizen_id: int | None = Query(None),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    total, items = crud.list_requests(
        db,
        status=status,
        priority=priority,
        borough=borough,
        complaint_type=complaint_type,
        search=search,
        citizen_id=citizen_id,
        limit=limit,
        offset=offset,
    )
    return PaginatedRequests(total=total, limit=limit, offset=offset, items=items)


@router.get("/stats/summary", response_model=RequestStats)
def stats(db: Session = Depends(get_db)):
    return crud.request_stats(db)


@router.get("/{request_id}", response_model=ServiceRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    sr = crud.get_request(db, request_id)
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    return crud.to_out(sr)


@router.post("", response_model=ServiceRequestOut, status_code=201)
def create_request(payload: ServiceRequestCreate, db: Session = Depends(get_db)):
    if payload.priority not in PRIORITIES:
        raise HTTPException(status_code=422, detail=f"priority must be one of {PRIORITIES}")
    sr = crud.create_request(db, payload)
    return crud.to_out(sr)


@router.patch("/{request_id}", response_model=ServiceRequestOut)
def update_request(request_id: int, payload: ServiceRequestUpdate, db: Session = Depends(get_db)):
    sr = crud.get_request(db, request_id)
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] not in REQUEST_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {REQUEST_STATUSES}")
    if "priority" in changes and changes["priority"] not in PRIORITIES:
        raise HTTPException(status_code=422, detail=f"priority must be one of {PRIORITIES}")
    return crud.to_out(crud.update_request(db, sr, changes))


@router.post("/{request_id}/close", response_model=ServiceRequestOut)
def close_request(request_id: int, payload: ServiceRequestClose, db: Session = Depends(get_db)):
    sr = crud.get_request(db, request_id)
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    return crud.to_out(crud.close_request(db, sr, payload.resolution_description))
