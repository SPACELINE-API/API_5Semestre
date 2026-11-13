from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.modules.auth.models.user import User
from app.modules.clients.models.company import Company
from app.modules.proposals.services.report_storage import upload_report
from app.modules.quotes.models.quote import Quote
from app.modules.reports.services.productivity_service import ProductivityService
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.translators.models.translator import Translator
from app.shared.database import get_session_factory

from .exportador_produtividade import gerar_arquivo
from .helpers_produtividade import indicadores, resolver
from .tools.listagem import LIMITE_RESULTADOS

LIMITE_CONSULTA = LIMITE_RESULTADOS + 1


def buscar_usuarios(email: str, role: str, apenas_ativos: bool) -> list[dict[str, Any]]:
    db = get_session_factory()()
    try:
        consulta = select(User)
        if email:
            consulta = consulta.where(User.email.ilike(f"%{email}%"))
        if role:
            consulta = consulta.where(User.role == role)
        if apenas_ativos:
            consulta = consulta.where(User.is_active.is_(True))
        usuarios = db.scalars(consulta.order_by(User.created_at.desc()).limit(LIMITE_CONSULTA))
        return [
            {
                "id": str(usuario.id),
                "email": usuario.email,
                "role": usuario.role,
                "is_active": usuario.is_active,
                "created_at": usuario.created_at.isoformat() if usuario.created_at else None,
            }
            for usuario in usuarios
        ]
    finally:
        db.close()


def buscar_clientes(nome: str, apenas_ativos: bool) -> list[dict[str, Any]]:
    db = get_session_factory()()
    try:
        consulta = db.query(Company)
        if nome:
            consulta = consulta.filter(
                (Company.trade_name.ilike(f"%{nome}%")) | (Company.legal_name.ilike(f"%{nome}%"))
            )
        if apenas_ativos:
            consulta = consulta.filter(Company.is_active.is_(True))
        empresas = consulta.order_by(Company.trade_name).limit(LIMITE_CONSULTA).all()
        return [
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
    finally:
        db.close()


def buscar_ordens_servico(nome_projeto: str) -> list[dict[str, Any]]:
    db = get_session_factory()()
    try:
        consulta = db.query(ServiceOrder).options(
            selectinload(ServiceOrder.company),
            selectinload(ServiceOrder.items),
        )
        if nome_projeto:
            consulta = consulta.filter(ServiceOrder.project_name.ilike(f"%{nome_projeto}%"))
        ordens = consulta.order_by(ServiceOrder.project_name).limit(LIMITE_CONSULTA).all()
        return [
            {
                "id": str(ordem.id),
                "nome_projeto": ordem.project_name,
                "prazo": ordem.deadline.isoformat() if ordem.deadline else None,
                "cliente": ordem.company.trade_name if ordem.company else None,
                "quantidade_itens": len(ordem.items) if ordem.items else 0,
            }
            for ordem in ordens
        ]
    finally:
        db.close()


def buscar_tradutores(nome: str) -> list[dict[str, Any]]:
    db = get_session_factory()()
    try:
        consulta = db.query(Translator)
        if nome:
            consulta = consulta.filter(Translator.name.ilike(f"%{nome}%"))
        tradutores = consulta.order_by(Translator.name).limit(LIMITE_CONSULTA).all()
        return [
            {
                "id": str(tradutor.id),
                "nome": tradutor.name,
                "email": tradutor.email,
                "telefone": tradutor.phone,
            }
            for tradutor in tradutores
        ]
    finally:
        db.close()


def buscar_orcamentos() -> list[dict[str, Any]]:
    db = get_session_factory()()
    try:
        orcamentos = (
            db.query(Quote)
            .options(selectinload(Quote.items))
            .order_by(Quote.id)
            .limit(LIMITE_CONSULTA)
            .all()
        )
        return [
            {
                "id": str(orcamento.id),
                "status": orcamento.status,
                "itens": [
                    {
                        "tipo_documento": item.document_type,
                        "idioma_origem": item.source_language,
                        "idioma_destino": item.target_language,
                        "valor_estimado": (
                            str(item.estimated_value) if item.estimated_value is not None else None
                        ),
                    }
                    for item in orcamento.items
                ],
            }
            for orcamento in orcamentos
        ]
    finally:
        db.close()


def buscar_produtividade(
    data_inicial: date | None,
    data_final: date | None,
    tradutor: str,
    ordem_servico: str,
    formato: str = "",
) -> dict[str, Any]:
    db = get_session_factory()()
    try:
        servico = ProductivityService(db)
        translator_id = service_order_id = None

        if tradutor or ordem_servico:
            filtros = servico.get_filters()

            if tradutor:
                translator_id, opcoes = resolver(
                    tradutor, [(t.id, t.name) for t in filtros.translators]
                )
                if translator_id is None:
                    motivo = "ambíguo" if opcoes else "não encontrado"
                    return {"erro": f"Tradutor {motivo}.", "opcoes": opcoes}

            if ordem_servico:
                service_order_id, opcoes = resolver(
                    ordem_servico, [(p.id, p.project_name) for p in filtros.projects]
                )
                if service_order_id is None:
                    motivo = "ambígua" if opcoes else "não encontrada"
                    return {"erro": f"Ordem de serviço {motivo}.", "opcoes": opcoes}

        try:
            relatorio = servico.get_report(
                data_inicial, data_final, translator_id, service_order_id
            )
        except HTTPException as exc:
            return {"erro": str(exc.detail)}

        resposta: dict[str, Any] = {
            "periodo_inicio": relatorio.period_start.isoformat(),
            "periodo_fim": relatorio.period_end.isoformat(),
            "resumo": indicadores(relatorio.summary),
            "tradutores": [
                {"tradutor": t.translator_name, **indicadores(t)} for t in relatorio.translators
            ],
        }

        if formato in ("csv", "xlsx"):
            if relatorio.summary.documents_translated == 0:
                resposta["erro"] = "Nenhum dado no período informado; arquivo não gerado."
            else:
                conteudo, nome, tipo = gerar_arquivo(relatorio, formato)
                resposta["arquivo_nome"] = nome
                resposta["arquivo_url"] = upload_report(conteudo, nome, tipo)

        return resposta
    finally:
        db.close()
