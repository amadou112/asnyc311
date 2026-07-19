from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.schemas import ReportGenerate, ReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportOut])
def list_reports(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    return crud.list_reports(db, limit=limit)


@router.post("/generate", response_model=ReportOut, status_code=201)
def generate_report(payload: ReportGenerate, db: Session = Depends(get_db)):
    return crud.generate_report(db, kind=payload.kind)
