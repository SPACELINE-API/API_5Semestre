<!-- Fonte: https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/3342337 | ID 3342337 | versão 4 | exportado em 2026-09-26 -->

# CI - GitHub Actions

> Revisado contra as automações do repositório em 2026-09-26. Fonte:
> [página original no Confluence](https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/3342337)
> (versão 3).

## Workflow de qualidade

O workflow de qualidade executa em pull requests abertas, atualizadas ou
reabertas, sem restringir a branch de destino. Execuções antigas da mesma PR são
canceladas.

### Guard

Configura pnpm 11.9, Node.js 22 e Python 3.11; instala dependências e verifica
formatação mobile, Ruff e mypy do backend.

### Backend quality

Inicia o PostgreSQL `spaceline-db` por Docker Compose e roda pytest com
cobertura. O relatório segue para o job Code coverage, que o envia ao Codecov.

### Mobile quality

Executa TypeScript, ESLint e valida a configuração Expo. Embora exista script
Playwright no pacote mobile, o workflow atual não executa E2E nem faz build do
app.

### Resultado

O job CI success depende de Guard, Backend quality, Mobile quality e Code
coverage.

## Outros workflows

- Uma automação tenta corrigir Prettier/ESLint, Ruff e ordenação do TOML em PRs.
- Outra automação notifica o Discord quando uma PR é aberta ou reaberta; requer
  uma credencial configurada no repositório.

## Verificações locais

Na raiz:

```bash
pnpm --filter mobile format:check
pnpm --filter mobile typecheck
pnpm --filter mobile lint
```

Em `apps/server`:

```bash
ruff check .
ruff format --check .
mypy .
pytest --cov --cov-report=xml
```
