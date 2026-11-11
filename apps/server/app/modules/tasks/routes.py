import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.modules.auth.models.user import User
from app.modules.auth.services.roles_service import has_permission
from app.modules.tasks.dependencies import (
    get_current_internal_user,
    require_task_reviewer,
    require_task_writer,
)
from app.modules.tasks.models.task import TaskStatus
from app.modules.tasks.schemas.task import (
    TaskCreate,
    TaskCreateRequest,
    TaskExecutionUpdate,
    TaskFileResponse,
    TaskHistoryResponse,
    TaskRejectInput,
    TaskResponse,
)
from app.modules.tasks.services.attachments import TASK_ATTACHMENT_MAX_BYTES
from app.modules.tasks.services.task_rules import TASKS_REVIEW_PERMISSION
from app.modules.tasks.services.task_service import TaskService
from app.modules.tasks.services.task_workflow_service import TaskWorkflowService
from app.shared.database import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])

DbSession = Annotated[Session, Depends(get_db)]
InternalUser = Annotated[User, Depends(get_current_internal_user)]
TaskWriter = Annotated[User, Depends(require_task_writer)]
TaskReviewer = Annotated[User, Depends(require_task_reviewer)]
StatusFilter = Annotated[TaskStatus | None, Query(alias="status")]


def _can_review(user: User) -> bool:
    return has_permission(user.roles, TASKS_REVIEW_PERMISSION)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(data: TaskCreateRequest, db: DbSession, requester: TaskWriter):
    payload = TaskCreate(
        description=data.description,
        due_date=data.due_date,
        assignee_id=data.assignee_id,
        idempotency_key=data.idempotency_key or str(uuid.uuid4()),
    )
    return TaskService(db).create(payload, requester=requester)


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    db: DbSession,
    _reviewer: TaskReviewer,
    task_status: StatusFilter = None,
    assignee_id: uuid.UUID | None = None,
):
    return TaskWorkflowService(db).list_all(task_status=task_status, assignee_id=assignee_id)


@router.get("/me", response_model=list[TaskResponse])
def list_my_tasks(db: DbSession, user: InternalUser, task_status: StatusFilter = None):
    return TaskWorkflowService(db).list_for_assignee(user, task_status)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: uuid.UUID, db: DbSession, user: InternalUser):
    return TaskWorkflowService(db).get_visible(task_id, user, can_review=_can_review(user))


@router.get("/{task_id}/history", response_model=list[TaskHistoryResponse])
def get_task_history(task_id: uuid.UUID, db: DbSession, user: InternalUser):
    return TaskWorkflowService(db).history(task_id, user, can_review=_can_review(user))


@router.post("/{task_id}/start", response_model=TaskResponse)
def start_task(task_id: uuid.UUID, db: DbSession, user: InternalUser):
    return TaskWorkflowService(db).start(task_id, user)


@router.patch("/{task_id}/execution", response_model=TaskResponse)
def update_task_execution(
    task_id: uuid.UUID, data: TaskExecutionUpdate, db: DbSession, user: InternalUser
):
    return TaskWorkflowService(db).update_execution(task_id, user, data.execution_description)


@router.post(
    "/{task_id}/attachments", response_model=TaskResponse, status_code=status.HTTP_201_CREATED
)
def add_task_attachment(
    task_id: uuid.UUID,
    db: DbSession,
    user: InternalUser,
    file: UploadFile = File(...),
):
    return TaskWorkflowService(db).add_attachment(
        task_id,
        user,
        file.filename or "anexo",
        file.file.read(TASK_ATTACHMENT_MAX_BYTES + 1),
        file.content_type,
    )


@router.delete("/{task_id}/attachments/{attachment_id}", response_model=TaskResponse)
def remove_task_attachment(
    task_id: uuid.UUID, attachment_id: uuid.UUID, db: DbSession, user: InternalUser
):
    return TaskWorkflowService(db).remove_attachment(task_id, attachment_id, user)


@router.get("/{task_id}/attachments/{attachment_id}/file", response_model=TaskFileResponse)
def get_task_attachment_file(
    task_id: uuid.UUID, attachment_id: uuid.UUID, db: DbSession, user: InternalUser
):
    return TaskWorkflowService(db).attachment_file(
        task_id, attachment_id, user, can_review=_can_review(user)
    )


@router.post("/{task_id}/submit", response_model=TaskResponse)
def submit_task(task_id: uuid.UUID, db: DbSession, user: InternalUser):
    return TaskWorkflowService(db).submit(task_id, user)


@router.post("/{task_id}/resume", response_model=TaskResponse)
def resume_task(task_id: uuid.UUID, db: DbSession, user: InternalUser):
    return TaskWorkflowService(db).resume(task_id, user)


@router.post("/{task_id}/approve", response_model=TaskResponse)
def approve_task(task_id: uuid.UUID, db: DbSession, reviewer: TaskReviewer):
    return TaskWorkflowService(db).approve(task_id, reviewer)


@router.post("/{task_id}/reject", response_model=TaskResponse)
def reject_task(task_id: uuid.UUID, data: TaskRejectInput, db: DbSession, reviewer: TaskReviewer):
    return TaskWorkflowService(db).reject(task_id, reviewer, data.reason)
