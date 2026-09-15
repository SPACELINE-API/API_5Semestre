-- Running upgrade  -> edcd20a55b3d

CREATE TABLE system_parameters (
    id UUID NOT NULL, 
    key VARCHAR(255) NOT NULL, 
    value TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_system_parameters_key ON system_parameters (key);
