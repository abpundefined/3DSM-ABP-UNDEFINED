# Plano de entregas e rastreabilidade — GreenER

Projeto ABP 3º DSM, FATEC Jacareí, equipe Undefined. PO: Rainan Reis. SM: Thales Cambraia.

## Regras da rubrica

A rubrica original totaliza **100 pontos em 27 critérios**: GA01–GA09, DW01–DW07, TP01–TP05 e IHC01–IHC06. A versão anterior deste plano dizia “28”; a contagem foi corrigida sem adicionar/remover critérios ou alterar suas pontuações.

GA01–GA09 e DW01 são obrigatórios em todas as sprints. Os demais seguem a distribuição abaixo. A avaliação é cumulativa: funcionalidades aceitas precisam continuar funcionando. A nota é atribuída pelos professores com base nas evidências da versão entregue, identificada pela tag.

**A matriz é de previsão, não um checklist de critérios atendidos.** As marcações de conclusão anteriores foram substituídas por situação observada e pendências. A validação docente da distribuição ainda precisa estar vinculada ao registro; sua ocorrência não foi presumida.

| Critério | Pontos | Descrição | Sprint 1 | Sprint 2 | Sprint 3 |
| --- | ---: | --- | --- | --- | --- |
| GA01 | 5 | Product Backlog priorizado | Todas | Manter | Manter |
| GA02 | 5 | Planejamento e capacidade | Todas | Manter | Manter |
| GA03 | 5 | Histórias e critérios de aceite | Todas | Manter | Manter |
| GA04 | 4 | Acompanhamento e rastreabilidade | Todas | Manter | Manter |
| GA05 | 3 | Execução incremental | Todas | Manter | Manter |
| GA06 | 4 | Review, retrospectiva e adaptação | Todas | Manter | Manter |
| GA07 | 3 | DoD e aplicação | Todas | Manter | Manter |
| GA08 | 3 | Documentação e reprodutibilidade | Todas | Manter | Manter |
| GA09 | 8 | Colaboração e participação | Todas | Manter | Manter |
| DW01 | 3 | React/TS e NestJS/TS efetivos | Base | Manter | Manter |
| DW02 | 5 | Integrações auxiliares | Métricas | Carbono | Consolidar |
| DW03 | 4 | Backend REST em camadas | Base | Evoluir | Manter |
| DW04 | 4 | PostgreSQL, ORM e migrações | Base | Evoluir | Manter |
| DW05 | 3 | Organização e integração frontend | Base | Dashboard | Análises |
| DW06 | 3 | Autenticação/configuração protegida | Não previsto | Implementar | Manter |
| DW07 | 3 | Containers e documentação da API | Base | Evoluir | Consolidar |
| TP01 | 4 | Responsabilidades e SOLID | Base | Evoluir | Manter |
| TP02 | 4 | Injeção de dependências e desacoplamento | Base | Evoluir | Manter |
| TP03 | 4 | Tipagem e legibilidade | Base | Manter | Manter |
| TP04 | 4 | Testes unitários significativos | Não previsto | Cálculos | Consolidar |
| TP05 | 4 | Validação e tratamento de exceções | Base | Evoluir | Manter |
| IHC01 | 3 | Usuários e tarefas | Personas | Manter | Manter |
| IHC02 | 3 | Fluxos e protótipos | Base | Evoluir | Consolidar |
| IHC03 | 3 | Clareza de indicadores e estados | Não previsto | Implementar | Manter |
| IHC04 | 2 | Responsividade e feedback | Base | Evoluir | Manter |
| IHC05 | 2 | Avaliação com usuários representativos | Não previsto | Não previsto | Executar |
| IHC06 | 2 | Melhorias decorrentes da avaliação | Não previsto | Não previsto | Executar |

## Objetivos e backlog

| Sprint | Período documentado | Entrega prevista | Backlog e evidências |
| --- | --- | --- | --- |
| 1 | Início real a confirmar; fim 20/10/2026 | Infraestrutura, descoberta/coleta bruta, histórico, interface/protótipos base. | [13 itens, 60 SP](sprints/sprint-1.md); [revisão técnica](sprints/revisao-sprint-1.md). |
| 2 | 21/10–10/11/2026, previsão | Carbono/cálculos, indicadores reais, evolução do dashboard, JWT e segurança. | [Plano da Sprint 2](sprints/sprint-2.md), a refinar antes do ciclo. |
| 3 | 11/11–23/11/2026, previsão | Ranking, comparação, mapa, avaliação com usuários, melhorias e consolidação. | [Plano da Sprint 3](sprints/sprint-3.md), a refinar antes do ciclo. |

