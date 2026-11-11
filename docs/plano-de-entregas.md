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
| 2 | 21/10–10/11/2026 | Carbono/cálculos, indicadores reais, evolução do dashboard, JWT e segurança. | [10 itens, 63 SP](sprints/sprint-2.md); 10 concluídos (63 SP). |
| 3 | 11/11–23/11/2026 | Ranking, comparação, mapa animado, avaliação com usuários, melhorias, consolidação e pacote feira. | [51 itens, 178 SP](sprints/sprint-3.md); baseline registrada em 11/11. |

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

## Situação dos critérios previstos para a Sprint 2

Conferida em 09/11/2026. A situação descreve a entrega; a avaliação dos critérios cabe aos professores. A participação de cada integrante está no [registro da Sprint 2](sprints/sprint-2.md#participação-verificada-na-develop-sprint-2--critério-ga09).

| Código | Requisito relacionado | Entrega concreta | Como verificar | Responsáveis | Evidência no GitHub | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| GA01 | Gestão ágil | Backlog com PBIs, critérios e prioridades nas issues. | Conferir as issues e os épicos E01–E06. | PO | Issues #1–#37 | Mantido |
| GA02 | Gestão ágil | Itens da sprint, responsáveis e SP registrados. | Conferir a tabela de itens do registro da sprint. | PO, SM | [Sprint 2](sprints/sprint-2.md) | Concluído (63 SP planejados, 63 SP entregues) |
| GA03 | Gestão ágil | Critérios de aceite verificáveis em cada issue. | Abrir as issues da sprint e conferir os critérios. | PO, equipe | Issues #6–#20 | Concluído |
| GA04 | Gestão ágil | Issues vinculadas aos PRs que as entregam. | Conferir os vínculos entre issues e PRs. | Equipe | [Sprint 2](sprints/sprint-2.md) | Concluído |
| GA05 | Gestão ágil | Entregas em PRs pequenos por funcionalidade. | Conferir o histórico de PRs da sprint. | Equipe | [#51](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/51), [#68](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/68) | Concluído; concentração dos merges entre 07 e 09/11 registrada |
| GA06 | Gestão ágil | Sprint Review e retrospectiva com ações. | Conferir as seções de review e retrospectiva. | PO, SM | [Sprint 2](sprints/sprint-2.md) | Concluído: Review e retrospectiva registradas após 10/11 |
| GA07 | Gestão ágil | DoD aplicada: revisão por outro integrante, CI verde, testes e cobertura mínima. | Conferir as aprovações e os checks dos PRs. | Equipe | [DoD](definicao-de-pronto.md) | Concluído |
| GA08 | Gestão ágil | README, registro da sprint, API e execução atualizados. | Seguir as instruções do registro da sprint. | Equipe | [Sprint 2](sprints/sprint-2.md), [API](api.md) | Concluído |
| GA09 | Gestão ágil | Participação dos seis integrantes com evidências. | Conferir a tabela de participação. | Todos | [Sprint 2](sprints/sprint-2.md#participação-verificada-na-develop-sprint-2--critério-ga09) | Concluído |
| DW01 | RP01, RP02 | React/TS e NestJS/TS em uso. | `npm run build` nos dois projetos. | Equipe | `frontend/`, `backend/` | Mantido |
| DW02 | RF07 | Consulta à API de intensidade de carbono por região, com tempo limite. | Executar o monitoramento e conferir `energiaKwh` e `emissaoGCo2e` nas coletas. | MarcusVRDN, Israelisl | [#53](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/53), [#69](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/69) | Concluído |
| DW03 | RP02, RP04 | Módulos auth, configuração e indicadores com controller, service, repository e DTOs. | Conferir os módulos e o Swagger em `/docs`. | Israelisl, PedrinhoDBR | [#56](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/56), [#58](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/58), [#62](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/62) | Concluído; repository de serviços pendente para a Sprint 3 |
| DW04 | RP03, RF10 | Coletas com energia, emissão e região persistidas pelo Prisma. | Aplicar as migrações e consultar `GET /coletas`. | MarcusVRDN, Israelisl | [#57](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/57) | Concluído |
| DW05 | RF09, RF12 | Dashboard consumindo a API real: cards, indicadores, intervalo e localização. | Abrir `http://localhost:5173` com o Compose. | Israelisl, PedrinhoDBR, NadlaFernandes | [#62](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/62), [#67](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/67), [#68](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/68), [#75](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/75) | Concluído |
| DW06 | RF16, RP07 | Login JWT, senha com bcrypt e rotas de escrita protegidas. | `POST /auth/login`; rotas protegidas sem token retornam 401. | Israelisl, MarcusVRDN | [#56](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/56), [#60](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/60), [#61](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/61), [#76](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/76) | Concluído |
| DW07 | RP05, RNF08 | Compose, `.env.example`, Swagger e documentação da API. | `docker compose up --build`; abrir `/docs`. | PedrinhoDBR, Israelisl | [#62](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/62) | Concluído |
| TP01 | RP04 | Regras de classificação e cálculo isoladas em services e funções próprias. | Conferir `common/regras` e `modules/calculos`. | Israelisl, MarcusVRDN | [#57](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/57), [#66](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/66) | Concluído |
| TP02 | RP04 | Injeção de dependências e doubles nos testes de banco e APIs externas. | Conferir os specs com `useValue` e `jest.spyOn(fetch)`. | Equipe | [#56](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/56), [#58](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/58), [#66](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/66) | Concluído |
| TP03 | Qualidade | Tipos e DTOs coerentes; lint no CI. | `npm run lint` nos dois projetos. | Equipe | [#71](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/71), [#74](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/74) | Concluído: lint sem problemas e verificado no CI |
| TP04 | RNF07 | Testes unitários de cálculo e estados com cobertura mínima de 80% exigida no CI. | `npm run test:cov` no backend. | Israelisl | [#66](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/66) | Concluído |
| TP05 | RNF05, RNF06 | DTOs validados, 404/5xx distintos, falha de carbono registrada como `FALHA`. | Testes de DTO, de classificação e da API de carbono. | Israelisl, MarcusVRDN | [#57](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/57), [#61](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/61), [#69](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/69) | Concluído |
| IHC01 | RNF01 | Personas e tarefas mantidas. | Conferir `docs/interface.md`. | thalestcd | [Interface](interface.md) | Mantido |
| IHC02 | Protótipos | Protótipo do dashboard e da exploração geográfica no Figma. | Abrir o link do Figma em `docs/interface.md`. | thalestcd | [#63](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/63) | Concluído |
| IHC03 | RNF02, RNF03 | Unidades, período, última atualização e estados com texto e ícone. | Conferir os cards e o cabeçalho do dashboard. | Israelisl, NadlaFernandes | [#67](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/67), [#68](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/68) | Concluído |
| IHC04 | RNF01 | Layout responsivo e feedback de carregamento, ausência de dados e erro. | Testes E2E em desktop e celular. | Israelisl, NadlaFernandes, thalestcd | [#68](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/68), [#77](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/77) | Concluído |

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
