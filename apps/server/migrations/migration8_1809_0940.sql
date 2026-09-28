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


