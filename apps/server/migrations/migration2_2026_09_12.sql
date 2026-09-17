CREATE TABLE users (
    id UUID NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    last_login_at TIMESTAMP WITH TIME ZONE, 
    email_verified_at TIMESTAMP WITH TIME ZONE, 
    failed_login_attempts INTEGER DEFAULT '0' NOT NULL, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);
