import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ReportGranularity = Literal["days", "months", "years"]
ReportFormat = Literal["json", "csv", "xlsx"]


class CompanyReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company_ids: list[uuid.UUID] = Field(..., min_length=1)
    start_date: date
    end_date: date
    granularity: ReportGranularity = "months"
    format: ReportFormat = "json"

    @model_validator(mode="after")
    def validate_period(self) -> "CompanyReportRequest":
        if self.start_date > self.end_date:
            raise ValueError("A data inicial não pode ser posterior à data final.")
        return self


class ReportDocumentSummary(BaseModel):
    filename: str | None = None
    content_type: str | None = None
    file_url: str | None = None


class CompanyReportCompany(BaseModel):
    company_id: uuid.UUID
    legal_name: str
    trade_name: str
    cnpj: str
    industry: str
    city: str
    state: str
    status: str
    registered_at: datetime
    contacts_count: int

    requests_total: int
    requests_by_status: dict[str, int]
    request_languages: list[str]
    request_needs: list[str]
    request_documents: list[ReportDocumentSummary]

    proposals_total: int
    proposals_by_status: dict[str, int]
    estimated_value: Decimal
    translation_items_value: Decimal
    additional_services_value: Decimal
    proposal_created_at: list[datetime]
    proposal_approved_at: list[datetime]
    proposal_reproved_at: list[datetime]
    reproval_reasons: list[str]

    service_orders_total: int
    service_orders: list["ServiceOrderReport"]
    execution: "ExecutionReport"


class ServiceOrderItemReport(BaseModel):
    item_id: uuid.UUID
    source_language: str
    target_language: str
    document_type: str | None
    price: Decimal | None
    deadline: datetime | None
    status: str
    completed_at: datetime | None
    completed_on_time: bool | None
    translator_id: uuid.UUID | None
    translator_name: str | None


class ServiceOrderReport(BaseModel):
    service_order_id: uuid.UUID
    project_name: str
    domain_area: str | None
    price_category: str | None
    deadline: datetime | None
    created_at: datetime
    status: str
    items_count: int
    completed_items_count: int
    items: list[ServiceOrderItemReport]


class ExecutionFileReport(BaseModel):
    file_id: uuid.UUID
    service_order_id: uuid.UUID
    item_id: uuid.UUID | None
    filename: str
    direction: str
    review_status: str
    delivery_status: str
    uploaded_at: datetime


class ExecutionDeliveryReport(BaseModel):
    delivery_id: uuid.UUID
    document_file_id: uuid.UUID
    service_order_id: uuid.UUID
    status: str
    attempted_at: datetime
    sent_at: datetime | None
    error_message: str | None


class ExecutionReport(BaseModel):
    translation_items_value: Decimal
    translators: list[uuid.UUID]
    files: list[ExecutionFileReport]
    deliveries: list[ExecutionDeliveryReport]
    delivered_count: int
    completed_items_count: int
    completed_items_on_time_count: int


class CompanyReportResponse(BaseModel):
    period_start: date
    period_end: date
    granularity: ReportGranularity
    companies: list[CompanyReportCompany]
    total_companies: int
