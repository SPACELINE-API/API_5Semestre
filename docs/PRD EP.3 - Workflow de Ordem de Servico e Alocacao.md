<!-- Fonte: https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/3407873 | ID 3407873 | versão 2 | exportado em 2026-09-26 -->

# PRD EP.3 - Workflow de Ordem de Servico e Alocacao

## Contexto

Este modulo conecta a operacao depois do orcamento aprovado: acesso restrito por
etapa, ordem de servico com dados herdados e base para alocacao de recursos. Na
Sprint 1, o objetivo e estruturar a visualizacao inicial da ordem de servico e
preparar os controles de acesso por fase.

## Objetivos

- Restringir o acesso de tradutores aos arquivos da fase especifica.
- Permitir que gestores visualizem a ordem de servico com dados herdados do
  orcamento.
- Apoiar o processo de alocacao de recursos.

## Historias da Sprint 1

| Rank | Historia                                                                                                                                           | Prioridade |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2    | Como administrador, quero restringir o acesso dos tradutores aos arquivos de sua fase especifica, garantindo o foco exclusivo em suas atribuicoes. | Altissima  |
| 12   | Como gestor de projetos, quero visualizar a ordem de servico com as informacoes herdadas do orcamento para planejar a execucao do trabalho.        | Alta       |
| 15   | Como atendente, quero que a aprovacao do orcamento gere automaticamente uma ordem de servico, carregando os dados ja preenchidos.                  | Alta       |

## Requisitos funcionais

1. Criar ordem de servico a partir de orcamento aprovado.
2. Herdar dados essenciais do orcamento: cliente, itens, documentos, idiomas e
   escopo.
3. Exibir a ordem de servico para planejamento do gestor de projetos.
4. Controlar arquivos/documentos por fase ou etapa.
5. Permitir que apenas usuarios autorizados acessem arquivos da etapa
   correspondente.

## Regras de negocio

- Uma ordem de servico deve nascer de um orcamento aprovado.
- Dados herdados devem reduzir retrabalho, mas preservar rastreabilidade do
  orcamento original.
- Tradutores devem acessar somente os arquivos e informacoes necessarios para
  sua etapa.

## Dados principais

| Entidade         | Campos                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Ordem de servico | id, quote\_id, cliente, status, escopo, datas, responsavel          |
| Etapa            | id, ordem\_id, tipo, status, recurso\_alocado, restricoes           |
| Documento        | id, ordem\_id, etapa\_id, nome, tipo, permissao, arquivo/referencia |

## Experiencia esperada

O gestor deve visualizar rapidamente o que foi vendido, quais documentos existem
e qual e o planejamento inicial.

## Criterios de aceite

- Dado um orcamento aprovado, quando a conversao ocorrer, entao uma ordem de
  servico e criada com os dados ja preenchidos.
- Dado um gestor, quando abrir a ordem de servico, entao ve informacoes herdadas
  do orcamento.
- Dado um tradutor alocado em uma fase, quando acessar documentos, entao enxerga
  apenas os arquivos autorizados para sua fase.
