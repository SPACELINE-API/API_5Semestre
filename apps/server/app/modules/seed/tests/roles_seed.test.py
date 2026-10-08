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
