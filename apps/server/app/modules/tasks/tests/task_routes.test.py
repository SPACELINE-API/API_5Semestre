import pytest

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user
from app.modules.tasks.models.task_history import TaskHistory
from app.modules.tasks.tests.conftest import TasksEnv, pdf_file


def _post(env: TasksEnv, path: str, json: dict | None = None):
    return env.client.post(f"/api/tasks/{path}", json=json)


def _start_with_execution(env: TasksEnv, task_id: str) -> None:
    assert _post(env, f"{task_id}/start").status_code == 200
    response = env.client.patch(
        f"/api/tasks/{task_id}/execution",
        json={"execution_description": "Contratos organizados por cliente."},
    )
    assert response.status_code == 200, response.text


# CRIACAO


def test_create_task_registers_requester_assignee_and_pending_status(env: TasksEnv) -> None:
    employee = env.user()

    task = env.create_task(employee)

    assert task["status"] == "pending"
    assert task["assignee"]["id"] == str(employee.id)
    assert task["requester"]["id"] == str(env.admin.id)
    assert task["due_date"] == "2026-12-01"
    assert task["attachments"] == []


def test_create_task_requires_tasks_write_permission(env: TasksEnv) -> None:
    employee = env.user()
    env.act_as(env.user())

    response = env.client.post(
        "/api/tasks", json={"description": "Tarefa", "assignee_id": str(employee.id)}
    )

    assert response.status_code == 403


def test_user_with_tasks_write_can_create_but_not_review(env: TasksEnv) -> None:
    employee = env.user()
    manager = env.user(permissions=("tasks.write",))
    env.act_as(manager)

    created = env.client.post(
        "/api/tasks", json={"description": "Tarefa", "assignee_id": str(employee.id)}
    )
    listed = env.client.get("/api/tasks")

    assert created.status_code == 201
    assert listed.status_code == 403


def test_create_task_without_token_is_unauthorized(env: TasksEnv) -> None:
    app.dependency_overrides.pop(get_current_user)

    response = env.client.post("/api/tasks", json={"description": "x"})

    assert response.status_code == 401


@pytest.mark.parametrize("case", ["translator", "inactive"])
def test_create_task_rejects_assignee_that_is_not_an_active_employee(
    env: TasksEnv, case: str
) -> None:
    assignee = (
        env.user(legacy_role="tradutor") if case == "translator" else env.user(is_active=False)
    )

    response = env.client.post(
        "/api/tasks", json={"description": "Tarefa", "assignee_id": str(assignee.id)}
    )

    assert response.status_code == 422


def test_create_task_rejects_blank_description(env: TasksEnv) -> None:
    response = env.client.post(
        "/api/tasks", json={"description": "   ", "assignee_id": str(env.user().id)}
    )

    assert response.status_code == 422


# CONSULTA E ISOLAMENTO


def test_employee_sees_only_own_tasks(env: TasksEnv) -> None:
    employee = env.user()
    colleague = env.user()
    own = env.create_task(employee, "Minha tarefa")
    other = env.create_task(colleague, "Tarefa do colega")
    env.act_as(employee)

    listed = env.client.get("/api/tasks/me")
    detail = env.client.get(f"/api/tasks/{own['id']}")
    foreign = env.client.get(f"/api/tasks/{other['id']}")

    assert [item["id"] for item in listed.json()] == [own["id"]]
    assert detail.status_code == 200
    assert foreign.status_code == 404


def test_employee_cannot_act_on_task_of_another_employee(env: TasksEnv) -> None:
    task = env.create_task(env.user())
    env.act_as(env.user())

    assert _post(env, f"{task['id']}/start").status_code == 404


def test_translator_cannot_access_internal_tasks(env: TasksEnv) -> None:
    env.act_as(env.user(legacy_role="tradutor"))

    assert env.client.get("/api/tasks/me").status_code == 403


