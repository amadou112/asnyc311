"""Real LLM adapters (OpenAI, Claude).

Both reuse the shared retrieval so the model is *grounded* — it receives the same
SQL-derived facts the mock uses and is asked to phrase a concise answer. SDKs are
imported lazily, so the backend runs with neither package installed as long as
`AI_PROVIDER=mock` (the default).
"""
from __future__ import annotations

from app.ai.base import BaseProvider, Retrieval

_SYSTEM = (
    "You are the NYC 311 executive copilot. Answer in 1-3 sentences using ONLY the "
    "provided facts and data. Be precise with numbers. If the facts are empty, say so."
)


def _prompt(question: str, ctx: Retrieval) -> str:
    return (
        f"Question: {question}\n\n"
        f"Grounded facts: {ctx.facts}\n\n"
        f"Structured data (JSON): {ctx.data}\n\n"
        "Write the answer for a city executive."
    )


class OpenAIProvider(BaseProvider):
    name = "openai"

    def __init__(self, model: str, api_key: str):
        super().__init__(model)
        from openai import OpenAI  # lazy

        self._client = OpenAI(api_key=api_key)

    def _phrase(self, question: str, ctx: Retrieval) -> tuple[str, float]:
        resp = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": _prompt(question, ctx)},
            ],
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip(), 0.86


class ClaudeProvider(BaseProvider):
    name = "claude"

    def __init__(self, model: str, api_key: str):
        super().__init__(model)
        import anthropic  # lazy

        self._client = anthropic.Anthropic(api_key=api_key)

    def _phrase(self, question: str, ctx: Retrieval) -> tuple[str, float]:
        resp = self._client.messages.create(
            model=self.model,
            max_tokens=400,
            system=_SYSTEM,
            messages=[{"role": "user", "content": _prompt(question, ctx)}],
        )
        return resp.content[0].text.strip(), 0.87
