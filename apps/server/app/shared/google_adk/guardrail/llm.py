import os
from pathlib import Path

from app.shared.google_adk.config import (
    ADK_MODEL,
    ADK_PROVIDER,
    GEMINI_API_KEY,
    OLLAMA_BASE_URL,
)

_FALSE_VALUES = {"false", "0", "no", "off"}


def is_guardrail_enabled() -> bool:
    """Lê GUARDRAIL_ENABLED do .env.

    Só valores explícitos de desligado (false, 0, no, off) desativam o guardrail.
    Se a variável estiver ausente ou tiver valor desconhecido, mantém ligado (fail-closed).
    """
    return _read_guardrail_flag() not in _FALSE_VALUES


def _normalize(raw: str) -> str:
    # Ignora comentário inline (ex.: "false  # desligado") e aspas
    return raw.split("#", 1)[0].strip().strip("\"'").lower()


def resolve_guardrail_flag() -> tuple[str, str]:
    """Retorna (valor, origem) de GUARDRAIL_ENABLED.

    Ordem de prioridade:
    1. Variável já presente no ambiente do processo (export, Docker, etc.)
    2. .env mais próximo deste arquivo, subindo as pastas (backend/.env antes do .env da raiz).
       O .env do frontend nunca é lido, pois não fica acima deste arquivo.
    3. Padrão: "true" (ligado)
    """
    env_value = os.environ.get("GUARDRAIL_ENABLED")
    if env_value is not None:
        return _normalize(env_value), "ambiente do processo"

    try:
        from dotenv import dotenv_values  # type: ignore[import-untyped]
    except ImportError:
        return "true", "padrão (python-dotenv não instalado)"

    for folder in Path(__file__).resolve().parents:
        env_file = folder / ".env"
        if env_file.is_file():
            value = dotenv_values(env_file).get("GUARDRAIL_ENABLED")
            if value is not None:
                return _normalize(value), str(env_file)

    return "true", "padrão (não encontrada em nenhum .env)"


def _read_guardrail_flag() -> str:
    return resolve_guardrail_flag()[0]


def get_guardrail_model() -> str:
    override = os.getenv("GUARDRAIL_LLM_MODEL", "").strip()
    if override:
        return override
    if ADK_PROVIDER == "gemini":
        return f"gemini/{ADK_MODEL}"
    if ADK_PROVIDER == "ollama":
        return f"ollama_chat/{ADK_MODEL}"
    raise ValueError(f"Provedor sem suporte nos guardrails: {ADK_PROVIDER}")


def setup_llm_env() -> None:
    """Expõe as credenciais/endereços nas variáveis que o litellm lê."""
    if GEMINI_API_KEY:
        os.environ.setdefault("GEMINI_API_KEY", GEMINI_API_KEY)
    os.environ.setdefault("OLLAMA_API_BASE", OLLAMA_BASE_URL)