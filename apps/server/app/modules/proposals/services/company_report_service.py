from __future__ import annotations

import uuid
from collections import Counter
from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.proposals.schemas.report import (
    CompanyReportCompany,
    CompanyReportRequest,
    CompanyReportResponse,
    ExecutionDeliveryReport,
    ExecutionFileReport,
    ExecutionReport,
    ReportDocumentSummary,
    ServiceOrderItemReport,
    ServiceOrderReport,
)
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    ServiceOrderItem,
)
from app.modules.service_orders.services.service_order_service import compute_aggregate_status


class CompanyReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def generate(self, filters: CompanyReportRequest) -> CompanyReportResponse:
        companies = self._get_companies(filters.company_ids)
        contacts_count = self._get_contacts_count(filters.company_ids)
        reports: list[CompanyReportCompany] = []

        for company in companies:
            requests = self._get_requests(company.id, filters)
            quotes = self._get_quotes(company.id, filters)
            service_orders = self._get_service_orders(company.id, filters)

            if not requests and not quotes and not service_orders:
                continue

            order_reports = [self._build_service_order(order, filters) for order in service_orders]
            execution = self._build_execution(order_reports, service_orders, filters)
            reports.append(
                self._build_company_report(
                    company,
                    contacts_count.get(company.id, 0),
                    requests,
                    quotes,
                    order_reports,
                    execution,
                )
            )

        if not reports:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhuma empresa selecionada possui dados no período informado.",
            )

        return CompanyReportResponse(
            period_start=filters.start_date,
            period_end=filters.end_date,
            granularity=filters.granularity,
            companies=reports,
            total_companies=len(reports),
        )

    def _get_companies(self, company_ids: list[uuid.UUID]) -> list[Company]:
        companies = list(
            self.db.scalars(
                select(Company).where(Company.id.in_(company_ids)).order_by(Company.trade_name)
            )
        )
        found_ids = {company.id for company in companies}
        missing = [str(company_id) for company_id in company_ids if company_id not in found_ids]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa(s) não encontrada(s): {', '.join(missing)}.",
            )
        return companies

    def _get_contacts_count(self, company_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        rows = self.db.execute(
            select(Contact.company_id, func.count(Contact.id))
            .where(Contact.company_id.in_(company_ids))
            .group_by(Contact.company_id)
        )
        return {company_id: count for company_id, count in rows}

    def _get_requests(self, company_id: uuid.UUID, filters: CompanyReportRequest) -> list[Request]:
        return list(
            self.db.scalars(
                select(Request)
                .options(selectinload(Request.company), selectinload(Request.contact))
                .where(
                    Request.company_id == company_id,
                    Request.request_date >= filters.start_date,
                    Request.request_date <= filters.end_date,
                )
                .order_by(Request.request_date)
            )
        )

    def _get_quotes(self, company_id: uuid.UUID, filters: CompanyReportRequest) -> list[Quote]:
        start = datetime.combine(filters.start_date, datetime.min.time())
        end = datetime.combine(filters.end_date, datetime.max.time())
        return list(
            self.db.scalars(
                select(Quote)
                .options(
                    selectinload(Quote.items),
                    selectinload(Quote.additional_services),
                    selectinload(Quote.request),
                )
                .where(
                    Quote.company_id == company_id,
                    Quote.created_at >= start,
                    Quote.created_at <= end,
                )
                .order_by(Quote.created_at)
            )
        )

    def _get_service_orders(
        self, company_id: uuid.UUID, filters: CompanyReportRequest
    ) -> list[ServiceOrder]:
        orders = list(
            self.db.scalars(
                select(ServiceOrder)
                .options(
                    selectinload(ServiceOrder.items).selectinload(ServiceOrderItem.translator),
                    selectinload(ServiceOrder.files).selectinload(
                        ServiceOrderFile.delivery_attempts
                    ),
                    selectinload(ServiceOrder.delivery_attempts),
                )
                .where(ServiceOrder.company_id == company_id)
                .order_by(ServiceOrder.created_at)
            )
        )
        return [order for order in orders if self._order_has_period_data(order, filters)]

    @staticmethod
    def _in_period(value: date | datetime | None, filters: CompanyReportRequest) -> bool:
        if value is None:
            return False
        reference = value.date() if isinstance(value, datetime) else value
        return filters.start_date <= reference <= filters.end_date

    def _order_has_period_data(self, order: ServiceOrder, filters: CompanyReportRequest) -> bool:
        if self._in_period(order.created_at, filters):
            return True
        return (
            any(
                self._in_period(item.completed_at, filters)
                or self._in_period(item.created_at, filters)
                for item in order.items
            )
            or any(self._in_period(file.uploaded_at, filters) for file in order.files)
            or any(
                self._in_period(delivery.attempted_at, filters)
                for delivery in order.delivery_attempts
            )
        )

    def _build_company_report(
        self,
        company: Company,
        contacts_count: int,
        requests: list[Request],
        quotes: list[Quote],
        service_orders: list[ServiceOrderReport],
        execution: ExecutionReport,
    ) -> CompanyReportCompany:
        translation_value = sum(
            (item.estimated_value or Decimal("0") for quote in quotes for item in quote.items),
            Decimal("0"),
        )
        additional_value = sum(
            (service.price for quote in quotes for service in quote.additional_services),
            Decimal("0"),
        )
        proposal_values = translation_value + additional_value

        return CompanyReportCompany(
            company_id=company.id,
            legal_name=company.legal_name,
            trade_name=company.trade_name,
            cnpj=company.cnpj,
            industry=company.industry,
            city=company.city,
            state=company.state,
            status="active" if company.is_active else "inactive",
            registered_at=company.created_at,
            contacts_count=contacts_count,
            requests_total=len(requests),
            requests_by_status=dict(Counter(request.status.value for request in requests)),
            request_languages=sorted(
                {
                    language
                    for request in requests
                    for language in (request.original_language, request.translation_language)
                    if language
                }
            ),
            request_needs=sorted(
                {request.customer_need for request in requests if request.customer_need}
            ),
            request_documents=[
                ReportDocumentSummary(
                    filename=request.document_filename,
                    content_type=request.document_content_type,
                    file_url=request.document_url,
                )
                for request in requests
                if request.has_document
            ],
            proposals_total=len(quotes),
            proposals_by_status=dict(Counter(quote.status for quote in quotes)),
            estimated_value=proposal_values,
            translation_items_value=translation_value,
            additional_services_value=additional_value,
            proposal_created_at=[quote.created_at for quote in quotes],
            proposal_approved_at=[quote.approved_at for quote in quotes if quote.approved_at],
            proposal_reproved_at=[quote.reproved_at for quote in quotes if quote.reproved_at],
            reproval_reasons=[quote.reproval_reason for quote in quotes if quote.reproval_reason],
            service_orders_total=len(service_orders),
            service_orders=service_orders,
            execution=execution,
        )

    def _build_service_order(
        self, order: ServiceOrder, filters: CompanyReportRequest
    ) -> ServiceOrderReport:
        items = [
            self._build_item(item)
            for item in order.items
            if self._in_period(item.created_at, filters)
            or self._in_period(item.completed_at, filters)
            or self._in_period(order.created_at, filters)
        ]
        completed = [item for item in items if item.status == STATUS_CONCLUIDA]
        return ServiceOrderReport(
            service_order_id=order.id,
            project_name=order.project_name,
            domain_area=order.domain_area,
            price_category=order.price_category,
            deadline=order.deadline,
            created_at=order.created_at,
            status=compute_aggregate_status(order.items),
            items_count=len(items),
            completed_items_count=len(completed),
            items=items,
        )

    @staticmethod
    def _build_item(item: ServiceOrderItem) -> ServiceOrderItemReport:
        completed_on_time = None
        if item.deadline is not None and item.completed_at is not None:
            completed_on_time = item.completed_at <= item.deadline
        return ServiceOrderItemReport(
            item_id=item.id,
            source_language=item.source_language,
            target_language=item.target_language,
            document_type=item.document_type,
            price=item.price,
            deadline=item.deadline,
            status=item.status,
            completed_at=item.completed_at,
            completed_on_time=completed_on_time,
            translator_id=item.translator_id,
            translator_name=item.translator.name if item.translator else None,
        )

    def _build_execution(
        self,
        order_reports: list[ServiceOrderReport],
        orders: list[ServiceOrder],
        filters: CompanyReportRequest,
    ) -> ExecutionReport:
        files: list[ExecutionFileReport] = []
        deliveries: list[ExecutionDeliveryReport] = []
        translator_ids: set[uuid.UUID] = set()
        completed_items = 0
        completed_on_time = 0
        translation_value = Decimal("0")

        for report in order_reports:
            for item in report.items:
                if item.translator_id:
                    translator_ids.add(item.translator_id)
                if item.status == STATUS_CONCLUIDA:
                    completed_items += 1
                    completed_on_time += int(item.completed_on_time is True)
                    translation_value += item.price or Decimal("0")

        for order in orders:
            for file in order.files:
                if not self._in_period(file.uploaded_at, filters):
                    continue
                files.append(
                    ExecutionFileReport(
                        file_id=file.id,
                        service_order_id=file.service_order_id,
                        item_id=file.service_order_item_id,
                        filename=file.filename,
                        direction=file.direction,
                        review_status=file.review_status,
                        delivery_status=file.delivery_status,
                        uploaded_at=file.uploaded_at,
                    )
                )
            for delivery in order.delivery_attempts:
                if not self._in_period(delivery.attempted_at, filters):
                    continue
                deliveries.append(
                    ExecutionDeliveryReport(
                        delivery_id=delivery.id,
                        document_file_id=delivery.document_file_id,
                        service_order_id=delivery.service_order_id,
                        status=delivery.status,
                        attempted_at=delivery.attempted_at,
                        sent_at=delivery.sent_at,
                        error_message=delivery.error_message,
                    )
                )

        return ExecutionReport(
            translation_items_value=translation_value,
            translators=sorted(translator_ids, key=str),
            files=files,
            deliveries=deliveries,
            delivered_count=sum(1 for delivery in deliveries if delivery.status == "sent"),
            completed_items_count=completed_items,
            completed_items_on_time_count=completed_on_time,
        )
