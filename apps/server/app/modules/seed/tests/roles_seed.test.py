from app.modules.seed.seed_roles import SEED_ROLES


def test_seed_roles_declares_active_roles_with_permissions() -> None:
    assert [role.name for role in SEED_ROLES] == [
        "Administrador",
        "Atendimento",
        "Projetos",
        "Financeiro",
        "Recursos externos",
    ]
    assert all(role.permissions for role in SEED_ROLES)
    assert len({permission for role in SEED_ROLES for permission in role.permissions}) >= 8


def test_proposals_read_is_seeded_only_for_authorized_roles() -> None:
    permissions_by_role = {role.name: set(role.permissions) for role in SEED_ROLES}

    assert "proposals.read" in permissions_by_role["Administrador"]
    assert "proposals.read" in permissions_by_role["Projetos"]
    assert all(
        "proposals.read" not in permissions
        for role_name, permissions in permissions_by_role.items()
        if role_name not in {"Administrador", "Projetos"}
    )
