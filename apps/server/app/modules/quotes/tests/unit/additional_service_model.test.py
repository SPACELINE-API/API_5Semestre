from decimal import Decimal

from sqlalchemy import Numeric

from app.modules.quotes.models import AdditionalService, Quote


def test_quote_total_includes_additional_service_prices():
    quote = Quote()
    quote.additional_services = [
        AdditionalService(price=Decimal("20.00")),
        AdditionalService(price=Decimal("10.25")),
    ]

    assert quote.total_value == Decimal("30.25")


def test_additional_service_price_is_decimal_money_with_two_places():
    price_column = AdditionalService.__table__.c.price

    assert isinstance(price_column.type, Numeric)
    assert price_column.type.precision == 10
    assert price_column.type.scale == 2


def test_additional_service_status_matches_quote_status_values():
    status_constraint = next(
        constraint
        for constraint in AdditionalService.__table__.constraints
        if constraint.name == "ck_additional_services_status"
    )

    assert "pending" in str(status_constraint.sqltext)
    assert "approved" in str(status_constraint.sqltext)
    assert "reproved" in str(status_constraint.sqltext)


def test_additional_service_has_unique_description_per_quote_index():
    unique_index = next(
        index
        for index in AdditionalService.__table__.indexes
        if index.name == "uq_additional_services_quote_description"
    )

    assert unique_index.unique
    assert str(unique_index.expressions[0]) == "additional_services.quote_id"
    assert "lower(trim(description))" in str(unique_index.expressions[1])


def test_additional_service_stores_creator_id():
    columns = AdditionalService.__table__.c

    assert "created_by" in columns
    assert columns.created_by.nullable
