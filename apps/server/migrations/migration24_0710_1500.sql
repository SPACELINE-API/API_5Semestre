CREATE TABLE additional_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_additional_services_description CHECK (length(trim(description)) > 0),
    CONSTRAINT ck_additional_services_status
        CHECK (status IN ('pending', 'approved', 'reproved')),
    CONSTRAINT ck_additional_services_price_non_negative
        CHECK (price >= 0)
);

CREATE UNIQUE INDEX uq_additional_services_quote_description
    ON additional_services (quote_id, lower(trim(description)));
