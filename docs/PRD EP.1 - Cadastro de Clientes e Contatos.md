<!-- Fonte: https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/3309589 | ID 3309589 | versão 2 | exportado em 2026-09-26 -->

# PRD EP.1 - Cadastro de Clientes e Contatos

## Contexto

O modulo cobre o cadastro e a pesquisa de empresas clientes e seus contatos. Na
Sprint 1, o foco e criar a base operacional para atendimento: registrar
empresas, registrar contatos vinculados e permitir busca rapida por filtros.

## Objetivos

- Permitir que atendentes cadastrem empresas clientes com nome e status
  ativo/inativo.
- Permitir que contatos sejam cadastrados dentro de uma empresa cliente.
- Permitir pesquisa de clientes por nome, status e produto.

## Historias da Sprint 1

| Rank | Historia                                                                                                                                | Prioridade |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 6    | Como atendente, quero cadastrar uma empresa cliente com nome e status ativo ou inativo para iniciar o relacionamento comercial.         | Alta       |
| 7    | Como atendente, quero cadastrar contatos dentro de uma empresa cliente, com e-mail, telefone e departamento, para saber com quem falar. | Alta       |
| 9    | Como atendente, quero pesquisar clientes com filtros de nome, status e produto para localizar rapidamente um cliente na base.           | Alta       |

## Requisitos funcionais

1. Criar empresa cliente com campos minimos: nome, status e produto quando
   aplicavel.
2. Validar que o nome da empresa seja obrigatorio.
3. Permitir status ativo/inativo para controlar o uso nas operacoes.
4. Criar contato vinculado a uma empresa existente.
5. Registrar e-mail, telefone e departamento do contato.
6. Listar/pesquisar clientes por nome, status e produto.
7. Exibir mensagens claras de sucesso, aviso e erro conforme backlog.

## Regras de negocio

- O cliente deve possuir identificador unico.
- Clientes inativos devem permanecer cadastrados e ser identificados nos fluxos
  operacionais.
- Contatos sempre pertencem a uma empresa cliente.
- Pesquisas devem aceitar filtros combinados sem exigir todos os campos.

## Dados principais

| Entidade | Campos                                                          |
| -------- | --------------------------------------------------------------- |
| Cliente  | id, nome, status, produto, data de criacao, data de atualizacao |
| Contato  | id, cliente\_id, nome, e-mail, telefone, departamento           |

## Experiencia esperada

No frontend, este modulo deve aparecer como uma tela de gestao para atendentes,
com formulario de cadastro, lista pesquisavel e visualizacao dos contatos
associados.

## Criterios de aceite

- Dado um atendente, quando preencher os dados obrigatorios de cliente, entao o
  sistema registra o cliente com status inicial.
- Dado um cliente existente, quando cadastrar um contato, entao o contato fica
  associado somente a esse cliente.
- Dado filtros de nome/status/produto, quando pesquisar, entao a lista retorna
  apenas clientes compativeis.
- Dado erro de validacao, quando tentar salvar, entao o sistema informa o
  problema sem perder os dados digitados.
