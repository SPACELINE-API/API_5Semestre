from pydantic import BaseModel

from app.shared.google_adk.guardrail.input_guard import acheck_input

from .contract import ToolSpec, Usuario


async def guardrail_entrada(usuario: Usuario, spec: ToolSpec, entrada: BaseModel) -> None:
    textos = [
        valor
        for campo in spec.free_text_fields
        if isinstance(valor := getattr(entrada, campo, None), str) and valor.strip()
    ]
    if not textos:
        return
    await acheck_input("\n".join(textos))
