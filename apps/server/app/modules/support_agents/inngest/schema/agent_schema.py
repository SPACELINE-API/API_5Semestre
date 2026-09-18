from pydantic import BaseModel, Field, field_validator

# Valor a ser alterado futuramente, conforme necessidade
QUESTION_MAX_LENGTH = 500


class SuportePerguntaRequest(BaseModel):

    texto: str = Field(
        ...,
        min_length=1,
        max_length=QUESTION_MAX_LENGTH,
        description="Pergunta em linguagem natural feita pelo colaborador.",
    )

    @field_validator("texto")
    @classmethod
    def texto_nao_pode_ser_vazio(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("A pergunta não pode ser vazia.")
        return normalized


class SuportePerguntaResponse(BaseModel):


    resposta: str = Field(..., description="Resposta textual produzida pelo agente.")
