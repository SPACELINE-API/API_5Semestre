from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.shared.database import get_session_factory


@dataclass(frozen=True)
class SeedRole:
    name: str
    description: str
    permissions: tuple[str, ...]


SEED_ROLES = (
    SeedRole(
        name="Administrador",
        description="Administra usuários, roles e permissões.",
        permissions=("users.read", "users.write", "roles.read", "roles.write"),
    ),
    SeedRole(
        name="Atendimento",
        description="Atende clientes e acompanha solicitações.",
        permissions=("clients.read", "clients.write", "requests.read", "requests.write"),
    ),
    SeedRole(
        name="Projetos",
        description="Gerencia projetos e orçamentos.",
        permissions=("projects.read", "projects.write", "quotes.read", "quotes.approve"),
    ),
    SeedRole(
        name="Financeiro",
        description="Acessa informações financeiras autorizadas.",
        permissions=("finance.read", "finance.write"),
    ),
    SeedRole(
        name="Recursos externos",
        description="Acessa tarefas e documentos atribuídos.",
        permissions=("assignments.read", "documents.read"),
    ),
)


def seed_roles(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        seeded_roles: list[str] = []
        for seed_role in SEED_ROLES:
            database_session.execute(
                text(
                    """
                    INSERT INTO roles (id, name, description, is_active)
                    VALUES (gen_random_uuid(), :name, :description, TRUE)
                    ON CONFLICT (name) DO UPDATE SET
                        description = EXCLUDED.description,
                        updated_at = NOW()
                    """
                ),
                {"name": seed_role.name, "description": seed_role.description},
            )

            for permission_code in seed_role.permissions:
                database_session.execute(
                    text(
                        """
                        INSERT INTO permissions (id, code)
                        VALUES (gen_random_uuid(), :code)
                        ON CONFLICT (code) DO NOTHING
                        """
                    ),
                    {"code": permission_code},
                )

                database_session.execute(
                    text(
                        """
                        INSERT INTO role_permissions (role_id, permission_id)
                        SELECT roles.id, permissions.id
                        FROM roles, permissions
                        WHERE roles.name = :role_name AND permissions.code = :permission_code
                        ON CONFLICT DO NOTHING
                        """
                    ),
                    {"role_name": seed_role.name, "permission_code": permission_code},
                )

            seeded_roles.append(seed_role.name)

        _associate_seed_users(database_session)
        database_session.commit()
        return seeded_roles
    finally:
        if should_close_session:
            database_session.close()


def _associate_seed_users(db: Session) -> None:
    for legacy_role, role_name in (
        ("admin", "Administrador"),
        ("cliente", "Atendimento"),
        ("tradutor", "Recursos externos"),
    ):
        db.execute(
            text(
                """
                INSERT INTO user_roles (user_id, role_id)
                SELECT users.id, roles.id
                FROM users, roles
                WHERE users.role = :legacy_role AND roles.name = :role_name
                ON CONFLICT DO NOTHING
                """
            ),
            {"legacy_role": legacy_role, "role_name": role_name},
        )
