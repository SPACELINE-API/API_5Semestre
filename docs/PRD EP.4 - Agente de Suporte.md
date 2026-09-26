<!-- Fonte: https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/3440641 | ID 3440641 | versão 2 | exportado em 2026-09-26 -->

# PRD EP.4 - Agente de Suporte

## Contexto

O modulo de suporte cobre um agente capaz de responder duvidas sobre o sistema e
consultar dados reais conforme permissoes.

## Objetivos

- Disponibilizar um agente de suporte para colaboradores da Aliança/Alliança.
- Responder perguntas sobre o sistema.
- Consultar dados reais do usuario quando autorizado, mantendo informacoes
  atualizadas e especificas.

## Historias da Sprint 1

| Rank | Historia                                                                                                                                                            | Prioridade |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 5    | Como colaborador da Alianca, quero contar com um agente de suporte que responda perguntas, para tirar duvidas sobre o sistema.                                      | Altissima  |
| 8    | Como colaborador da Allianca, quero que o agente de suporte consulte meus dados reais ao responder, para receber informacoes atualizadas e especificas do meu caso. | Alta       |

## Requisitos funcionais

1. Receber perguntas de usuarios autenticados ou colaboradores autorizados.
2. Responder duvidas operacionais sobre o sistema.
3. Consultar dados reais quando a pergunta depender de contexto do usuario.
4. Respeitar permissoes do usuario ao buscar dados.
5. Registrar falhas de consulta ou resposta de forma rastreavel.

## Regras de negocio

- O agente nao deve expor dados alem das permissoes do usuario solicitante.
- Respostas com dados reais devem ser baseadas em informacoes atuais do sistema.
- Quando nao houver permissao, a resposta deve explicar a limitacao.

## Dados principais

| Entidade  | Campos                                                      |
| --------- | ----------------------------------------------------------- |
| Pergunta  | usuario, texto, data/hora, contexto                         |
| Resposta  | texto, fontes/contexto usado, status, erro quando aplicavel |
| Permissao | usuario, perfil, escopo de dados permitido                  |

## Experiencia esperada

O colaborador deve conseguir perguntar em linguagem natural e receber resposta
objetiva. Quando a resposta depender de dados reais, o sistema deve consultar
somente informacoes permitidas ao usuario.

## Criterios de aceite

- Dado um colaborador, quando perguntar sobre o sistema, entao recebe uma
  resposta compreensivel.
- Dado uma pergunta que exige dados reais, quando o usuario tiver permissao,
  entao o agente usa dados atualizados.
- Dado uma pergunta que exige dados sem permissao, quando o usuario nao tiver
  acesso, entao o agente nao revela a informacao.
