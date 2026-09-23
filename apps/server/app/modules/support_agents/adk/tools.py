from sqlalchemy import text

from app.shared.database import get_session_factory  # ajusta o caminho real do módulo

__test__ = False


def listar_usuarios(email: str = "", role: str = "", apenas_ativos: bool = False) -> dict:
    """..."""
    filtros = []
    params: dict = {}

    if email:
        filtros.append("email ILIKE :email")
        params["email"] = f"%{email}%"

    if role:
        filtros.append("role = :role")
        params["role"] = role

    if apenas_ativos:
        filtros.append("is_active = true")

    where_clause = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    query = text(
        f"""
        SELECT id, email, role, is_active, created_at
        FROM users
        {where_clause}
        ORDER BY created_at DESC
        LIMIT 50
        """
    )

    session_factory = get_session_factory()
    db = session_factory()
    try:
        result = db.execute(query, params)
        usuarios = [
            {
                "id": str(row.id),
                "email": row.email,
                "role": row.role,
                "is_active": row.is_active,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in result
        ]
        return {"status": "success", "data": usuarios}
    except Exception as exc:
        return {"status": "error", "error_message": str(exc)}
    finally:
        db.close()

listar_usuarios.__test__ = False  # type: ignore[attr-defined]
