<!-- Fonte: https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/3375105 | ID 3375105 | versão 2 | exportado em 2026-09-26 -->

# PRD EP.2 - Cadastro de Recursos e Tradutores

## Contexto

O modulo organiza o banco de talentos de tradutores e recursos, incluindo
qualificacoes tecnicas, pares de idiomas, especialidades, disponibilidade e
status ativo/inativo.

## Objetivos

- Registrar tradutores com qualificacoes tecnicas e pares de idiomas.
- Permitir que recursos sejam marcados como inativos.
- Permitir pesquisa de recursos ativos por idioma, especialidade e
  disponibilidade.
- Fornecer dados confiaveis para alocacao de tarefas.

## Historias da Sprint 1

| Rank | Historia                                                                                                                                      | Prioridade |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1    | Como atendente, quero registrar um novo tradutor definindo suas qualificacoes tecnicas e pares de idiomas para alimentar o banco de talentos. | Altissima  |
| 10   | Como atendente, quero marcar um recurso como inativo para remove-lo temporariamente das buscas de alocacao.                                   | Alta       |
| 11   | Como atendente, quero pesquisar recursos ativos filtrando por idioma, especialidade e disponibilidade para encontrar o profissional certo.    | Alta       |

## Requisitos funcionais

1. Cadastrar tradutor/recurso com dados basicos e qualificacoes.
2. Registrar pares de idiomas de origem e destino.
3. Registrar especialidades e disponibilidade.
4. Alterar status de um recurso para ativo ou inativo.
5. Pesquisar apenas recursos ativos por idioma, especialidade e disponibilidade.
6. Exibir mensagens de confirmacao e erro conforme backlog.

## Regras de negocio

- Recursos inativos nao devem aparecer em buscas de alocacao.
- Um tradutor pode possuir multiplos pares de idiomas.
- Disponibilidade deve ser usada como criterio de busca e considerada na
  validacao de agenda das alocacoes.
- Qualificacoes tecnicas devem ser mantidas junto ao perfil do tradutor.

## Dados principais

| Entidade      | Campos                                                             |
| ------------- | ------------------------------------------------------------------ |
| Recurso       | id, nome, status, disponibilidade, tipo, data de criacao           |
| Tradutor      | recurso\_id, qualificacoes, especialidades, pares de idiomas       |
| Par de idioma | idioma\_origem, idioma\_destino, nivel/observacao quando aplicavel |

## Experiencia esperada

O atendente deve conseguir cadastrar e localizar profissionais sem depender de
planilhas externas. A interface deve priorizar filtros rapidos e deixar claro
quando um recurso esta inativo.

## Criterios de aceite

- Dado um novo tradutor, quando informar qualificacoes e pares de idiomas, entao
  o cadastro fica disponivel para consulta.
- Dado um recurso ativo, quando marca-lo como inativo, entao ele deixa de
  aparecer nas buscas operacionais.
- Dado filtros de idioma, especialidade e disponibilidade, quando pesquisar,
  entao o sistema retorna apenas recursos ativos compativeis.
