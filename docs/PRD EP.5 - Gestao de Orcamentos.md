<!-- Fonte: https://viniciusmachado7.atlassian.net/wiki/spaces/OUTROS/pages/3375125 | ID 3375125 | versão 2 | exportado em 2026-09-26 -->

# PRD EP.5 - Gestao de Orcamentos

## Contexto

O modulo de orcamentos transforma requisicoes de clientes em propostas
comerciais, permite adicionar itens/documentos e converte orcamentos aprovados
em ordens de servico. Na Sprint 1, este modulo e central para conectar a entrada
de demanda ao planejamento operacional.

## Objetivos

- Permitir que clientes preencham pre-solicitacoes sem login completo.
- Permitir que atendentes visualizem requisicoes recebidas.
- Gerar orcamento pre preenchido a partir de requisicao aprovada.
- Permitir adicionar itens e documentos ao orcamento.
- Gerar ordem de servico automaticamente apos aprovacao do orcamento.

## Historias da Sprint 1

| Rank | Historia                                                                                                                                             | Prioridade |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 3    | Como atendente, quero visualizar as requisicoes recebidas dos clientes para transforma-las em orcamento.                                             | Altissima  |
| 4    | Como cliente, quero preencher uma pre-solicitacao informando idioma e necessidade, sem precisar de login completo, para agilizar o primeiro contato. | Altissima  |
| 13   | Como atendente, quero que uma requisicao aprovada gere automaticamente um orcamento pre preenchido para agilizar o atendimento.                      | Alta       |
| 14   | Como atendente, quero adicionar itens e documentos ao orcamento, informando o idioma de origem e destino, para compor o escopo do servico.           | Alta       |
| 15   | Como atendente, quero que a aprovacao do orcamento gere automaticamente uma ordem de servico, carregando os dados ja preenchidos.                    | Alta       |

## Requisitos funcionais

1. Criar pre-solicitacao com idioma e necessidade, sem exigir login completo.
2. Listar requisicoes recebidas para o atendente.
3. Aprovar uma requisicao para gerar orcamento pre preenchido.
4. Adicionar itens ao orcamento com idioma de origem, idioma de destino e
   escopo.
5. Associar documentos ao orcamento.
6. Aprovar orcamento e gerar ordem de servico com dados preenchidos.
7. Exibir mensagens claras de sucesso, ausencia de dados e erro.

## Regras de negocio

- Uma requisicao aprovada deve gerar um orcamento com dados reaproveitados.
- Um orcamento pode ter multiplos itens e documentos.
- A aprovacao do orcamento deve acionar a criacao de ordem de servico.
- Dados essenciais nao devem ser perdidos na transicao requisicao -\> orcamento
  -\> ordem de servico.

## Dados principais

| Entidade          | Campos                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| Requisicao        | id, cliente/contato, idioma, necessidade, status, data                     |
| Orcamento         | id, requisicao\_id, cliente, status, valor, itens, documentos              |
| Item do orcamento | idioma\_origem, idioma\_destino, descricao, quantidade/volume, observacoes |
| Documento         | nome, tipo, referencia/arquivo, vinculo com item ou orcamento              |

## Experiencia esperada

O atendente deve transformar uma solicitacao inicial em proposta sem redigitar
os dados ja informados.

## Criterios de aceite

- Dado um cliente sem login completo, quando preencher a pre-solicitacao, entao
  a requisicao fica disponivel para atendimento.
- Dado uma requisicao aprovada, quando gerar orcamento, entao os dados
  principais aparecem pre preenchidos.
- Dado um orcamento, quando adicionar itens e documentos, entao o escopo fica
  completo para analise.
- Dado um orcamento aprovado, quando confirmar aprovacao, entao uma ordem de
  servico e criada com os dados ja preenchidos.
