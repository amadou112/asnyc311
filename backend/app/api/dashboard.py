from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.schemas import BoroughStat, DashboardSummary, GeoPoint, TrendPoint

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db)):
    return crud.dashboard_summary(db)


@router.get("/trends", response_model=list[TrendPoint])
def trends(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    return crud.trends(db, days=days)


@router.get("/boroughs", response_model=list[BoroughStat])
def boroughs(db: Session = Depends(get_db)):
    return crud.borough_stats(db)


@router.get("/geo", response_model=list[GeoPoint])
def geo(limit: int = Query(1000, ge=1, le=5000), db: Session = Depends(get_db)):
    return crud.geo_points(db, limit=limit)
