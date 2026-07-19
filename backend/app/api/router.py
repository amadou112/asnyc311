from fastapi import APIRouter

from app.api import admin, ai, citizens, dashboard, health, inspections, reports, requests

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(requests.router)
api_router.include_router(dashboard.router)
api_router.include_router(ai.router)
api_router.include_router(citizens.router)
api_router.include_router(inspections.router)
api_router.include_router(admin.router)
api_router.include_router(reports.router)
