<!-- Fonte: https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/4292610 | ID 4292610 | versão 5 | exportado em 2026-09-26 -->

# Guia de Models e Migrations no Backend com SQLAlchemy e Alembic

> Revisado contra o repositório em 2026-09-26. Fonte:
> [página original no Confluence](https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/4292610)
> (versão 4).

## Fluxo atual

1. Crie ou altere o model no módulo correspondente do backend.
2. Gere a migration com `pnpm --filter @api/server db:migration:create`.
3. Revise o SQL criado na pasta de migrations do backend.
4. Aplique as migrations pendentes com
   `pnpm --filter @api/server db:migration:apply`.

Os models dos módulos do backend são reunidos para que Alembic compare a
estrutura declarada com o banco configurado.

O processo de geração usa Alembic para comparar os models com o banco
configurado. Ele cria uma revisão temporária, gera SQL e remove essa revisão. As
migrations mantidas no repositório são arquivos SQL.

O processo de aplicação lê as migrations SQL, ordena-as pelo número e registra
quais já foram executadas. O argumento `--sql` não é uma opção de prévia desse
processo; revise o SQL gerado antes de aplicar.

## Banco local

```bash
docker compose up -d spaceline-db
docker exec spaceline-db pg_isready -U postgres -d postgres
pnpm --filter @api/server db:migration:apply
```

## Comandos úteis

```bash
pnpm --filter @api/server db:migration:create
pnpm --filter @api/server db:migration:apply
pnpm --filter @api/server db:seed
pnpm --filter @api/server test
pnpm --filter @api/server lint
pnpm --filter @api/server format:check
```

Ao abrir um PR de banco, inclua o model e o SQL revisado. Mudanças de estrutura
devem ser reproduzíveis pelo processo de migration, sem depender apenas de
edição manual no Supabase Studio.
