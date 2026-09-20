import os
from pathlib import Path

from dotenv import load_dotenv
from google.adk.models.lite_llm import LiteLlm

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

ADK_PROVIDER = os.getenv("ADK_PROVIDER", "ollama").strip().lower()
ADK_MODEL = os.getenv("ADK_MODEL", "llama3.2:1b").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()


def get_model():
    if ADK_PROVIDER == "gemini":
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY é obrigatória quando ADK_PROVIDER=gemini")
        return LiteLlm(model=f"gemini/{ADK_MODEL}", api_key=GEMINI_API_KEY)

    if ADK_PROVIDER == "ollama":
        return LiteLlm(model=f"ollama_chat/{ADK_MODEL}", api_base=OLLAMA_BASE_URL)

    raise ValueError(f"Provedor de modelo não suportado: {ADK_PROVIDER}")
