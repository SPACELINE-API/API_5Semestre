import asyncio
import logging
from functools import lru_cache

from guardrails import Guard, OnFailAction  # type: ignore[import-untyped]
from guardrails_ai.prompt_injection_detector import (  # type: ignore[import-untyped]
    PromptInjectionDetector,
)

from .errors import GuardrailUnavailable, PromptInjectionBlocked
from .llm import get_guardrail_model, setup_llm_env

logger = logging.getLogger(__name__)

INJECTION_THRESHOLD = 0.8


@lru_cache(maxsize=1)
def _get_guard() -> Guard:
    setup_llm_env()
    validator = PromptInjectionDetector(
        llm_callable=get_guardrail_model(),
        threshold=INJECTION_THRESHOLD,
        on_fail=OnFailAction.NOOP,
    )
    return Guard().use(validator)


def check_prompt_injection(texto: str) -> None:
    try:
        outcome = _get_guard().validate(texto)
    except Exception as exc:
        logger.exception("Falha ao executar guardrail de prompt injection")
        raise GuardrailUnavailable() from exc

    if not outcome.validation_passed:
        logger.warning("Prompt injection bloqueado: %.200r", texto)
        raise PromptInjectionBlocked()


async def acheck_prompt_injection(texto: str) -> None:
    await asyncio.to_thread(check_prompt_injection, texto)
