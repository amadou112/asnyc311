"""Select the AI provider from settings, with a safe fallback to the mock."""
from __future__ import annotations

import logging

from app.ai.base import BaseProvider
from app.ai.mock import MockProvider
from app.core.config import settings

log = logging.getLogger("nyc311.ai")


def get_provider() -> BaseProvider:
    provider = settings.AI_PROVIDER.lower()

    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            log.warning("AI_PROVIDER=openai but OPENAI_API_KEY missing; using mock.")
            return MockProvider(settings.AI_MODEL)
        from app.ai.providers import OpenAIProvider

        return OpenAIProvider(settings.AI_MODEL, settings.OPENAI_API_KEY)

    if provider == "claude":
        if not settings.ANTHROPIC_API_KEY:
            log.warning("AI_PROVIDER=claude but ANTHROPIC_API_KEY missing; using mock.")
            return MockProvider(settings.AI_MODEL)
        from app.ai.providers import ClaudeProvider

        return ClaudeProvider(settings.AI_MODEL, settings.ANTHROPIC_API_KEY)

    return MockProvider(settings.AI_MODEL)
