class PromptInjectionBlocked(Exception):
    """O texto foi classificado como prompt injection."""


class TopicRestrictionBlocked(Exception):
    """O texto está fora dos assuntos permitidos para o agente."""


class GuardrailUnavailable(Exception):
    """O guardrail falhou ao executar (tratado como fail-closed)."""
