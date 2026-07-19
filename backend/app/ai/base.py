"""Provider-agnostic AI interface.

Every provider (mock / OpenAI / Claude) implements the same `answer()` contract.
The natural-language question is first classified into an *intent* and grounded
with real aggregations from the database (retrieval); providers differ only in
how they phrase the final answer. This keeps numbers truthful regardless of
provider and lets the whole AI surface run offline via the mock.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app import crud
from app.constants import BOROUGH_FACTS
from app.schemas import AIAnswer

_BOROUGHS = list(BOROUGH_FACTS.keys())


@dataclass
class Retrieval:
    """Grounded context assembled from SQL before an LLM is (optionally) called."""

    intent: str
    data: list[dict] = field(default_factory=list)
    facts: str = ""


def detect_borough(question: str) -> str | None:
    q = question.upper()
    for b in _BOROUGHS:
        if b in q or b.replace(" ", "") in q.replace(" ", ""):
            return b
    return None


def classify(question: str) -> str:
    q = question.lower()
    if re.search(r"forecast|predict|next (month|quarter|week)|projur|projection|volume", q):
        return "forecast"
    if re.search(r"older than|unresolved|aging|overdue|\b\d+\s*days\b", q):
        return "aging"
    if re.search(r"agency|agencies|underperform|performance", q):
        return "agency"
    if re.search(r"resolution time|resolve|slowest|fastest|highest.*(time|resolution)", q):
        return "resolution"
    if re.search(r"executive|summary|report|overview|brief", q):
        return "executive"
    if re.search(r"trend|over time|daily|per day", q):
        return "trend"
    if detect_borough(q) or re.search(r"complaint|request|show me", q):
        return "borough_complaints"
    return "overview"


def retrieve(question: str, db: Session) -> Retrieval:
    """Ground the question in real SQL results (the 'R' in RAG)."""
    intent = classify(question)
    borough = detect_borough(question)

    if intent == "forecast":
        f = crud.forecast_next_period(db)
        return Retrieval(intent, [f],
            f"Trailing avg {f['avg_daily']}/day, trend x{f['trend_factor']}, "
            f"projected {f['projected_next_30d']} requests over the next 30 days.")

    if intent == "aging":
        m = re.search(r"(\d+)\s*days", question.lower())
        days = int(m.group(1)) if m else 30
        rows = crud.aging_requests(db, older_than_days=days)
        return Retrieval("aging", rows, f"{len(rows)} open requests older than {days} days.")

    if intent == "agency":
        rows = crud.agency_performance(db)
        worst = min(rows, key=lambda r: r["closure_rate"]) if rows else None
        facts = f"Lowest closure rate: {worst['agency']} at {worst['closure_rate']}%." if worst else "No agency data."
        return Retrieval("agency", rows, facts)

    if intent == "resolution":
        rows = crud.borough_resolution_ranking(db)
        top = rows[0] if rows else None
        facts = (f"{top['borough']} has the highest avg resolution time "
                 f"({top['avg_resolution_hours']}h).") if top else "No resolution data."
        return Retrieval("resolution", rows, facts)

    if intent == "executive":
        summary = crud.dashboard_summary(db)
        top = crud.top_complaints(db, limit=5)
        return Retrieval("executive", [summary, {"top_complaints": top}],
            f"{summary['total_requests']} total, {summary['open_requests']} open, "
            f"{summary['resolution_rate']}% resolved, avg {summary['avg_resolution_hours']}h.")

    if intent == "trend":
        rows = crud.trends(db, days=30)
        return Retrieval("trend", rows, f"{len(rows)} days of volume history.")

    if intent == "borough_complaints":
        rows = crud.top_complaints(db, borough=borough, limit=10)
        where = f" in {borough.title()}" if borough else ""
        return Retrieval("borough_complaints", rows, f"Top complaint types{where}.")

    summary = crud.dashboard_summary(db)
    return Retrieval("overview", [summary],
        f"{summary['total_requests']} total requests, {summary['open_requests']} open.")


class BaseProvider(ABC):
    name: str = "base"

    def __init__(self, model: str):
        self.model = model

    @abstractmethod
    def _phrase(self, question: str, ctx: Retrieval) -> tuple[str, float]:
        """Return (natural-language answer, confidence)."""

    def answer(self, question: str, db: Session) -> AIAnswer:
        ctx = retrieve(question, db)
        text, confidence = self._phrase(question, ctx)
        return AIAnswer(
            question=question,
            intent=ctx.intent,
            answer=text,
            data=ctx.data,
            provider=self.name,
            model=self.model,
            confidence=confidence,
        )
