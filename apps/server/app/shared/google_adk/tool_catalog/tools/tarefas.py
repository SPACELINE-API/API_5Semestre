import hashlib
import json
import uuid
from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.tasks.schemas.task import TaskCreate
from app.modules.tasks.services.task_rules import TASKS_WRITE_PERMISSION
from app.modules.tasks.services.task_service import TaskService
from app.shared.database import get_session_factory

from ..contract import ToolSpec, Usuario
from ..errors import CodigoErro

PERMISSAO_CRIAR_TAREFAS = TASKS_WRITE_PERMISSION


class CriarTarefaEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=5000)
    assignee_id: uuid.UUID
    due_date: date | None = None
    sem_prazo: bool = False
    confirmation_token: str | None = Field(default=None, min_length=20, max_length=200)

    @model_validator(mode="after")
    def validate_deadline(self) -> "CriarTarefaEntrada":
        if self.due_date is not None and self.sem_prazo:
            raise ValueError("due_date and sem_prazo are mutually exclusive")
        return self


class CriarTarefaSaida(BaseModel):
    status: str
    mensagem: str
    missing_fields: list[str] = Field(default_factory=list)
    task_id: uuid.UUID | None = None
    task_status: str | None = None
    confirmation_token: str | None = None


def _idempotency_key(entrada: CriarTarefaEntrada, usuario: Usuario) -> str:
    payload = {
        "requester_id": str(usuario.id),
        "description": entrada.description.strip(),
        "assignee_id": str(entrada.assignee_id),
        "due_date": entrada.due_date.isoformat() if entrada.due_date else None,
        "sem_prazo": entrada.sem_prazo,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def _handler(entrada: CriarTarefaEntrada, usuario: Usuario) -> dict[str, Any]:
    data = TaskCreate(
        description=entrada.description,
        due_date=entrada.due_date,
        assignee_id=entrada.assignee_id,
        idempotency_key=_idempotency_key(entrada, usuario),
    )
    if entrada.due_date is None and not entrada.sem_prazo:
        _record_attempt(data, usuario, "missing_data", entrada)
        return {
            "status": "missing_data",
            "mensagem": "Informe um prazo ou confirme que a tarefa não tem prazo.",
            "missing_fields": ["prazo"],
        }

    db = get_session_factory()()
    try:
        service = TaskService(db)
        if entrada.confirmation_token is None:
            _, token = service.propose(data, requester=usuario)
            prazo = (
                "sem prazo"
                if entrada.sem_prazo or entrada.due_date is None
                else entrada.due_date.isoformat()
            )
            return {
                "status": "confirmation_required",
                "mensagem": (
                    f"Confirme a tarefa '{data.description}' para o funcionário {data.assignee_id}, "
                    f"com prazo {prazo}."
                ),
                "missing_fields": [],
                "confirmation_token": token,
            }
        task = service.confirm_proposal(entrada.confirmation_token, data, requester=usuario)
        return {
            "status": "created",
            "mensagem": "Tarefa criada com sucesso.",
            "missing_fields": [],
            "task_id": task.id,
            "task_status": task.status.value,
            "confirmation_token": None,
        }
    finally:
        db.close()


def _record_attempt(
    data: TaskCreate,
    usuario: Usuario,
    result: str,
    entrada: CriarTarefaEntrada,
) -> None:
    db = get_session_factory()()
    try:
        TaskService(db).record_attempt(
            data,
            requester=usuario,
            result=result,
            details={
                "description": data.description,
                "due_date": data.due_date.isoformat() if data.due_date else None,
                "assignee_id": str(data.assignee_id),
                "sem_prazo": entrada.sem_prazo,
            },
        )
    finally:
        db.close()


def criar_tarefa_spec() -> ToolSpec:
    return ToolSpec(
        name="criar_tarefa",
        description=(
            "Cria uma tarefa para exatamente um funcionário interno (assignee_id). Primeiro "
            "apresente a proposta e use o token retornado; só crie quando o usuário confirmar "
            "enviando esse token com os mesmos dados. Se não houver prazo, confirme sem_prazo "
            "antes de propor."
        ),
        input_schema=CriarTarefaEntrada,
        output_schema=CriarTarefaSaida,
        errors=(
            CodigoErro.FERRAMENTA_INDISPONIVEL,
            CodigoErro.SEM_PERMISSAO,
            CodigoErro.ENTRADA_INVALIDA,
            CodigoErro.BLOQUEADO_GUARDRAIL,
            CodigoErro.ERRO_INTERNO,
        ),
        required_permission=PERMISSAO_CRIAR_TAREFAS,
        handler=_handler,
        free_text_fields=("description",),
        topic_keywords=("tarefa",),
        topic_label="tarefas",
    )
