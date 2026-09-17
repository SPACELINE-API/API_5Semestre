-- Running upgrade  -> c1924a6ce88b

ALTER TABLE users ADD COLUMN role VARCHAR(255) NOT NULL DEFAULT 'cliente';
