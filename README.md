# SpaceLine - API ADS 5º Semestre

<p align="center">
  <a href="#desafio">Desafio</a> |
  <a href="#tecnologias">Tecnologias</a> |
  <a href="#backlog">Backlog do Produto</a> |
  <a href="#documentacao">Documentação</a> |
  <a href="#calendario">Calendário de Entregas</a> |
  <a href="#sprint">Resumo das Sprints</a> |
  <a href="#execucao">Execução local</a> |
  <a href="#equipe">Equipe</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20andamento-yellow?style=flat-square" />
  <img src="https://img.shields.io/badge/sprint%20atual-01-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/branch%20strategy-GitFlow-orange?style=flat-square" />
</p>

---

## Desafio

<a id="desafio"></a>

Desenvolvimento de uma aplicação web para apoiar a gestão de solicitações de
serviços linguísticos, contemplando cadastro de clientes, contatos, recursos,
tradutores, cotações, ordens de serviço e alocações.

---

## Tecnologias

<a id="tecnologias"></a>

<div align="left">
  <img src="https://go-skill-icons.vercel.app/api/icons?i=typescript,react,reactnative,expo,tailwindcss,python,fastapi,sqlalchemy,postgresql,supabase,gemini,docker,pnpm,git,github,vscode,figma,jira" />
</div>

**Aplicativo:** React Native, Expo e Expo Router, com NativeWind (Tailwind CSS).

**Backend:** Python, FastAPI, SQLAlchemy e PostgreSQL, com Supabase Auth e
Storage.

**IA e tarefas assíncronas:** Google ADK, Gemini via Google GenAI, LiteLLM e
Inngest.

---

## Backlog do Produto

<a id="backlog"></a>

**Estratégia de branch do projeto:** GitFlow

### Épicos

<details>
<summary>Ver os 8 épicos do produto</summary>

| Tag      | Epic                                     | Descrição                                                                                        | Sprint |
| :------- | :--------------------------------------- | :----------------------------------------------------------------------------------------------- | :----: |
| **EP.1** | Cadastro de Clientes e Contatos          | Cadastro, pesquisa e exportação de empresas clientes e seus contato                              |   1    |
| **EP.2** | Cadastro de Recursos (Tradutores)        | Cadastro e pesquisa de recursos tradutores, com especialidades, idiomas e disponibilidade        |   1    |
| **EP.3** | Workflow de Ordem de Serviço e Alocação  | Fluxo de etapas do projeto, oferta e aceite de tarefas pelos recursos, acesso restrito por etapa |   1    |
| **EP.4** | Agente de Suporte                        | Agente com acesso aos dados do sistema, capaz de executar ações reais de atendimento             |   1    |
| **EP.5** | Gestão de Orçamentos                     | Criação de orçamentos, adição de itens/documentos e conversão em ordem de serviço                |   1    |
| **EP.6** | Painel Inicial e Notificações            | Painel com atalhos por perfil e configuração de e-mail (SMTP) por usuário                        |   2    |
| **EP.7** | Autenticação, Permissões e Configurações | Perfis de acesso, logout automático por inatividade e parâmetros do sistema                      |   2    |
| **EP.8** | Faturamento                              | Visualização de projetos concluídos, geração de fatura de venda e de compra                      |   3    |

</details>

### User Stories

