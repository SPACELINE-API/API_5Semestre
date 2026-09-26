# Arquitetura do sistema

## Visão geral

O monorepo pnpm contém um aplicativo multiplataforma e uma API. Docker Compose
fornece PostgreSQL e serviços locais compatíveis com Supabase.

## Aplicativo mobile

O frontend usa React Native, React, TypeScript e Expo. Expo Router organiza a
navegação, e React Native Web permite a execução no navegador. A aplicação
organiza telas e serviços por domínio e compartilha componentes e integrações. A
estilização usa NativeWind.

## API

A API usa FastAPI, SQLAlchemy e Pydantic. A aplicação configura CORS, health
check e integração Inngest, e publica seus endpoints sob `/api`.

Os endpoints cobrem autenticação, usuários, clientes, contatos, recursos,
tradutores, orçamentos, ordens de serviço, alocações e suporte. Os módulos
organizam suas rotas, validações, regras, persistência e testes por domínio. O
agente de suporte usa Google ADK e Inngest.

## Banco de dados

O ambiente local é configurado com Docker Compose e oferece PostgreSQL, além de
serviços de autenticação, REST, storage e gateway. O backend acessa PostgreSQL
usando SQLAlchemy e psycopg.

As migrations versionadas são arquivos SQL. O gerador usa Alembic para comparar
metadados e criar SQL; o aplicador executa migrations pendentes e registra as
execuções. Consulte o
[guia de migrations](<./Guia de Models e Migrations no Backend com SQLAlchemy e Alembic.md>).

## Comandos principais

```bash
docker compose up -d
pnpm dev
```

Também é possível iniciar separadamente com `pnpm dev:mobile` ou
`pnpm dev:server`.

## Qualidade e documentação

O backend usa pytest, Ruff e mypy; o app mobile usa TypeScript, ESLint e
Playwright. A CI valida backend e mobile; veja o
[guia de CI](<./CI - GitHub Actions.md>).

Os PRDs da Sprint 1 estão disponíveis diretamente nesta pasta. Eles descrevem
requisitos e devem ser lidos como escopo, não como inventário de funcionalidades
já disponíveis.
