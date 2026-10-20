# Revisão técnica dos 13 itens — Sprint 1

**Referência:** 19/10/2026, código `0adb1e040c078f9c69cedbcc7038cdb7e0bd4175`. **Baseline:** 13 itens, 60 SP.

Esta é uma revisão técnica de evidências, não uma Sprint Review já realizada nem um aceite do PO. A classificação recomendada é **8 In review, 5 In progress e 0 Done com aceite comprovado**. Nenhuma issue foi considerada entregue somente por ter PR integrado.

O Projects foi observado com 12 In review e #4 In progress. A API recusou a alteração de campos com HTTP 403 (“Must have admin rights to Repository”) e não havia navegador conectado. As situações técnicas abaixo e as atualizações das issues não significam que as colunas tenham sido alteradas.

| Issue | Item | SP | Responsável no GitHub | Situação técnica recomendada |
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

## Implementação e pendências por item

### [#1](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/1) — In progress

A descoberta e a persistência existem; a leitura de location perde país, região, cidade, coordenadas e region_code do contrato oficial.

- Corrigir o contrato geográfico e persistir os dados oficiais.
- Validar a listagem com a localização correta.

### [#2](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/2) — In review

Inclusão, remoção, lista vazia válida e retorno com o mesmo ID foram implementados; testes verificam preservação de histórico.

- Homologar o ciclo completo no Compose oficial com a interface.
- Registrar revisão de outro integrante e aceite do PO.

### [#3](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/3) — In progress

Coleta automática e intervalo configurável existem. O intervalo gravado ignora collection_interval_seconds recebido; faltam timeout e controle de ciclos.

- Separar intervalo da medição do intervalo do agendador.
- Testar timeout e impedir ciclos simultâneos.

### [#4](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/4) — In review

A implementação marca falhas como indisponibilidade e o frontend tem texto/ícone. PR #40 foi integrado.

- Homologar estado no PostgreSQL e na interface com o Compose oficial.
- Verificar a distinção para ausência de métricas junto com #5; registrar revisão/aceite.

### [#5](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/5) — In progress

O estado SEM_METRICAS existe, mas o coletor automático trata HTTP 500 como indisponibilidade sem ler o erro; a regra manual interpreta zeros como ausência.

- Unificar a regra entre coleta automática e manual.
- Distinguir falha de ausência conforme o contrato oficial e testar zeros/dados ausentes.

### [#9](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/9) — In review

Histórico, timestamps e última coleta válida existem. O teste com PostgreSQL registrado em 18/10 preserva as coletas anteriores.

- Registrar revisão e aceite; homologar no Compose oficial.
- Energia/CO₂e podem permanecer nulos nesta etapa; cálculos são da Sprint 2.

### [#18](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/18) — In progress

Falhas são capturadas e a última coleta válida é preservada. Carbono ainda não é consumido; faltam timeout e prevenção de ciclos sobrepostos.

- Corrigir isolamento/timeout dos ciclos e validar falha por serviço.
- Registrar a parte de carbono como futura; não considerar comprovada uma integração ainda inexistente.

### [#22](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/22) — In review

Compose com frontend/backend/PostgreSQL e os dois Dockerfiles existem; o proxy interno está configurado.

- Subir os três containers e verificar migração, comunicação e hot reload.
- Registrar resultado, revisão e aceite. Docker estava desligado na auditoria.

### [#23](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/23) — In progress

Protótipos são referenciados e há registro inicial de avaliação heurística; os resultados e ajustes continuam sem consolidação.

- Registrar data, versão avaliada, achados confirmados e melhorias/justificativas.
- Consolidar a referência oficial do Figma e registrar aprovação; não inventar resultados.

### [#24](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/24) — In review

Base NestJS/TS estrita, módulos e Prisma compilam; 25 testes unitários passaram. Lint e start:prod têm pendências.

- Revisar qualidade e o caminho do script de produção.
- Homologar inicialização no ambiente oficial e registrar revisão/aceite.

### [#25](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/25) — In review

React/TS/Vite, rotas, cliente HTTP, hooks e proxy funcionam; build/lint, 7 testes unitários e 22 testes de navegador passaram.

- Corrigir a formatação dos quatro arquivos sinalizados e registrar homologação/revisão/aceite.
- A integração posterior tem melhorias de falha parcial e identificação da idade dos dados.

### [#26](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/26) — In review

Exemplo de ambiente e integração das variáveis ao Compose existem; arquivos sensíveis são ignorados.

- Revisar as instruções atualizadas de configuração nos modos Docker e nativo.
- Integrar a documentação e registrar homologação/revisão/aceite.

### [#27](https://github.com/abpundefined/3DSM-ABP-UNDEFINED/issues/27) — In review

