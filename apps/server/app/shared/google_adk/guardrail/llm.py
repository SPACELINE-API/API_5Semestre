import os

from app.shared.google_adk.config import (
    ADK_MODEL,
    ADK_PROVIDER,
    GEMINI_API_KEY,
    OLLAMA_BASE_URL,
)


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
