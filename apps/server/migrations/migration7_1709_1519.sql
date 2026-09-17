-- Running upgrade  -> bb52c3c43523

CREATE TYPE statusenum AS ENUM ('PENDING', 'APPROVED');

CREATE TABLE request (
    id UUID NOT NULL, 
    customer_name VARCHAR(255) NOT NULL, 
    enterprise VARCHAR(155) NOT NULL, 
    email VARCHAR(155) NOT NULL, 
    original_language VARCHAR(50) NOT NULL, 
    translation_language VARCHAR(50) NOT NULL, 
    customer_need VARCHAR(100) NOT NULL, 
    status statusenum NOT NULL, 
    request_date DATE DEFAULT CURRENT_DATE NOT NULL, 
    PRIMARY KEY (id)
);