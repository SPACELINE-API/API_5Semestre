# SpaceLine - API ADS 5º Semestre

<p align="center">
  <a href="#desafio">Desafio</a> |
  <a href="#tecnologias">Tecnologias</a> |
  <a href="#backlog">Backlog do Produto</a> |
  <a href="#calendario">Calendário de Entregas</a> |
  <a href="#sprint">Resumo das Sprints</a> |
  <a href="#teste">Manual de Execução</a> |
  <a href="#equipe">Equipe</a>
</p>

## Desafio

<a id="desafio"></a>

Desenvolvimento de uma aplicação web para apoiar a gestão de solicitações de serviços linguísticos, contemplando cadastro de clientes, contatos, recursos, tradutores, cotações, ordens de serviço e alocações.

---

## Tecnologias

<a id="tecnologias"></a>

<div align="left">
  <img src="https://go-skill-icons.vercel.app/api/icons?i=typescript,react,vite,tailwind,python,fastapi,postgresql,docker,pnpm,git,github,vscode,figma,jira" />
</div>

---

## Backlog do Produto

<a id="backlog"></a>

| Rank | User Story                                                                                                                                                                                                       | Prioridade | Sprint |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1    | Como atendente, quero registrar um novo tradutor definindo suas qualificações técnicas e pares de idiomas para alimentar o banco de talentos.                                                                    | Altíssima  | 1      |
| 2    | Como administrador, quero restringir o acesso dos tradutores aos arquivos de sua fase específica, garantindo o foco exclusivo em suas atribuições.                                                               | Altíssima  | 1      |
| 3    | Como atendente, quero visualizar as requisições recebidas dos clientes para transformá-las em orçamento.                                                                                                         | Altíssima  | 1      |
| 4    | Como cliente, quero preencher uma pré-solicitação informando idioma e necessidade, sem precisar de login completo, para agilizar o primeiro contato.                                                             | Altíssima  | 1      |
| 5    | Como colaborador da Aliança, quero contar com um agente de suporte que responda perguntas, para tirar dúvidas sobre o sistema.                                                                                   | Altíssima  | 1      |
| 6    | Como atendente, quero cadastrar uma empresa cliente com nome e status ativo ou inativo para iniciar o relacionamento comercial.                                                                                  | Alta       | 1      |
| 7    | Como atendente, quero cadastrar contatos dentro de uma empresa cliente, com e-mail, telefone e departamento, para saber com quem falar.                                                                          | Alta       | 1      |
| 8    | Como colaborador da Alliança, quero que o agente de suporte consulte meus dados reais ao responder, para receber informações atualizadas e específicas do meu caso.                                              | Alta       | 1      |
| 9    | Como atendente, quero pesquisar clientes com filtros de nome, status e produto para localizar rapidamente um cliente na base.                                                                                    | Alta       | 1      |
| 10   | Como atendente, quero marcar um recurso como inativo para removê-lo temporariamente das buscas de alocação.                                                                                                      | Alta       | 1      |
| 11   | Como atendente, quero pesquisar recursos ativos filtrando por idioma, especialidade e disponibilidade para encontrar o profissional certo.                                                                       | Alta       | 1      |
| 12   | Como gestor de projetos, quero visualizar a ordem de serviço com as informações herdadas do orçamento para planejar a execução do trabalho.                                                                      | Alta       | 1      |
| 13   | Como atendente, quero que uma requisição aprovada gere automaticamente um orçamento pré preenchido para agilizar o atendimento.                                                                                  | Alta       | 1      |
| 14   | Como atendente, quero adicionar itens e documentos ao orçamento, informando o idioma de origem e destino, para compor o escopo do serviço.                                                                       | Alta       | 1      |
| 15   | Como atendente, quero que a aprovação do orçamento gere automaticamente uma ordem de serviço, carregando os dados já preenchidos.                                                                                | Alta       | 1      |
| 16   | Como gestor de projetos, desejo disparar propostas de tarefas para múltiplos profissionais simultaneamente, com valores pré-estabelecidos, vinculando automaticamente o projeto ao primeiro recurso que aceitar. | Alta       | 2      |
| 17   | Como gestor de projetos, quero mover automaticamente uma tarefa de uma etapa para outra quando a etapa anterior for concluída, para manter o fluxo de tradução em andamento.                                     | Alta       | 2      |
| 18   | Como atendente, quero enviar o documento final ao cliente por e-mail diretamente pelo sistema para concluir a entrega.                                                                                           | Alta       | 2      |
| 19   | Como administrador, quero cadastrar listas de preços por par de idiomas e definir pesos de ponderação, para calcular automaticamente o valor de cada serviço de tradução.                                        | Alta       | 2      |
| 20   | Como colaborador da Alliança, quero um painel inicial com atalhos para as principais ações do meu perfil para agilizar meu trabalho diário.                                                                      | Média      | 2      |
| 21   | Como administrador, quero associar serviços adicionais com preço próprio a um recurso ou serviço, para compor o valor final cobrado ao cliente.                                                                  | Média      | 2      |
| 22   | Como gestor de projetos, desejo acessar a listagem de propostas comerciais por período para monitorar o fluxo de vendas do sistema.                                                                              | Baixa      | 2      |
| 23   | Como gestor de projetos, desejo acompanhar o desempenho individual através de relatórios de produtividade para monitorar o volume de entregas por profissional.                                                  | Baixa      | 2      |
| 24   | Como gestor de projetos, quero visualizar um painel com a quantidade e o valor de requisições, orçamentos, serviços e faturas por status, para acompanhar a operação em um período selecionado.                  | Baixa      | 2      |
| 25   | Como gestor de projetos, quero contar com um agente que execute ações reais no sistema, como cadastrar tarefas, para resolver pendências entre setores.                                                          | Baixa      | 2      |
| 26   | Como atendente, quero que a finalização de um projeto dispare de forma automática a fase de cobrança para agilizar o encerramento financeiro.                                                                    | Altíssima  | 3      |
| 27   | Como administrador, quero definir perfis de acesso para atendimento, projetos, financeiro e recursos externos, cada um com suas permissões.                                                                      | Altíssima  | 3      |
| 28   | Como financeiro, quero gerar um comprovante de venda ao cliente e a fatura de compra para pagamento dos recursos, separadamente.                                                                                 | Alta       | 3      |
| 29   | Como administrador, quero desconectar automaticamente um usuário após um período de inatividade configurável para manter a segurança dos documentos confidenciais.                                               | Alta       | 3      |
| 30   | Como administrador, quero associar um usuário a um ou mais perfis de acesso para conceder as permissões corretas.                                                                                                | Média      | 3      |
| 31   | Como atendente, quero selecionar múltiplos clientes e exportar em Excel ou CSV para gerar relatórios externos.                                                                                                   | Média      | 3      |
| 32   | Como financeiro, quero acessar a listagem de projetos finalizados e aguardar o faturamento para estruturar o processo de cobrança no ERP externo.                                                                | Baixa      | 3      |

