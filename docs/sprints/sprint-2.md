# Sprint 2 — Cálculos ambientais, dashboard e autenticação

**Período:** 21/10/2026 a 10/11/2026. **Tag planejada:** `sprint-2`. **Registro:** Rainan Reis (Product Owner) e Thales Cambraia (Scrum Master).

---

## 🎯 Objetivo e Capacidade

### Objetivo da Sprint
Evoluir a plataforma GreenER a partir da fundação arquitetural e coleta base entregues na Sprint 1, implementando:
1. **Motor de Cálculo Ambiental:** conversão de telemetria computacional em estimativas de consumo energético (kWh) e emissões de CO₂e integrado à API de Intensidade de Carbono, persistindo os valores junto ao histórico de coletas;
2. **Indicadores Consolidados e Agregados:** cálculo de totais de consumo, emissões e distribuição de serviços por estado operacional em toda a infraestrutura;
3. **Dashboard Operacional em Tempo Real:** interface dinâmica com cards individuais por serviço exibindo localização geográfica (país, região e cidade), métricas brutas e impacto ambiental, atualizados periodicamente sem necessidade de reload de página (polling);
4. **Exibição Explícita de Intervalos e Timestamps:** indicadores claros do intervalo de amostragem configurado e do horário exato da última coleta realizada;
5. **Autenticação JWT e Segurança:** controle de acesso com senhas protegidas por hash (bcrypt), autenticação via tokens JWT e proteção estrita de endpoints administrativos/escrita;
6. **Qualidade e Cobertura de Código:** suíte de testes unitários abrangente com cobertura mínima de 80% nos serviços de cálculo ambiental e regras de estado, validada continuamente via pipeline de CI (GitHub Actions).

