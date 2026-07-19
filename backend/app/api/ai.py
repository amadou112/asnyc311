from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.ai import get_provider
from app.db import get_db
from app.schemas import AIAnswer, AIQuery, RecommendationOut
from app import crud

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/query", response_model=AIAnswer)
def ai_query(payload: AIQuery, db: Session = Depends(get_db)):
    """Natural-language question → grounded answer + structured data.

    The provider is selected by `AI_PROVIDER` (mock by default). Regardless of
    provider, the numbers are computed from real SQL via the retrieval layer.
    """
    provider = get_provider()
    return provider.answer(payload.question, db)


@router.get("/recommendations", response_model=list[RecommendationOut])
def recommendations(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    return crud.recommendations(db, limit=limit)
