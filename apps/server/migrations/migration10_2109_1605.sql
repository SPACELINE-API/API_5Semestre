-- SPACELINE-73: pesquisa de clientes por nome, status e produto
-- Nota: o autogenerate do Alembic também detectou drift preexistente e
-- não relacionado em translators/technical_qualifications (fora do escopo
-- desta migration) — removido daqui de propósito.

ALTER TABLE company ADD COLUMN product VARCHAR(100);
