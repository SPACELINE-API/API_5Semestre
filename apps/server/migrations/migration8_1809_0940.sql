-- Running upgrade  -> 573684e9afd7

CREATE TABLE contact (
    id UUID NOT NULL, 
    name VARCHAR(150) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    phone VARCHAR(30) NOT NULL, 
    department VARCHAR(100) NOT NULL, 
    company_id UUID NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(company_id) REFERENCES company (id)
);

DROP TABLE request;

ALTER TABLE technical_qualifications DROP CONSTRAINT technical_qualifications_name_key;

DROP INDEX ix_technical_qualifications_name;

CREATE UNIQUE INDEX ix_technical_qualifications_name ON technical_qualifications (name);

ALTER TABLE translator_language_pairs ALTER COLUMN proficiency_level TYPE VARCHAR(12);

DROP INDEX ix_translator_language_pairs_pair;

DROP INDEX ix_translator_language_pairs_translator;

ALTER TABLE translators DROP CONSTRAINT translators_email_key;

DROP INDEX ix_translators_email;

CREATE UNIQUE INDEX ix_translators_email ON translators (email);