As datas futuras são as previsões já documentadas, não confirmação de cerimônias realizadas. O início real, a capacidade, os resultados de review e a aprovação docente devem ser registrados com fonte real. Não há mudança retroativa de escopo/estimativas nesta reconciliação.

## Situação observada dos critérios previstos para a Sprint 1

| Critério | Evidência/pendência em 19/10/2026 |
| --- | --- |
| GA01 | PBIs e prioridades registrados; preservar rastreabilidade. |
| GA02 | Início real/capacidade e justificativa de mudanças precisam ser confirmados. |
| GA03 | Critérios presentes nas issues; registrar os verificados. |
| GA04 | Sincronizar estados, vínculos, impedimentos e evidências. |
| GA05 | Histórico distribuído existente; relacionar às tarefas. |
| GA06 | Cerimônia, feedback e ações finais ainda precisam de registro. |
| GA07 | DoD versionada; aplicação exige revisão/homologação/aceite. |
| GA08 | Documentação reconciliada nesta revisão, pendente de integração e homologação. |
| GA09 | Contribuições dos seis integrantes vinculadas no registro da sprint. |
| DW01 | Builds e código demonstram uso; preservar funcionamento. |
| DW02 | Métricas integradas parcialmente; corrigir localização, classificação e intervalo. |
| DW03 | Módulos existentes; persistência ainda diretamente em alguns services. |
| DW04 | Prisma/migração e evidência real de 18/10; homologar o conjunto. |
| DW05 | Integração existe; melhorar falhas parciais e organização da lógica. |
| DW07 | Três serviços configurados; homologação oficial ainda pendente. |
| TP01 | Unificar regra de coleta e separar responsabilidades existentes. |
| TP02 | Injeção e substituição por doubles verificadas; evoluir integrações. |
| TP03 | Build estrito passa; há any, lint e formatação pendentes. |
| TP05 | Validação local existe; corrigir limites e classificação das falhas. |
| IHC01 | Personas e objetivos documentados. |
| IHC02 | Link atual indicado; versão avaliada/aprovação a confirmar. |
| IHC04 | Checks de interface registrados; carga parcial ainda é uma pendência. |

Os links de implementação atuais são `backend/src/modules/servicos`, `backend/src/modules/monitoramento`, `backend/src/modules/coletas`, `backend/src/database`, `backend/prisma`, `frontend/src`, os dois Dockerfiles e `compose.yaml`. Diretórios de integrações/cálculos/auth descritos no desenho futuro não devem ser apresentados como implementados.

## Participação e aceite

A [tabela de participação da Sprint 1](sprints/sprint-1.md#participação-verificada-na-develop) vincula contribuições reais dos seis integrantes. A alocação atual está nas issues; atribuições propostas nas tabelas antigas não serão tratadas como prova de contribuição.

Antes de cada sprint, registrar disponibilidade/capacidade e responsáveis; durante o ciclo, relacionar mudanças e impedimentos. No fechamento, revisar [DoD](definicao-de-pronto.md), registrar review/retrospectiva, pendências e tag. Critério sem evidência suficiente não deve ser marcado como atendido pelo próprio documento.

## Registro desta reconciliação — 19/10/2026

- IDs/títulos/pontos dos backlogs posteriores conferidos com as issues; não houve nova estimativa.
- Baseline da Sprint 1 preservada em 13 itens/60 SP; épicos não somam pontos.
- Situação técnica separada de aceite/coluna efetivamente aplicada no Projects.
- Instruções de execução, API e arquitetura ajustadas ao código `0adb1e040c078f9c69cedbcc7038cdb7e0bd4175`.
- [Base do burndown](burndown-sprint-1.md) preparada, sem inventar datas de início ou aceites.
- Resultados de IHC, aprovação docente e cerimônias ausentes continuam explicitamente pendentes.