def test_admin_lists_tasks_of_all_employees_with_filters(env: TasksEnv) -> None:
    employee = env.user()
    first = env.create_task(employee, "Primeira")
    env.create_task(env.user(), "Segunda")
    env.act_as(employee)
    _post(env, f"{first['id']}/start")
    env.act_as(env.admin)

    all_tasks = env.client.get("/api/tasks")
    in_progress = env.client.get("/api/tasks", params={"status": "in_progress"})
    by_assignee = env.client.get("/api/tasks", params={"assignee_id": str(employee.id)})

    assert len(all_tasks.json()) == 2
    assert [item["id"] for item in in_progress.json()] == [first["id"]]
    assert [item["id"] for item in by_assignee.json()] == [first["id"]]


def test_employee_status_filter_on_own_tasks(env: TasksEnv) -> None:
    employee = env.user()
    started = env.create_task(employee, "Iniciada")
    env.create_task(employee, "Pendente")
    env.act_as(employee)
    _post(env, f"{started['id']}/start")

    response = env.client.get("/api/tasks/me", params={"status": "in_progress"})

    assert [item["id"] for item in response.json()] == [started["id"]]


# EXECUCAO, AVALIACAO E TRANSICOES


def test_full_flow_with_rejection_and_resume_is_recorded_in_history(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _start_with_execution(env, task_id)
    assert _post(env, f"{task_id}/submit").json()["status"] == "in_review"

    env.act_as(env.admin)
    rejected = _post(env, f"{task_id}/reject", {"reason": "Faltou o contrato da Acme."})
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["rejection_reason"] == "Faltou o contrato da Acme."

    env.act_as(employee)
    resumed = _post(env, f"{task_id}/resume")
    assert resumed.json()["status"] == "in_progress"
    assert resumed.json()["rejection_reason"] == "Faltou o contrato da Acme."
    assert _post(env, f"{task_id}/submit").status_code == 200

    env.act_as(env.admin)
    approved = _post(env, f"{task_id}/approve")
    assert approved.json()["status"] == "completed"
    assert approved.json()["reviewed_at"] is not None

    history = env.client.get(f"/api/tasks/{task_id}/history").json()
    assert [entry["action"] for entry in history] == [
        "created",
        "started",
        "execution_updated",
        "submitted",
        "rejected",
        "resumed",
        "submitted",
        "approved",
    ]
    rejection = next(entry for entry in history if entry["action"] == "rejected")
    assert rejection["from_status"] == "in_review"
    assert rejection["to_status"] == "rejected"
    assert rejection["details"]["reason"] == "Faltou o contrato da Acme."
    assert rejection["actor_id"] == str(env.admin.id)


def test_rejection_requires_justification(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _start_with_execution(env, task_id)
    _post(env, f"{task_id}/submit")
    env.act_as(env.admin)

    without_body = _post(env, f"{task_id}/reject", {})
    blank = _post(env, f"{task_id}/reject", {"reason": "   "})

    assert without_body.status_code == 422
    assert blank.status_code == 422
    assert env.client.get(f"/api/tasks/{task_id}").json()["status"] == "in_review"


def test_submit_requires_execution_description(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _post(env, f"{task_id}/start")

    response = _post(env, f"{task_id}/submit")

    assert response.status_code == 422
    assert env.client.get(f"/api/tasks/{task_id}").json()["status"] == "in_progress"


@pytest.mark.parametrize(
    ("action", "actor"),
    [
        ("submit", "employee"),
        ("resume", "employee"),
        ("approve", "admin"),
    ],
)
def test_invalid_transitions_from_pending_are_rejected(
    env: TasksEnv, action: str, actor: str
) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee if actor == "employee" else env.admin)

    response = _post(env, f"{task_id}/{action}")

    assert response.status_code == 409
    assert env.client.get(f"/api/tasks/{task_id}").json()["status"] == "pending"


def test_task_cannot_be_started_twice_or_changed_after_completion(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _start_with_execution(env, task_id)
    assert _post(env, f"{task_id}/start").status_code == 409
    _post(env, f"{task_id}/submit")
    env.act_as(env.admin)
    _post(env, f"{task_id}/approve")

    assert _post(env, f"{task_id}/reject", {"reason": "Tarde demais"}).status_code == 409
    env.act_as(employee)
    assert _post(env, f"{task_id}/resume").status_code == 409
    assert (
        env.client.patch(
            f"/api/tasks/{task_id}/execution", json={"execution_description": "Mudança"}
        ).status_code
        == 409
    )


def test_employee_cannot_review_tasks(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _start_with_execution(env, task_id)
    _post(env, f"{task_id}/submit")

    assert _post(env, f"{task_id}/approve").status_code == 403
    assert _post(env, f"{task_id}/reject", {"reason": "Eu mesmo"}).status_code == 403


def test_execution_cannot_be_edited_while_in_review(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _start_with_execution(env, task_id)
    _post(env, f"{task_id}/submit")

    response = env.client.patch(
        f"/api/tasks/{task_id}/execution", json={"execution_description": "Outra"}
    )

    assert response.status_code == 409


# ANEXOS


def test_employee_attaches_multiple_files_and_reviewer_downloads(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _post(env, f"{task_id}/start")

    first = env.client.post(f"/api/tasks/{task_id}/attachments", files=pdf_file("a.pdf"))
    second = env.client.post(
        f"/api/tasks/{task_id}/attachments",
        files={"file": ("planilha.xlsx", b"PK\x03\x04 dados", None)},
    )

    assert first.status_code == 201, first.text
    attachments = second.json()["attachments"]
    assert [item["filename"] for item in attachments] == ["a.pdf", "planilha.xlsx"]
    assert len(env.uploaded) == 2
    assert all(path.startswith(f"{task_id}/") for path in env.uploaded)

    env.act_as(env.admin)
    file_response = env.client.get(f"/api/tasks/{task_id}/attachments/{attachments[0]['id']}/file")
    assert file_response.status_code == 200
    assert file_response.json()["url"].startswith("https://storage.test/")

    history = env.db.query(TaskHistory).filter_by(action="attachment_added").count()
    assert history == 2


def test_employee_removes_attachment_while_in_progress(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _post(env, f"{task_id}/start")
    attachment = env.client.post(f"/api/tasks/{task_id}/attachments", files=pdf_file()).json()[
        "attachments"
    ][0]

    response = env.client.delete(f"/api/tasks/{task_id}/attachments/{attachment['id']}")

    assert response.status_code == 200
    assert response.json()["attachments"] == []
    assert len(env.deleted) == 1


def test_attachments_require_task_in_progress(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)

    response = env.client.post(f"/api/tasks/{task_id}/attachments", files=pdf_file())

    assert response.status_code == 409
    assert env.uploaded == {}


@pytest.mark.parametrize(
    ("filename", "content", "expected"),
    [("script.exe", b"MZ binario", 422), ("vazio.pdf", b"", 422)],
)
def test_invalid_attachments_are_rejected(
    env: TasksEnv, filename: str, content: bytes, expected: int
) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _post(env, f"{task_id}/start")

    response = env.client.post(
        f"/api/tasks/{task_id}/attachments",
        files={"file": (filename, content, "application/octet-stream")},
    )

    assert response.status_code == expected
    assert env.uploaded == {}


def test_other_employee_cannot_download_attachment(env: TasksEnv) -> None:
    employee = env.user()
    task_id = env.create_task(employee)["id"]
    env.act_as(employee)
    _post(env, f"{task_id}/start")
    attachment_id = env.client.post(f"/api/tasks/{task_id}/attachments", files=pdf_file()).json()[
        "attachments"
    ][0]["id"]
    env.act_as(env.user())

    response = env.client.get(f"/api/tasks/{task_id}/attachments/{attachment_id}/file")

    assert response.status_code == 404
