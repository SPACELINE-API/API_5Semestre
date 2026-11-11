import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.auth.models.user import User
from app.modules.internal_users.services.identity_rules import TRANSLATOR_LEGACY_ROLE
from app.modules.tasks.models.task import Task, TaskStatus

# PERMISSOES COMPARTILHADAS PELO ENDPOINT E PELO AGENTE DE IA
TASKS_WRITE_PERMISSION = "tasks.write"
TASKS_REVIEW_PERMISSION = "tasks.review"

ACTION_CREATED = "created"
ACTION_STARTED = "started"
ACTION_EXECUTION_UPDATED = "execution_updated"
ACTION_ATTACHMENT_ADDED = "attachment_added"
ACTION_ATTACHMENT_REMOVED = "attachment_removed"
ACTION_SUBMITTED = "submitted"
ACTION_APPROVED = "approved"
ACTION_REJECTED = "rejected"
ACTION_RESUMED = "resumed"


@dataclass(frozen=True)
class Transition:
    from_statuses: frozenset[TaskStatus]
    to_status: TaskStatus
    error: str


# TRANSICOES VALIDAS ENTRE OS STATUS; QUALQUER OUTRA E REJEITADA PELA API
TRANSITIONS: dict[str, Transition] = {
    ACTION_STARTED: Transition(
        frozenset({TaskStatus.PENDING}),
        TaskStatus.IN_PROGRESS,
        "Somente tarefas pendentes podem ser iniciadas.",
    ),
    ACTION_SUBMITTED: Transition(
        frozenset({TaskStatus.IN_PROGRESS}),
        TaskStatus.IN_REVIEW,
        "Somente tarefas em andamento podem ser enviadas para análise.",
    ),
    ACTION_APPROVED: Transition(
        frozenset({TaskStatus.IN_REVIEW}),
        TaskStatus.COMPLETED,
        "Somente tarefas em análise podem ser aprovadas.",
    ),
    ACTION_REJECTED: Transition(
        frozenset({TaskStatus.IN_REVIEW}),
        TaskStatus.REJECTED,
        "Somente tarefas em análise podem ser reprovadas.",
    ),
    ACTION_RESUMED: Transition(
        frozenset({TaskStatus.REJECTED}),
        TaskStatus.IN_PROGRESS,
        "Somente tarefas reprovadas podem ser retomadas.",
    ),
}

# A EXECUCAO (DESCRICAO E ANEXOS) SO PODE SER ALTERADA ENQUANTO A TAREFA ESTA EM ANDAMENTO
EDITABLE_STATUSES = frozenset({TaskStatus.IN_PROGRESS})


def apply_transition(task: Task, action: str) -> TaskStatus:
    transition = TRANSITIONS[action]
    if task.status not in transition.from_statuses:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=transition.error)
    previous = task.status
    task.status = transition.to_status
    return previous


def ensure_editable(task: Task) -> None:
    if task.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A execução só pode ser alterada com a tarefa em andamento.",
        )


def is_internal_user(user: User) -> bool:
    return user.role.strip().casefold() != TRANSLATOR_LEGACY_ROLE


def load_assignee(db: Session, assignee_id: uuid.UUID) -> User | None:
    user = db.get(User, assignee_id)
    if user is None or not user.is_active or not is_internal_user(user):
        return None
    return user


def load_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
