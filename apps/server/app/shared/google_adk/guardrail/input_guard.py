import asyncio
import logging
import os
from functools import lru_cache
from pathlib import Path

from nemoguardrails import LLMRails, RailsConfig  # type: ignore[import-untyped]

from app.shared.google_adk.config import ADK_PROVIDER, GEMINI_API_KEY, OLLAMA_BASE_URL

from .errors import GuardrailUnavailable, PromptInjectionBlocked, TopicRestrictionBlocked
from .llm import get_guardrail_model, setup_llm_env

logger = logging.getLogger(__name__)

INPUT_GUARD_TIMEOUT_SECONDS = 120


def _setup_guardrail_env() -> None:
    """Configura as variáveis de ambiente necessárias para o endpoint do modelo."""
    setup_llm_env()

    if ADK_PROVIDER == "gemini":
        api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        os.environ["GUARDRAIL_API_KEY"] = api_key
        os.environ["GUARDRAIL_BASE_URL"] = (
            "https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        os.environ["GUARDRAIL_MODEL_NAME"] = get_guardrail_model().replace("gemini/", "")
    else:
        os.environ["GUARDRAIL_API_KEY"] = "ollama"
        os.environ["GUARDRAIL_BASE_URL"] = OLLAMA_BASE_URL
        os.environ["GUARDRAIL_MODEL_NAME"] = get_guardrail_model().replace("ollama_chat/", "")


@lru_cache(maxsize=1)
def get_rails() -> LLMRails:
    """Carrega o config.yml e rules.co com interpolação das variáveis de ambiente."""
    _setup_guardrail_env()

    guardrail_dir = Path(__file__).parent
    config_file = guardrail_dir / "config.yml"
    rules_file = guardrail_dir / "rules.co"

    if not config_file.exists():
        raise FileNotFoundError(f"Arquivo de configuração não encontrado: {config_file}")

    if not rules_file.exists():
        raise FileNotFoundError(f"Arquivo de regras não encontrado: {rules_file}")

    # Expande variáveis ${GUARDRAIL_...} no YAML antes de passar para o NeMo Guardrails
    yaml_content = os.path.expandvars(config_file.read_text(encoding="utf-8"))
    colang_content = rules_file.read_text(encoding="utf-8")

    config = RailsConfig.from_content(colang_content=colang_content, yaml_content=yaml_content)
    return LLMRails(config)


async def _executar(texto: str) -> None:
    rails = get_rails()
    response = await rails.generate_async(messages=[{"role": "user", "content": texto}])
    content = response.get("content", "")

    if "Só consigo ajudar com assuntos do suporte" in content:
        raise TopicRestrictionBlocked()


async def acheck_input(texto: str) -> None:
    try:
        await asyncio.wait_for(_executar(texto), timeout=INPUT_GUARD_TIMEOUT_SECONDS)
    except (PromptInjectionBlocked, TopicRestrictionBlocked):
        raise
    except TimeoutError as exc:
        logger.warning("Timeout ao executar guardrails de entrada: %s", exc)
        raise GuardrailUnavailable() from exc
    except Exception as exc:
        logger.exception("Falha ao executar guardrails de entrada: %s", exc)
        raise GuardrailUnavailable() from exc
