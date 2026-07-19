from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.schemas import AgencyOut, AuditLogOut, UserOut

router = APIRouter(prefix="/admin", tags=["administration"])


@router.get("/agencies", response_model=list[AgencyOut])
def agencies(db: Session = Depends(get_db)):
    return crud.list_agencies(db)


@router.get("/users", response_model=list[UserOut])
def users(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return crud.list_users(db, limit=limit)


@router.get("/audit-logs", response_model=list[AuditLogOut])
def audit_logs(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)):
    return crud.list_audit_logs(db, limit=limit)
