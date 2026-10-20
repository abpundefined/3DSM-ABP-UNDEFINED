# Sprint 1 — Fundação, descoberta, coleta e interface base

**Término previsto:** 20/10/2026. **Início real:** aguardando confirmação do PO/SM. **Tag planejada:** `sprint-1`, ainda não publicada na conferência de 19/10. **Registro:** Rainan (PO) e Thales (SM).

## Objetivo e escopo

Entregar infraestrutura Docker/React/NestJS/PostgreSQL, descoberta e coleta periódica das métricas brutas, histórico persistido e interface base/protótipos verificáveis. Energia, CO₂e e autenticação pertencem ao plano posterior.

A baseline identificada nos documentos e issues é **13 itens e 60 SP**. A reconciliação de 19/10 corrige a documentação e os vínculos sem alterar esses pontos. A capacidade de trabalho considerada no planejamento ainda precisa de registro: disponibilidade dos integrantes, restrições e justificativa de seleção. Não há comprovação que permita preencher horas/capacidade retroativamente.

| Issue | Item | SP | Responsável atual no GitHub | Situação técnica recomendada em 19/10 |
| --- | --- | ---: | --- | --- |
| [#1](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/1) | [PBI-01] Descoberta automática de serviços | 5 | PedrinhoDBR | In progress |
| [#2](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/2) | [PBI-02] Monitoramento dinâmico de serviços | 8 | PedrinhoDBR | In review |
| [#3](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/3) | [PBI-03] Coleta periódica de métricas | 5 | PedrinhoDBR | In progress |
| [#4](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/4) | [PBI-04] Detecção de serviço indisponível | 3 | NadlaFernandes | In review |
| [#5](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/5) | [PBI-05] Detecção de ausência de métricas | 3 | Israelisl | In progress |
| [#9](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/9) | [PBI-09] Histórico de coletas | 5 | Israelisl | In review |
| [#18](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/18) | [PBI-18] Tolerância a falhas | 5 | Israelisl | In progress |
| [#22](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/22) | [PBI-22] Setup Docker Compose | 5 | PedrinhoDBR, MarcusVRDN | In review |
| [#23](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/23) | [PBI-23] Protótipos e avaliação de usabilidade (IHC) | 8 | thalestcd | In progress |
| [#24](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/24) | Setup da estrutura base do backend NestJS com TypeScript | 3 | MarcusVRDN | In review |
| [#25](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/25) | Setup da estrutura base do frontend React com TypeScript e Vite | 3 | RainanKaneka | In review |
| [#26](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/26) | Configuração de variáveis de ambiente e segurança (.env.example) | 2 | PedrinhoDBR | In review |
| [#27](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/27) | Modelagem relacional e migrações PostgreSQL via ORM | 5 | MarcusVRDN | In review |

A recomendação resulta em **8 In review, 5 In progress e nenhum Done com aceite comprovado**. O quadro observado ainda tem 12 In review e #4 In progress; a credencial disponível não permitiu mudar as colunas. A [revisão por item](revisao-sprint-1.md) explica pendências e a sincronização necessária.

## Evidências e verificação

- [Execução Docker/nativa](../execucao.md).
- [API implementada](../api.md).
- [Resultados e limitações dos checks de 19/10](revisao-sprint-1.md).
- [Teste de retorno com PostgreSQL, registro de 18/10](../teste-integracao-problema1.md).
- [Base e regras do burndown](../burndown-sprint-1.md).
- [DoD e registro de aceite](../definicao-de-pronto.md).

Uma tag só deve ser criada após finalizar a versão revisada. O roteiro antigo `git checkout sprint-1` não deve ser usado antes de a tag existir. A inspeção da versão atual pode usar o commit `0adb1e040c078f9c69cedbcc7038cdb7e0bd4175`; isso não o transforma em entrega aceita.

## Participação verificada na develop

| Integrante | Evidência concreta do histórico | Limite/atualização necessária |
| --- | --- | --- |
| Rainan Reis | [32e9a68](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/32e9a68) base React; [7879935](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/7879935) interface e demonstração; [c76255e](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/c76255e) planejamento. | Registrar aceite e links das entregas de frontend/PO. Alguns commits usam alias `unknown`; associar a autoria sem reescrever o histórico compartilhado. |
| Thales Cambraia | [2b1eba7](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/2b1eba7) registro heurístico; [91e034d](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/91e034d) referência Figma. | Consolidar resultados, registro ágil e atualização do quadro. |
| Pedro Gomes | [7b08532](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/7b08532) descoberta/coleta; [36b35c2](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/36b35c2) intervalo; [40bc99b](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/40bc99b) integração. | Relacionar correções e homologação às issues #1/#2/#3/#26. |
| Israel Lemes | [e389efd](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/e389efd) módulo de coletas; [59a755b](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/59a755b) falhas; [8e52522](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/8e52522) SEM_METRICAS. | Corrigir/validar regra de ausência e resiliência; registrar revisão das entregas. |
| Marcus Nascimento | [6494ccd](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/6494ccd) esquema/migração; [fac0876](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/fac0876) Docker backend; [9e963a6](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/9e963a6) Docker frontend; [2aa7dc5](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/2aa7dc5) retorno. | Vincular homologação e revisões às issues de infraestrutura/banco. |
| Nadla Ferreira | [8ed5ecb](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/commit/8ed5ecb) detecção de indisponibilidade, integrado no PR #40. | Registrar revisão/homologação e demais evidências de interface efetivamente realizadas. |

Esses links demonstram contribuições; não substituem análise de relevância pelos professores nem comprovam todas as atribuições antigas das tabelas. Responsável atual da issue e autor de uma contribuição podem ser diferentes.

## Sprint Review — registro a concluir com fatos

**Situação:** não há ata/resultados da cerimônia na versão analisada. A revisão técnica de 19/10 não deve ser registrada como se fosse a Sprint Review com docentes.

| Campo | Registro necessário |
| --- | --- |
| Data, participantes e versão demonstrada | Informar após a cerimônia, com tag/commit. |
| Entregas demonstradas | Relacionar issues e evidências de execução. |
| Feedback recebido | Registrar o retorno real de docentes/cliente/PO. |
| Aceites e pendências | Informar decisão por issue, responsável e previsão acordada. |

## Retrospectiva e adaptação

O registro inicial anterior apontava curva de aprendizado em Docker/ORM, necessidade de revisões em pares e distribuição dos commits. Preserva-se esse histórico como observação inicial, sem atribuir uma data/cerimônia que não foi documentada.

Na retrospectiva, confirmar os achados com o time, registrar participantes/data e escolher ações com responsáveis/prazo. Propostas derivadas da revisão técnica: revisar PR antes do aceite; compartilhar contratos de coleta; manter testes de regressão; atualizar evidências e burndown diariamente. Essas propostas ainda não são decisões tomadas pela equipe.

## Fechamento

- Corrigir os itens In progress e registrar a homologação dos itens em revisão.
- Completar os dados reais de período/capacidade, IHC, review e retrospectiva.
- Aplicar a situação correta no Projects e registrar aceites no ledger do burndown.
- Integrar documentação/código revisados e criar a tag `sprint-1` apontando para a versão efetivamente aceita.
- Informar o link da tag ao professor e registrar pendências com a nova previsão, sem marcar como entregues.
