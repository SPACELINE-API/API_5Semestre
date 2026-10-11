"""Executa todos os guardrails de entrada, em ordem, antes do Inngest."""

import asyncio

from .errors import GuardrailUnavailable
from .prompt_injection import acheck_prompt_injection
from .topic_restriction import acheck_topic

# Limite total para os guardrails (evita travar a requisição).
INPUT_GUARD_TIMEOUT_SECONDS = 30


async def _executar(texto: str) -> None:
    await acheck_prompt_injection(texto)
    await acheck_topic(texto)


async def acheck_input(texto: str) -> None:
    try:
        await asyncio.wait_for(_executar(texto), timeout=INPUT_GUARD_TIMEOUT_SECONDS)
    except TimeoutError as exc:
        raise GuardrailUnavailable() from exc
