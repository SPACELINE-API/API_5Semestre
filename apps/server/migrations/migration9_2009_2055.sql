-- Running upgrade -> service_orders_feature

CREATE TABLE service_orders (
    id UUID NOT NULL,
    quote_id UUID NOT NULL,
    company_id UUID NOT NULL,
    project_name VARCHAR(150) NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(quote_id) REFERENCES quotes (id),
    FOREIGN KEY(company_id) REFERENCES company (id)
);

CREATE INDEX ix_service_orders_quote_id ON service_orders (quote_id);
CREATE INDEX ix_service_orders_company_id ON service_orders (company_id);

CREATE TABLE service_order_items (
    id UUID NOT NULL,
    service_order_id UUID NOT NULL,
    quote_translation_item_id UUID NOT NULL,
    translator_id UUID,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    document_type VARCHAR(100),
    file_url VARCHAR(500),
    price NUMERIC(10, 2),
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(service_order_id) REFERENCES service_orders (id) ON DELETE CASCADE,
    FOREIGN KEY(quote_translation_item_id) REFERENCES quote_translation_items (id),
    FOREIGN KEY(translator_id) REFERENCES translators (id)
);

CREATE INDEX ix_service_order_items_service_order_id ON service_order_items (service_order_id);

CREATE TABLE service_order_item_invites (
    id UUID NOT NULL,
    service_order_item_id UUID NOT NULL,
    translator_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(service_order_item_id) REFERENCES service_order_items (id) ON DELETE CASCADE,
    FOREIGN KEY(translator_id) REFERENCES translators (id)
);

CREATE INDEX ix_service_order_item_invites_service_order_item_id ON service_order_item_invites (service_order_item_id);
CREATE INDEX ix_service_order_item_invites_translator_id ON service_order_item_invites (translator_id);