> Os critérios de cada história e as definições de pronto e concluído estão no
> [documento do backlog](https://docs.google.com/document/d/1y5mgLee0ODzNuNWELqOQ5WxeNwAjjckNg6AiLV85xEY/edit?usp=sharing).

<details open>
<summary><strong>Ver as 32 User Stories priorizadas</strong></summary>

| Rank |   US   | Estimativa | Descrição                                                                                                                                                                                                        | Prioridade | Sprint | Epic |
| :--: | :----: | :--------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------: | :----: | :--: |
|  1   | `US1`  |     5      | Como atendente, quero registrar um novo tradutor definindo suas qualificações técnicas e pares de idiomas para alimentar o banco de talentos.                                                                    | Altíssima  |   1    | EP.2 |
|  2   | `US2`  |     5      | Como administrador, quero restringir o acesso dos tradutores aos arquivos de sua fase específica, garantindo o foco exclusivo em suas atribuições.                                                               | Altíssima  |   1    | EP.3 |
|  3   | `US3`  |     5      | Como atendente, quero visualizar as requisições recebidas dos clientes para transformá-las em orçamento.                                                                                                         | Altíssima  |   1    | EP.5 |
|  4   | `US4`  |     3      | Como cliente, quero preencher uma pré-solicitação informando idioma e necessidade, sem precisar de login completo, para agilizar o primeiro contato.                                                             | Altíssima  |   1    | EP.4 |
|  5   | `US5`  |     5      | Como colaborador da Aliança, quero contar com um agente de suporte que responda perguntas, para tirar dúvidas sobre o sistema.                                                                                   | Altíssima  |   1    | EP.1 |
|  6   | `US7`  |     5      | Como atendente, quero cadastrar uma empresa cliente com nome e status ativo ou inativo para iniciar o relacionamento comercial.                                                                                  |    Alta    |   1    | EP.1 |
|  7   | `US8`  |     5      | Como atendente, quero cadastrar contatos dentro de uma empresa cliente, com e-mail, telefone e departamento, para saber com quem falar.                                                                          |    Alta    |   1    | EP.4 |
|  8   | `US9`  |     5      | Como colaborador da Alliança, quero que o agente de suporte consulte meus dados reais ao responder, para receber informações atualizadas e específicas do meu caso.                                              |    Alta    |   1    | EP.1 |
|  9   | `US10` |     3      | Como atendente, quero pesquisar clientes com filtros de nome e status para localizar rapidamente um cliente na base.                                                                                             |    Alta    |   1    | EP.1 |
|  10  | `US11` |     3      | Como atendente, quero marcar um recurso como inativo para removê-lo temporariamente das buscas de alocação.                                                                                                      |    Alta    |   1    | EP.2 |
|  11  | `US12` |     3      | Como atendente, quero pesquisar recursos ativos filtrando por idioma, especialidade e disponibilidade para encontrar o profissional certo.                                                                       |    Alta    |   1    | EP.2 |
|  12  | `US13` |     3      | Como gestor de projetos, quero visualizar a ordem de serviço com as informações herdadas do orçamento para planejar a execução do trabalho.                                                                      |    Alta    |   1    | EP.3 |
|  13  | `US14` |     3      | Como atendente, quero que uma requisição aprovada gere automaticamente um orçamento pré preenchido para agilizar o atendimento.                                                                                  |    Alta    |   1    | EP.5 |
|  14  | `US15` |     5      | Como atendente, quero adicionar itens e documentos ao orçamento, informando o idioma de origem e destino, para compor o escopo do serviço.                                                                       |    Alta    |   1    | EP.5 |
|  15  | `US16` |     3      | Como atendente, quero que a aprovação do orçamento gere automaticamente uma ordem de serviço, carregando os dados já preenchidos.                                                                                |    Alta    |   1    | EP.3 |
|  16  | `US17` |     8      | Como gestor de projetos, desejo disparar propostas de tarefas para múltiplos profissionais simultaneamente, com valores pré-estabelecidos, vinculando automaticamente o projeto ao primeiro recurso que aceitar. |    Alta    |   1    | EP.3 |
|  17  | `US18` |     8      | Como gestor de projetos, quero mover automaticamente uma tarefa de uma etapa para outra quando a etapa anterior for concluída, para manter o fluxo de tradução em andamento.                                     |    Alta    |   1    | EP.3 |
|  18  | `US6`  |     8      | Como administrador, quero cadastrar listas de preços por par de idiomas e definir pesos de ponderação, para calcular automaticamente o valor de cada serviço de tradução.                                        |    Alta    |   2    | EP.5 |
|  19  | `US19` |     3      | Como atendente, quero enviar o documento final ao cliente por e-mail diretamente pelo sistema para concluir a entrega.                                                                                           |    Alta    |   2    | EP.3 |
|  20  | `US20` |     8      | Como administrador, quero definir perfis de acesso para atendimento, projetos, financeiro e recursos externos, cada um com suas permissões.                                                                      |    Alta    |   2    | EP.7 |
|  21  | `US21` |     3      | Como colaborador da Aliança, quero um painel inicial com atalhos para as principais ações do meu perfil para agilizar meu trabalho diário.                                                                       |   Média    |   2    | EP.6 |
|  22  | `US22` |     5      | Como administrador, quero associar serviços adicionais com preço próprio a um recurso ou serviço, para compor o valor final cobrado ao cliente.                                                                  |   Média    |   2    | EP.5 |
|  23  | `US23` |     3      | Como gestor de projetos, desejo acessar a listagem de propostas comerciais por período para monitorar o fluxo de vendas do sistema.                                                                              |   Média    |   2    | EP.6 |
|  24  | `US24` |     8      | Como gestor de projetos, desejo acompanhar o desempenho individual através de relatórios de produtividade para monitorar o volume de entregas por profissional.                                                  |   Média    |   2    | EP.3 |
|  25  | `US25` |     8      | Como gestor de projetos, quero visualizar um painel com a quantidade e o valor de requisições, orçamentos, serviços e faturas por status, para acompanhar a operação em um período selecionado.                  |   Média    |   2    | EP.6 |
|  26  | `US26` |     8      | Como gestor de projetos, quero contar com um agente que execute ações reais no sistema, como cadastrar tarefas, para resolver pendências entre setores.                                                          |   Média    |   3    | EP.4 |
|  27  | `US27` |     3      | Como financeiro, quero acessar a listagem de projetos finalizados e aguardar o faturamento para estruturar o processo de cobrança no ERP externo.                                                                |   Média    |   3    | EP.8 |
|  28  | `US28` |     3      | Como atendente, quero que a finalização de um projeto dispare de forma automática a fase de cobrança para agilizar o encerramento financeiro.                                                                    |   Média    |   3    | EP.8 |
|  29  | `US29` |     5      | Como administrador, quero associar um usuário a um ou mais perfis de acesso para conceder as permissões corretas.                                                                                                |   Média    |   3    | EP.7 |
|  30  | `US30` |     3      | Como atendente, quero selecionar múltiplos clientes e exportar em Excel ou CSV para gerar relatórios externos.                                                                                                   |   Média    |   3    | EP.8 |
|  31  | `US31` |     5      | Como financeiro, quero gerar um comprovante de venda ao cliente e a fatura de compra para pagamento dos recursos, separadamente.                                                                                 |   Baixa    |   3    | EP.8 |
|  32  | `US32` |     8      | Como administrador, quero desconectar automaticamente um usuário após um período de inatividade configurável para manter a segurança dos documentos confidenciais.                                               |   Baixa    |   3    | EP.7 |

</details>

---

## Documentação

<a id="documentacao"></a>

- [Backlog, critérios de aceite, DoR e DoD](https://docs.google.com/document/d/1y5mgLee0ODzNuNWELqOQ5WxeNwAjjckNg6AiLV85xEY/edit?usp=sharing)
- [Manual de execução local na Wiki](https://github.com/SPACELINE-API/API_5Semestre/wiki/Manual-de-execucao-local)

---

## Calendário de Entregas

<a id="calendario"></a>

| Sprint                | Previsão      | Status       |
| --------------------- | ------------- | ------------ |
| Kick Off Geral        | 24/08 - 28/08 | ✅ Concluído |
| Construção do Backlog | 31/08 - 04/09 | ✅ Concluído |
| 01                    | 07/09 - 27/09 | Em andamento |
| 02                    | 05/10 - 25/10 | ⚪ A definir |
| 03                    | 02/11 - 22/11 | ⚪ A definir |

---

## Resumo das Sprints

<a id="sprint"></a>

<details>
<summary><strong>Sprint 1</strong></summary>

### Objetivos da Sprint

Nesta sprint, foi planejada a construção da base inicial do sistema:

- Estrutura inicial do monolito modular com frontend, backend e banco de dados
- Configuração do aplicativo multiplataforma com Expo, React Native, TypeScript,
  NativeWind e Expo Router
- Configuração do backend em FastAPI com divisão por módulos
- Configuração do PostgreSQL via Docker Compose
- Organização inicial dos módulos de autenticação, usuários, clientes, contatos,
  recursos, tradutores, ordens de serviço, alocações, cotações e suporte

### Registro visual

<!-- Adicione aqui as imagens da Sprint 1, uma por linha ou em tabela, ex:
<p align="center">
  <img src="./docs/images/sprint1-1.png" width="45%" />
  <img src="./docs/images/sprint1-2.png" width="45%" />
</p>
-->

</details>

<details>
<summary><strong>Sprint 2</strong></summary>

### Objetivos da Sprint

Escopo previsto nos épicos EP.6 e EP.7: painel inicial com atalhos por perfil,
notificações, autenticação, permissões e configurações de e-mail (SMTP) por
usuário.

</details>

<details>
<summary><strong>Sprint 3</strong></summary>

### Objetivos da Sprint

Escopo previsto no épico EP.8: acompanhar projetos concluídos e organizar o
faturamento, incluindo faturas de venda e de compra.

</details>

---

## Execução local

<a id="execucao"></a>

Consulte o
[Manual de execução local na Wiki](https://github.com/SPACELINE-API/API_5Semestre/wiki/Manual-de-execucao-local).

---

## Docentes

| P²                        | m¹                    |
| ------------------------- | --------------------- |
| Professor Gerson da Penha | Professor Juan Hassam |

## SpaceTeam

<a id="equipe"></a>

|    Função     | Nome                               | GitHub                                                                                                                                             |
| :-----------: | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
|  Team Member  | Gustavo Santos Moreira             | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/MoreiraGu)          |
|  Team Member  | Julia Roberta Ferreira Prianti     | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/juliaprianti06)     |
| Product Owner | Letícia Gabriele de Oliveira Lopes | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/Leti-10)            |
|  Team Member  | Yasmin Cristina Padilha            | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/yaspadilha)         |
| Scrum Master  | Vinícius Lopes Machado             | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/Vlopes7)            |
|  Team Member  | Lincoln Borsoi Moreira             | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/Dollar2006)         |
|  Team Member  | Mariana Rebelo Tebecherani         | [![GitHub Badge](https://img.shields.io/badge/GitHub-111217?style=flat-square&logo=github&logoColor=white)](https://github.com/Marianatebecherani) |