Esquema Prisma, relações e migração estão versionados; há evidência de PostgreSQL real no teste de integração de 18/10.

- Revisar a migração em banco vazio e vincular evidências de execução/aceite.
- A perda de localização é da integração #1; campos geográficos já existem no modelo Regiao.

## Checks executados em 19/10

Os checks foram executados em uma cópia isolada do commit de referência; o banco de desenvolvimento não foi acessado. A aplicação do produto não foi alterada por essa auditoria.

| Verificação | Resultado e limite |
| --- | --- |
| Build frontend | Passou. |
| Unitários frontend | 7 passaram. |
| ESLint frontend | Passou. |
| Prettier frontend | Falhou em DashboardEmpty.tsx, LiveDashboard.tsx, AppLayout.tsx e Dashboard.tsx. |
| Playwright frontend | 22 passaram em desktop/mobile. As consultas de dados dos casos automatizados usam fixtures. O preview precisou ser encerrado após os casos para finalizar o runner. |
| Build backend | Passou após gerar o Prisma Client. |
| Unitários backend | 25 passaram em duas suítes, principalmente descoberta/sincronização. |
| ESLint backend sem --fix | 390 erros e um aviso, incluindo 13 erros em arquivos gerados. Excluindo gerados: 377 erros e um aviso; predominam formatação e há ocorrências de uso inseguro de tipos. |
| start:prod | Falhou: script aponta dist/main, saída atual é dist/src/main.js. |
| Configuração Compose | Validação estática passou com ambiente fictício na cópia isolada. |
| React → proxy → NestJS | Verificado em execução com controllers/services/repository reais, banco substituído por dados de teste e agendador desativado. Não comprova persistência real. |
| Dashboard claro/escuro | Oito combinações de 360/390/768/1440 px, sem overflow da página nem violações automáticas nas regras Axe/WCAG selecionadas. Não substitui teste com usuários. |
| Compose oficial completo | Não executado: Docker Desktop estava desligado. |

O [teste de retorno com PostgreSQL](../teste-integracao-problema1.md) registra seis testes reais aprovados em 18/10, preservando IDs e histórico. Não foi reexecutado em 19/10 e não cobre HTTP, agendador ou frontend.

### Reproduções que precisam de correção

- Os oito serviços reais consultados tiveram localização perdida no normalizador atual, pois os campos estão dentro de `location`.
- Os oito responderam métricas com HTTP 200 na amostra. A especificação oficial também prevê 500 para indisponibilidade e ausência do exportador; o coletor não lê o corpo desses erros. A reprodução da falha usou fixtures, não uma falha real observada nessa amostra.
- O cadastro manual marcou medições zero como SEM_METRICAS; o automático aceitou os mesmos zeros como SUCESSO.
- Com intervalo recebido de 27 s e configuração de 30 s, o coletor gravou 30 s. A amostra real informou 11 s.
- ID -1.5, CPU 150 e memória -2 passaram pela validação HTTP em uma reprodução com persistência simulada. Isso não afirma que o banco aceite ID fracionário; evidencia a falta de restrições no DTO.
- A falha de um serviço na primeira carga do dashboard bloqueou três linhas e o resumo exibiu zero. Na atualização após sucesso, as três linhas foram preservadas com aviso.
- Uma coleta de 01/10 apareceu junto de outra de 19/10, sem data por linha; o rodapé mostrou só a mais recente.

## Como concluir a homologação

1. Corrigir os itens In progress, sem perder a regressão de retorno já coberta por testes.
2. Usar [execucao.md](../execucao.md) para subir o Compose oficial em ambiente de teste separado.
3. Registrar descoberta, leitura das quatro métricas, localização, estados e preservação de histórico; exercitar remoção/retorno e falhas com fixtures/ambiente controlado, sem manipular a API oficial.
4. Registrar autor, revisor, versão, resultado, link da evidência e aceite do PO conforme a DoD.
5. Atualizar Done e o ledger de aceites somente depois dessas condições.

O responsável não precisa criar outra funcionalidade para resolver uma pendência de evidência: deve executar o teste pertinente e registrar seu resultado. Para itens com defeito conhecido, primeiro corrigir e revalidar.

## Sincronização manual do Projects

A classificação acima está pronta para aplicação por um integrante com permissão de edição. Definir o campo Estimate com os SP da tabela, manter os mesmos responsáveis/labels e aplicar as situações recomendadas. Não contar épicos como trabalho adicional.

Após aplicar, registrar a data e o responsável por essa sincronização. O campo de estado observado do [CSV de escopo](../metricas/sprint-1/escopo.csv) deve ser atualizado para refletir o quadro; não substituir esse campo por uma recomendação ainda não aplicada.