---

## Calendário de Entregas

<a id="calendario"></a>

| Sprint                | Previsão      | Status       |
| --------------------- | ------------- | ------------ |
| Kick Off Geral        | 24/08 - 28/08 | Concluído    |
| Construção do Backlog | 31/08 - 04/09 | Concluído    |
| 01                    | 07/09 - 27/09 | Em andamento |
| 02                    | 05/10 - 25/10 | A definir    |
| 03                    | 02/11 - 22/11 | A definir    |

---

## Resumo das Sprints

<a id="sprint"></a>

<details>
<summary>Sprint 1</summary>

## Objetivos da Sprint

Nesta sprint, foi planejada a construção da base inicial do sistema:

<ul>
  <li>Estrutura inicial do monolito modular com frontend, backend e banco de dados</li>
  <li>Configuração do frontend em Vite, React, TypeScript, Tailwind CSS e TanStack Router</li>
  <li>Configuração do backend em FastAPI com divisão por módulos</li>
  <li>Configuração do PostgreSQL via Docker Compose</li>
  <li>Organização inicial dos módulos de autenticação, usuários, clientes, contatos, recursos, tradutores, ordens de serviço, alocações, cotações e suporte</li>
</ul>

</details>

<details>
<summary>Sprint 2</summary>

## Objetivos da Sprint

Itens a definir conforme evolução do backlog e priorização do projeto.

</details>

<details>
<summary>Sprint 3</summary>

## Objetivos da Sprint

Itens a definir conforme evolução do backlog e priorização do projeto.

</details>

---

## Manual de Execução

<a id="teste"></a>

<details>
<summary>Execute o sistema localmente seguindo os passos abaixo</summary>

### Pré-requisitos

Antes de iniciar, verifique:

- [ ] Python 3.10 ou superior instalado
- [ ] Node.js instalado
- [ ] pnpm instalado
- [ ] Docker e Docker Compose instalados
- [ ] Git instalado

### Configuração

Crie os arquivos `.env` com base nos exemplos:

```txt
.env.example
apps/web/.env.example
apps/server/.env.example
```

### Instalação

Na raiz do projeto, execute:

```bash
pnpm install
```

Esse comando instala as dependências do workspace e também executa a instalação das dependências Python do backend.

### Banco de Dados

Na raiz do projeto, execute:

```bash
docker compose up -d
```

O serviço do PostgreSQL é configurado pelo arquivo `docker-compose.yml`.

### Executar Aplicação

Para executar frontend e backend juntos:

```bash
pnpm dev
```

Para executar apenas o frontend:

```bash
pnpm dev:web
```

Frontend:

```txt
http://localhost:5173
```

Para executar apenas o backend:

```bash
pnpm dev:server
```

Backend:

```txt
http://localhost:8000
```

Health check:

```txt
http://localhost:8000/health
```

Documentação automática da API:

```txt
http://localhost:8000/docs
```

</details>

---

## Documentação

<details>
<summary>Acessar documentação do projeto</summary>

Documentos do projeto serão adicionados conforme evolução das sprints.

</details>

---

## Docentes

| P¹                        | P²                    |
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
