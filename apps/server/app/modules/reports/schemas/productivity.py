import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class ProductivityIndicators(BaseModel):
    documents_translated: int
    total_words: int
    total_value: Decimal
    projects_count: int
    on_time_documents: int
    late_documents: int
    on_time_rate: float | None
    average_turnaround_days: float | None


class TranslatorProductivity(ProductivityIndicators):
    translator_id: uuid.UUID
    translator_name: str


class ProductivityReportResponse(BaseModel):
    period_start: date
    period_end: date
    translator_id: uuid.UUID | None
    service_order_id: uuid.UUID | None
    summary: ProductivityIndicators
    translators: list[TranslatorProductivity]


class ProductivityDeliveredFile(BaseModel):
    id: uuid.UUID
    filename: str
    file_url: str
    uploaded_at: datetime


class ProductivityDocument(BaseModel):
    item_id: uuid.UUID
    service_order_id: uuid.UUID
    project_name: str
    source_language: str
    target_language: str
    document_type: str | None
    word_count: int | None
    price: Decimal | None
    deadline: datetime | None
    completed_at: datetime | None
    on_time: bool | None
    original_file_url: str | None
    delivered_files: list[ProductivityDeliveredFile]


class TranslatorProductivityDetails(TranslatorProductivity):
    period_start: date
    period_end: date
    service_order_id: uuid.UUID | None
    documents: list[ProductivityDocument]


class ProductivityTranslatorOption(BaseModel):
    id: uuid.UUID
    name: str


class ProductivityProjectOption(BaseModel):
    id: uuid.UUID
    project_name: str


class ProductivityFiltersResponse(BaseModel):
    translators: list[ProductivityTranslatorOption]
    projects: list[ProductivityProjectOption]
