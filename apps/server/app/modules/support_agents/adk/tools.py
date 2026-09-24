from sqlalchemy import text
from sqlalchemy.orm import selectinload

from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.translators.models.translator import Translator
from app.shared.database import get_session_factory

__test__ = False


def listar_usuarios(email: str = "", role: str = "", apenas_ativos: bool = False) -> dict:
    """Lista usuários cadastrados no sistema. Use quando o colaborador
    pedir para ver, listar ou buscar usuários por e-mail, por perfil/role
    (ex: admin, tradutor, cliente) ou pelo status de ativação.

    Args:
        email: filtro parcial pelo e-mail do usuário (opcional)
        role: filtro exato pelo role/perfil do usuário, ex: 'admin', 'tradutor', 'cliente' (opcional)
        apenas_ativos: se True, retorna apenas usuários com is_active = true
    """
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

    db = get_session_factory()()
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


def consultar_clientes(nome: str = "", apenas_ativos: bool = False) -> dict:
    """Consulta clientes/empresas cadastrados no sistema. Use quando o
    colaborador perguntar sobre dados de uma empresa cliente, CNPJ,
    segmento, contato, endereço, ou quais clientes estão ativos/inativos.

    Args:
        nome: filtro parcial pelo nome fantasia ou razão social da empresa (opcional)
        apenas_ativos: se True, retorna apenas empresas com status ativo
    """
    db = get_session_factory()()
    try:
        query = db.query(Company)

        if nome:
            query = query.filter(
                (Company.trade_name.ilike(f"%{nome}%")) | (Company.legal_name.ilike(f"%{nome}%"))
            )
        if apenas_ativos:
            query = query.filter(Company.is_active.is_(True))

        empresas = query.limit(50).all()

        data = [
            {
                "id": str(empresa.id),
                "nome_fantasia": empresa.trade_name,
                "razao_social": empresa.legal_name,
                "cnpj": empresa.cnpj,
                "segmento": empresa.industry,
                "telefone": empresa.phone,
                "email": empresa.email,
                "cidade": empresa.city,
                "estado": empresa.state,
                "ativo": empresa.is_active,
            }
            for empresa in empresas
        ]
        return {"status": "success", "data": data}
    except Exception as exc:
        return {"status": "error", "error_message": str(exc)}
    finally:
        db.close()


def consultar_ordens_servico(nome_projeto: str = "") -> dict:
    """Consulta ordens de serviço (projetos de tradução) no sistema. Use
    quando o colaborador perguntar sobre status de um projeto, prazo de
    entrega, idiomas de tradução, ou qual empresa solicitou um serviço.

    Args:
        nome_projeto: filtro parcial pelo nome do projeto (opcional)
    """
    db = get_session_factory()()
    try:
        query = db.query(ServiceOrder).options(
            selectinload(ServiceOrder.company),
            selectinload(ServiceOrder.items),
        )

        if nome_projeto:
            query = query.filter(ServiceOrder.project_name.ilike(f"%{nome_projeto}%"))

        ordens = query.limit(50).all()

        data = [
            {
                "id": str(ordem.id),
                "nome_projeto": ordem.project_name,
                "prazo": ordem.deadline.isoformat() if ordem.deadline else None,
                "cliente": ordem.company.trade_name if ordem.company else None,
                "quantidade_itens": len(ordem.items) if ordem.items else 0,
            }
            for ordem in ordens
        ]
        return {"status": "success", "data": data}
    except Exception as exc:
        return {"status": "error", "error_message": str(exc)}
    finally:
        db.close()


def consultar_tradutores(nome: str = "") -> dict:
    """Consulta tradutores cadastrados no sistema. Use quando o colaborador
    perguntar sobre dados de contato de um tradutor, ou quais tradutores
    estão disponíveis no sistema.

    Args:
        nome: filtro parcial pelo nome do tradutor (opcional)
    """
    db = get_session_factory()()
    try:
        query = db.query(Translator)

        if nome:
            query = query.filter(Translator.name.ilike(f"%{nome}%"))

        tradutores = query.limit(50).all()

        data = [
            {
                "id": str(tradutor.id),
                "nome": tradutor.name,
                "email": tradutor.email,
                "telefone": tradutor.phone,
            }
            for tradutor in tradutores
        ]
        return {"status": "success", "data": data}
    except Exception as exc:
        return {"status": "error", "error_message": str(exc)}
    finally:
        db.close()


def consultar_orcamentos() -> dict:
    """Consulta orçamentos (quotes) no sistema. Use quando o colaborador
    perguntar sobre orçamentos aprovados, pendentes, ou valores estimados
    de tradução.
    """
    db = get_session_factory()()
    try:
        orcamentos = db.query(Quote).options(selectinload(Quote.items)).limit(50).all()

        data = [
            {
                "id": str(orcamento.id),
                "status": orcamento.status,
                "itens": [
                    {
                        "tipo_documento": item.document_type,
                        "idioma_origem": item.source_language,
                        "idioma_destino": item.target_language,
                        "valor_estimado": str(item.estimated_value),
                    }
                    for item in orcamento.items
                ],
            }
            for orcamento in orcamentos
        ]
        return {"status": "success", "data": data}
    except Exception as exc:
        return {"status": "error", "error_message": str(exc)}
    finally:
        db.close()


listar_usuarios.__test__ = False  # type: ignore[attr-defined]
consultar_clientes.__test__ = False  # type: ignore[attr-defined]
consultar_ordens_servico.__test__ = False  # type: ignore[attr-defined]
consultar_tradutores.__test__ = False  # type: ignore[attr-defined]
consultar_orcamentos.__test__ = False  # type: ignore[attr-defined]
