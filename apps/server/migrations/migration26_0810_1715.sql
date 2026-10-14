CREATE TABLE service_order_email_templates (
    key VARCHAR(100) PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
