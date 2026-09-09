# Arquitetura do Sistema

## Visão Geral
Este documento descreve a arquitetura do projeto Spaceline, um sistema voltado para a gestão operacional de serviços de tradução, abrangendo desde o cadastro de clientes e recursos (tradutores), até o fluxo de orçamentos, ordens de serviço, alocação de tarefas, suporte via agente inteligente e faturamento.

O projeto adota uma arquitetura de monolito Modular gerenciado via `pnpm`, dividindo as responsabilidades em duas aplicações principais: Backend (`apps/server`) e Frontend (`apps/web`).

---

## Estrutura do monolito
A raiz do projeto contém as configurações globais de integração e padronização:
- `pnpm-workspace.yaml`: Gerenciamento dos múltiplos pacotes (workspaces).
- `.husky/` e `commitlint.config.js`: Padronização e validação de commits.
- `docker-compose.yml`: Orquestração da infraestrutura local de desenvolvimento.

---

## Backend (`apps/server`)

O backend é desenvolvido em **Python** e adota uma arquitetura modular orientada a domínios de negócio. Cada módulo encapsula suas próprias regras, modelos e rotas, promovendo baixo acoplamento e alta coesão estrutural e de dados.

### Estrutura de Diretórios
Os domínios estão localizados em `apps/server/app/modules/`. O fluxo de requisição segue uma arquitetura em camadas padrão:

1. **Routes (`routes.py`)**: Camada de exposição da API. Responsável por receber as requisições HTTP e roteá-las.
2. **Schemas (`schemas/`)**: Contratos de entrada e saída (DTOs) para validação de dados.
3. **Services (`services/`)**: Camada onde residem as regras de negócio puras estipuladas no backlog (ex: cálculos de preços, validações de transição de status).
4. **Repositories (`repositories/`)**: Camada de abstração de acesso a dados. Isola o serviço do ORM e das consultas diretas ao banco.
5. **Models (`models/`)**: Representação das entidades do domínio e mapeamento objeto-relacional.
6. **Tests (`tests/`)**: Testes isolados por domínio.

### Principais Módulos de Domínio
- **auth**: Responsável exclusivamente pela autenticação, controle e expiração de sessões (incluindo logout automático por inatividade) e validação de tokens de segurança.
- **users**: Focado no gerenciamento das contas de usuários do sistema, associação de perfis de acesso (atendimento, projetos, financeiro, recursos externos) e definição de suas respectivas permissões.
- **clients**: Concentra as regras de negócio e persistência das empresas clientes, mantendo o controle de status (ativo/inativo) e dados básicos para relacionamento comercial.
- **contacts**: Entidade dependente vinculada aos clientes. Gerencia os pontos de contato dentro de uma empresa, validando dados como e-mail, telefone e departamento.
- **translators**: Módulo dedicado às especificidades dos profissionais de tradução (banco de talentos). Controla os pares de idiomas, qualificações técnicas, especialidades e disponibilidade.
- **quotes**: Gerencia a transformação de requisições em propostas comerciais (orçamentos). Lida com a precificação, adição de itens, definição de idiomas de origem/destino e fluxo de aprovação.
- **service_orders**: Domínio central da execução do trabalho. Herda os dados dos orçamentos aprovados e gerencia as fases, status e evolução do fluxo operacional do projeto de tradução.
- **allocations**: Responsável pelo motor de distribuição de trabalho. Gerencia o envio de propostas de tarefas para múltiplos tradutores simultaneamente, vinculando a ordem de serviço ao primeiro recurso que realizar o aceite dentro do prazo.
- **support**: Módulo de integração com o agente de suporte inteligente. Lida com a consulta de dados de contexto baseada em permissões e aciona rotinas para execução de ações automatizadas no sistema.
- **resources**: Abstração genérica para gestão de recursos não-humanos ou artefatos do sistema, centralizando o armazenamento, upload e controle de acesso restrito aos documentos confidenciais transacionados nas fases do projeto.

---

## Frontend (`apps/web`)

O frontend é uma aplicação Single Page Application (SPA) desenvolvida com **React**, **TypeScript** e **Vite**.

### Stack Tecnológica
- **Linguagem/Framework**: React + TypeScript.
- **Build Tool**: Vite.
- **Roteamento**: TanStack Router (`routeTree.gen.ts`, `router.tsx`), oferecendo rotas tipadas de forma segura.
- **Gerenciamento de Estado de Servidor**: TanStack Query (`queryClient.ts`).
- **Estilização**: Tailwind CSS (`global.css`).
- **Testes**: Playwright configurado (`playwright.config.ts`) para testes End-to-End (E2E).

### Estrutura de Diretórios
A estrutura do frontend reflete a organização modular do backend, localizada em `apps/web/src/modules/`. Cada módulo de feature contém:

- **components/**: Componentes visuais específicos da feature.
- **hooks/**: Lógicas customizadas e consumo de estado via TanStack Query.
- **pages/**: Telas mapeadas nas rotas do TanStack Router.
- **services/**: Chamadas e integração via cliente HTTP.
- **types/**: Definições de tipagem TypeScript do domínio.

Além dos módulos de negócio, existe o diretório `shared/` (`shared/components`, `shared/services`, `shared/types`, `shared/styles`) destinado ao reaproveitamento de código global na aplicação, incluindo o cliente base da API (`apiClient.ts`).

---

## Decisões Arquiteturais e Padrões

1. **Separação de Preocupações (SoC)**: A estrutura em módulos/features evita o crescimento desordenado e facilita a manutenção e escalabilidade de domínios específicos.
2. **Design Orientado a Domínio (Camadas)**: A clara separação no Backend entre rotas, regras de negócio (Services) e persistência (Repositories) garante que as US (User Stories) do backlog sejam implementadas e testadas de forma isolada, evitando acoplamento de contexto.
3. **Segurança de Tipos End-to-End**: A adoção de TypeScript no frontend em conjunto com ferramentas tipadas (TanStack Router) reduz inconsistências na comunicação de dados internos e na integração visual.