### Capacidade Considerada
A equipe se propôs a entregar **10 itens totalizando 63 Story Points (SP)**. O dimensionamento da capacidade considerou:
- **Equipe Ativa:** 6 integrantes engajados com distribuição balanceada de competências em backend (NestJS/PostgreSQL), frontend (React/Vite/TypeScript) e gestão ágil (PO e Scrum Master);
- **Infraestrutura Estabilizada:** reaproveitamento do ambiente de desenvolvimento conteinerizado (Docker Compose) e da base de banco de dados modelada na Sprint 1, acelerando o foco na lógica de negócio e integrações;
- **Integração Ponta a Ponta:** planejamento paralelo com desenvolvimento backend (APIs de cálculo, rotas e JWT) e frontend (telas de login e dashboard em tempo real) avançando em sincronia;
- **Resultado do Ciclo:** ao final do desenvolvimento, **9 itens foram concluídos e fechados no GitHub (58 SP)**, atingindo **92% de aproveitamento** dos pontos planejados. Apenas a issue [#16](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/16) (PBI-16, 5 SP) permaneceu em andamento para refinamentos visuais de acessibilidade e responsividade na Sprint 3.

---

## 📋 Itens Selecionados (Sprint Backlog)

Os 10 itens abaixo compuseram a baseline acordada no planejamento da Sprint 2:

| Issue | Item | SP | Responsáveis no GitHub | Situação no Projects |
| :---: | :--- | :---: | :--- | :---: |
| [#6](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/6) | [PBI-06] Cálculo individual de consumo e emissão | 8 | Marcus Nascimento | Concluído (Done) |
| [#7](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/7) | [PBI-07] Indicadores agregados | 5 | Pedro Gomes | Concluído (Done) |
| [#8](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/8) | [PBI-08] Dashboard operacional | 13 | Thales Cambraia, Israel Lemes | Concluído (Done) |
| [#10](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/10) | [PBI-10] Atualização automática do dashboard | 5 | Marcus Nascimento | Concluído (Done) |
| [#11](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/11) | [PBI-11] Localização dos serviços | 3 | Thales Cambraia, Israel Lemes | Concluído (Done) |
| [#15](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/15) | [PBI-15] Autenticação JWT | 8 | Israel Lemes, Marcus Nascimento | Concluído (Done) |
| [#16](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/16) | [PBI-16] Interface responsiva e acessível | 5 | Thales Cambraia | Em andamento (In progress) |
| [#17](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/17) | [PBI-17] Exibição de intervalos e timestamps | 3 | Nadla Ferreira | Concluído (Done) |
| [#19](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/19) | [PBI-19] Segurança | 5 | Israel Lemes | Concluído (Done) |
| [#20](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/20) | [PBI-20] Testes unitários (cobertura ≥ 80%) | 8 | Israel Lemes | Concluído (Done) |

- **Total Planejado:** 63 SP (10 itens)
- **Total Concluído:** 58 SP (9 itens fechados — 92% de taxa de entrega)
- **Restante em Andamento:** 5 SP (1 item — [#16](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/16), em andamento para evolução contínua na Sprint 3)

---

## 📉 Burndown da Sprint 2

![Burndown da Sprint 2](../GreenER_Burndown_Sprint2.png)

### Registro e Análise da Evolução
- **21/10/2026 (Abertura):** Baseline fixada em 63 Story Points com 10 itens planejados.
- **21/10 a 07/11/2026:** Período de estruturação matemática das fórmulas de carbono, integração com APIs externas, desenvolvimento do fluxo de autenticação e construção do layout de cards do frontend. Durante esta fase os itens permaneceram em desenvolvimento/revisão, mantendo o saldo em 63 SP.
- **08/11/2026:** Homologação técnica e fechamento de 13 SP no repositório:
  - [#6](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/6) — Cálculo individual de consumo e emissão (8 SP)
  - [#19](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/19) — Práticas de segurança, bcrypt e segredos no .env (5 SP)
  - *Saldo restante:* **50 SP**.
- **09/11/2026:** Validação e fechamento dos PRs consolidados na branch `develop`, baixando 45 SP:
  - [#7](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/7) — Indicadores agregados (5 SP)
  - [#8](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/8) — Dashboard operacional (13 SP)
  - [#10](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/10) — Atualização automática do dashboard (5 SP)
  - [#11](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/11) — Localização geográfica dos serviços (3 SP)
  - [#15](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/15) — Autenticação JWT e proteção de rotas restritas (8 SP)
  - [#17](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/17) — Exibição de intervalos e timestamps (3 SP)
  - [#20](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/20) — Testes unitários com cobertura superior a 80% (8 SP)
  - *Saldo restante:* **5 SP** (referente à issue [#16](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/16)).
- **10/11/2026 (Encerramento do Ciclo):** Sprint 2 finalizada com 58 SP entregues e validados.

---

## 🔍 Evidências e Verificação

- **Memória de Cálculo Ambiental:** especificação formal das constantes, unidades e fórmulas em [docs/calculos.md](../calculos.md).
- **Documentação de API e Swagger:** especificação dos endpoints e DTOs em [docs/api.md](../api.md) e documentação interativa OpenAPI/Swagger acessível em `/api/docs`.
- **Interface e Protótipos IHC:** detalhamento de personas, fluxo de navegação e componentes no Figma em [docs/interface.md](../interface.md).
- **Automação de CI / CD:** pipeline no GitHub Actions configurada em [.github/workflows/ci.yml](../../.github/workflows/ci.yml) validando build e testes de backend e frontend a cada pull request.
- **Cobertura de Testes Automatizados:** suíte de testes com cobertura superior a 80% nos services de cálculo e regras de estado (`npm run test:cov` no backend) e testes de integração/E2E no frontend (`npm run test:e2e`).
- **Resiliência e Timeout:** proteção contra indisponibilidade de serviços de telemetria e da API de carbono via `com-timeout.ts`.

---

## 👥 Participação Verificada na Develop (Sprint 2 — Critério GA09)

Todas as contribuições foram comprovadas através de commits e pull requests integrados na branch `develop`:

| Integrante | Papel Principal | Contribuições Verificáveis no Repositório |
| :--- | :--- | :--- |
| **Rainan Reis** | Product Owner / Fullstack | Reconciliação do Product Backlog e Sprint Backlog, acompanhamento das histórias MoSCoW, conferência de critérios de aceitação, sincronização de status das issues no Projects (PR [#52](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/52)), registro de capacidade, documentação da Sprint 2 e geração do burndown da sprint. |
| **Thales Cambraia** | Scrum Master / Frontend | Facilitação ágil, estruturação do quadro Kanban, elaboração da documentação de IHC e protótipos de alta fidelidade (PR [#63](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/63), commits `bcd28f9`, `115020d`, `5edc4d7`), implementação dos cards de serviços com localização e dados de impacto (PR [#68](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/68)). |
| **Marcus Nascimento** | Desenvolvedor Backend / DevOps | Implementação da integração com API de Carbono, resiliência e timeouts de APIs externas (PR [#69](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/69)), atualização automática (polling) do dashboard (PBI-10), automação de CI via GitHub Actions (PR [#55](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/55)), padronização de build e qualidade (PRs [#54](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/54), [#57](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/57), [#60](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/60), [#64](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/64), [#71](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/71)). |
| **Israel Lemes** | Desenvolvedor Backend | Motor de cálculo de consumo de energia e emissão de CO₂e, módulo de autenticação JWT e seed administrativo, proteção de rotas restritas de configuração e escrita, testes unitários com cobertura ≥ 80% (PRs [#56](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/56), [#61](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/61), [#66](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/66), commits `347ff63`, `e389efd`, `35dcac1`). |
| **Pedro Gomes** | Desenvolvedor Backend | Implementação de indicadores agregados da infraestrutura (totais de consumo, emissão e distribuição de estados operacionais), anotações e configuração da API Swagger (PRs [#58](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/58), [#62](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/62), commits `76cbe75`, `175858f`, `527b1d7`). |
| **Nadla Ferreira** | Desenvolvedora Frontend | Exibição de intervalos e timestamps de coleta no dashboard operacional (PR [#67](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/pull/67)), documentação e captura de evidências de telas e tratamentos de indisponibilidade (commits `d9ed96a`, `5f81425`). |

---

## 📊 Sprint Review

*(Seção a ser consolidada com fatos e retornos reais após a apresentação de 10/11/2026 às 19h30)*

- **Data da Apresentação:** 10/11/2026 às 19h30
- **Participantes:** Equipe GreenER (Rainan Reis, Thales Cambraia, Marcus Nascimento, Israel Lemes, Pedro Gomes, Nadla Ferreira) e Corpo Docente / Avaliadores.
- **Versão Demonstrada:** Commit de consolidação da Sprint 2 na branch `develop` (Tag oficial de entrega: `sprint-2`).
- **Funcionalidades Demonstradas:**
  - Descoberta e coleta periódica com tratamento de timeout e resiliência;
  - Cálculo de consumo energético (kWh) e emissão de CO₂e (gCO₂e e kgCO₂e) em tempo real via API de Carbono;
  - Painel com indicadores consolidados agregados de toda a infraestrutura;
  - Dashboard operacional com cards dinâmicos contendo status, métricas, consumo e localização geográfica detalhada (país, região e cidade);
  - Atualização contínua (polling) sem recarregamento da página;
  - Exibição visível do intervalo de coleta e horário da última medição;
  - Fluxo de login com autenticação JWT e proteção de rotas restritas;
  - Execução da suíte de testes unitários com cobertura acima de 80% nos serviços de cálculo.
- **Feedback dos Docentes e Cliente:** *(A registrar após a cerimônia)*.
- **Impacto no Planejamento da Sprint 3:** A issue [#16](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/16) (acessibilidade e responsividade) será concluída no início da Sprint 3, complementando as novas entregas de mapa interativo (PBI-12), ranking ambiental (PBI-13) e comparação entre serviços (PBI-14).

---

## 🔄 Retrospectiva e Ações de Melhoria

*(A ser homologada em conjunto pelo Scrum Master Thales e PO Rainan ao final do ciclo)*

### Pontos Positivos
- Excelente colaboração entre os desenvolvedores de backend e frontend na amarração dos contratos de API;
- Implantação e execução estável da pipeline de CI (GitHub Actions), evitando regressões;
- Grande volume de valor de negócio entregue (58 SP concluídos de 63 SP planejados — 92% de sucesso);
- Cobertura de testes unitários atingiu o limiar de 80% exigido pela rubrica.

### Dificuldades e Pontos de Atenção Observados
- **Concentração de merges:** Grande parte dos pull requests foi integrada entre 07/11 e 09/11, gerando gargalo na esteira de homologação;
- **Commits diretos na develop:** Ocorrência de commits diretos na branch `develop` antes do fechamento das proteções de branch e esteira de CI;
- **Dependência de APIs externas:** Lentidão e falhas esporádicas da API de Carbono exigiram implementação emergencial de mecanismo de timeout e fallback.

### Ações de Melhoria para a Sprint 3
| Ação de Melhoria | Responsável | Prazo / Aplicação |
| :--- | :--- | :--- |
| **1. Fluxo contínuo de PRs:** Submeter e revisar pull requests ao longo de toda a sprint, proibindo acúmulo de merges nas 48h finais. | Thales Cambraia (SM) e toda a equipe | Sprint 3 (contínuo) |
| **2. Blindagem da branch develop:** Exigir aprovação obrigatória de CI e code review antes de qualquer merge, eliminando commits diretos. | Marcus Nascimento e Thales Cambraia | Início da Sprint 3 |
| **3. Finalização prioritária do PBI-16:** Priorizar os testes de responsividade e contraste antes de avançar nos novos componentes visuais da Sprint 3. | Thales Cambraia e Nadla Ferreira | Primeiros 3 dias da Sprint 3 |
