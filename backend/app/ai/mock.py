"""Deterministic, offline AI provider.

Phrases an answer purely from the grounded retrieval — no external API, no keys.
Because the numbers come from real SQL aggregations, the mock's answers are
factually correct; only the prose is templated. Ideal for demos and CI.
"""
from __future__ import annotations

from app.ai.base import BaseProvider, Retrieval


class MockProvider(BaseProvider):
    name = "mock"

    def _phrase(self, question: str, ctx: Retrieval) -> tuple[str, float]:
        d = ctx.data
        if ctx.intent == "resolution" and d:
            top = d[0]
            tail = d[-1]
            return (
                f"{top['borough'].title()} has the highest average resolution time at "
                f"{top['avg_resolution_hours']}h, while {tail['borough'].title()} is fastest "
                f"at {tail['avg_resolution_hours']}h.",
                0.9,
            )
        if ctx.intent == "forecast" and d:
            f = d[0]
            direction = "up" if f["trend_factor"] > 1 else "down" if f["trend_factor"] < 1 else "flat"
            return (
                f"Projected ~{f['projected_next_30d']:,} requests over the next 30 days "
                f"(~{f['projected_daily']}/day), trending {direction} "
                f"(factor {f['trend_factor']}).",
                0.72,
            )
        if ctx.intent == "aging":
            n = len(d)
            return (
                f"There are {n} open requests past the age threshold. The oldest appear first "
                f"in the data payload for triage.",
                0.95,
            )
        if ctx.intent == "agency" and d:
            worst = min(d, key=lambda r: r["closure_rate"])
            best = max(d, key=lambda r: r["closure_rate"])
            return (
                f"{worst['agency']} is the most underperforming agency "
                f"({worst['closure_rate']}% closure rate), versus {best['agency']} "
                f"leading at {best['closure_rate']}%.",
                0.88,
            )
        if ctx.intent == "executive" and d:
            s = d[0]
            return (
                f"Executive brief: {s['total_requests']:,} total requests, "
                f"{s['open_requests']:,} open ({s['resolution_rate']}% resolved). "
                f"Average resolution {s['avg_resolution_hours']}h; "
                f"{s['high_priority_open']:,} high/critical still open.",
                0.9,
            )
        if ctx.intent == "trend":
            return (f"Daily complaint volume for the last {len(d)} days is in the data payload.", 0.85)
        if ctx.intent == "borough_complaints" and d:
            lead = d[0]
            return (
                f"The top complaint type is '{lead['complaint_type']}' "
                f"({lead['count']:,} requests). Full ranking in the data payload.",
                0.9,
            )
        # overview / fallback
        if d:
            s = d[0]
            return (
                f"{s.get('total_requests', 0):,} total requests, "
                f"{s.get('open_requests', 0):,} currently open.",
                0.8,
            )
        return ("I couldn't find matching data for that question.", 0.3)
