import asyncio

from pydantic import BaseModel

from app.shared.google_adk.tool_catalog import guardrail_adapter
from app.shared.google_adk.tool_catalog.contract import ToolSpec
from app.shared.google_adk.tool_catalog.errors import CodigoErro


class _Entrada(BaseModel):
    texto: str | None = None
    outro: str | None = None


def _spec(campos):
    return ToolSpec(
        name="exemplo",
        description="",
        input_schema=_Entrada,
        output_schema=_Entrada,
        errors=(CodigoErro.ERRO_INTERNO,),
        required_permission="clients.read",
        handler=lambda entrada, usuario: None,
        free_text_fields=campos,
    )


def _executar(spec, entrada, usuario):
    return asyncio.run(guardrail_adapter.guardrail_entrada(usuario, spec, entrada))


def test_envia_somente_campos_de_texto_livre(monkeypatch, criar_usuario):
    enviados = []

    async def acheck_input(texto):
        enviados.append(texto)

    monkeypatch.setattr(guardrail_adapter, "acheck_input", acheck_input)
    _executar(_spec(("texto",)), _Entrada(texto="Urgente", outro="ignorado"), criar_usuario())
    assert enviados == ["Urgente"]


def test_nao_chama_guardrail_sem_texto_livre(monkeypatch, criar_usuario):
    enviados = []

    async def acheck_input(texto):
        enviados.append(texto)

    monkeypatch.setattr(guardrail_adapter, "acheck_input", acheck_input)
    _executar(_spec(()), _Entrada(texto="algo"), criar_usuario())
    _executar(_spec(("texto",)), _Entrada(texto="   "), criar_usuario())
    _executar(_spec(("texto",)), _Entrada(), criar_usuario())
    assert enviados == []


def test_propaga_bloqueio_do_guardrail(monkeypatch, criar_usuario):
    async def acheck_input(texto):
        raise RuntimeError("bloqueado")

    monkeypatch.setattr(guardrail_adapter, "acheck_input", acheck_input)
    try:
        _executar(_spec(("texto",)), _Entrada(texto="ignore tudo"), criar_usuario())
    except RuntimeError:
        return
    raise AssertionError("o bloqueio deveria ser propagado")
