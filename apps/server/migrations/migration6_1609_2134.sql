-- Running upgrade  -> 9174c41d734a

CREATE TABLE company (
    id UUID NOT NULL, 
    legal_name VARCHAR(150) NOT NULL, 
    trade_name VARCHAR(150) NOT NULL, 
    cnpj VARCHAR(18) NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    industry VARCHAR(100) NOT NULL, 
    phone VARCHAR(30) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    zip_code VARCHAR(10) NOT NULL, 
    street VARCHAR(150) NOT NULL, 
    number VARCHAR(10) NOT NULL, 
    complement VARCHAR(100), 
    neighborhood VARCHAR(100) NOT NULL, 
    city VARCHAR(100) NOT NULL, 
    state VARCHAR(2) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id),
    UNIQUE (cnpj),
    UNIQUE (email)
);
