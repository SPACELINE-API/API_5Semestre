-- Running upgrade  -> 59143f7a3110

CREATE TABLE languages (
    id VARCHAR(20) NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id)
);

ALTER TABLE quote_translation_items ADD COLUMN document_type VARCHAR(100);

ALTER TABLE quote_translation_items ADD COLUMN file_url VARCHAR(500);

ALTER TABLE quote_translation_items ADD COLUMN estimated_value NUMERIC(10, 2);

