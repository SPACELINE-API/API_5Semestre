ALTER TABLE request
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contact(id) ON DELETE RESTRICT;

ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contact(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS ix_request_company_id ON request(company_id);
CREATE INDEX IF NOT EXISTS ix_request_contact_id ON request(contact_id);
CREATE INDEX IF NOT EXISTS ix_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS ix_quotes_contact_id ON quotes(contact_id);
