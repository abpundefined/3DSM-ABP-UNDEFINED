# Backend GreenER

NestJS com TypeScript estrito, Prisma e PostgreSQL. Base conferida em 19/10/2026: `0adb1e0`.

## Organização

```text
src/
  app.module.ts
  main.ts
  config/
  database/                  PrismaService e verificação de schema
  common/filters/            filtro aplicado às rotas de coletas
  common/utils/              normalização das respostas externas
  modules/servicos/          descoberta e sincronização
  modules/monitoramento/     agendador e coleta automática
  modules/coletas/           controller, service, repository e DTOs
  modules/indicadores/       agregados ambientais e contagem por estado
prisma/
  schema.prisma
  migrations/
prisma7.config.ts
test/integration/            regressão de remoção/retorno com PostgreSQL
```

O diretório `src/generated/prisma` é gerado pelo Prisma Client e não precisa ser editado.

## Executar

O caminho recomendado para o conjunto é `docker compose up --build`, a partir da raiz com `.env` preenchido. O container do backend gera o Prisma Client e aplica migrações antes de iniciar `start:dev`.

Para executar nativamente, use Node 24.x/npm 11.x, PostgreSQL disponível e um `.env` **nesta pasta** com `DATABASE_URL`, `METRICS_API_URL` e demais variáveis necessárias:

```powershell
npm.cmd ci
npx.cmd prisma generate --config prisma7.config.ts
npx.cmd prisma migrate deploy --config prisma7.config.ts
npm.cmd run start:dev
```

`migrate deploy` aplica as migrações versionadas a um banco vazio ou com migrações pendentes; não gera uma nova migração e não faz reset. Preparação dos dois modos e exemplos de ambiente: [guia de execução](../docs/execucao.md).

## API atual

Com o backend em execução, acesse o Swagger em [http://localhost:3000/docs](http://localhost:3000/docs). O documento OpenAPI em JSON está disponível em [http://localhost:3000/docs-json](http://localhost:3000/docs-json). No Swagger, use `POST /auth/login` para obter um token e o botão **Authorize** para informar o JWT antes de testar as rotas protegidas. As operações de escrita alteram dados reais.

- `GET /servicos`: registros persistidos de serviços, incluindo estados removidos.
- `POST /servicos/sync`: sincroniza a descoberta externa.
- `POST /coletas`: registra uma coleta pelo DTO.
- `GET /coletas`: histórico com filtros opcionais.
- `GET /coletas/:id`: detalhe de coleta.
- `GET /coletas/servico/:servicoId/ultima-valida`: última coleta de sucesso, ou 404.
- `GET /indicadores`: totais de coletas calculadas e serviços por estado. Aceita `periodo` (`24h`, `7d`, `30d`, `mes-atual` ou `mes-anterior`) ou `inicio` e `fim` em ISO 8601 com fuso obrigatório; o intervalo customizado pode ter no máximo 90 dias. `mes-anterior` inclui a comparação `variacao` com o mês calendário anterior.

Não há prefixo global `/api`; esse prefixo é do proxy do frontend. `PUT /configuracao`, `POST /coletas` e `POST /servicos/sync` requerem JWT; `GET /` é a resposta inicial do Nest, e não um health check de banco.

Leia [contratos, unidades e erros](../docs/api.md).

O monitoramento lê os intervalos salvos por `PUT /configuracao` sem reiniciar o
backend. Ao terminar cada ciclo, agenda o próximo com o intervalo de coleta
atual; a descoberta só é repetida quando seu próprio intervalo tiver decorrido.
O tempo de execução do ciclo não é incluído na espera entre ciclos. Se a leitura
da configuração falhar, registra um aviso e usa `METRICS_POLL_INTERVAL_MS` (ou
30 segundos). O timer é cancelado no encerramento da aplicação.

## Testes e checks

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:cov
npm.cmd run lint
```

- `npm test`: roda todos os testes unitários, sem medir cobertura. É o comando do dia a dia.
- `npm run test:cov`: roda os mesmos testes medindo a cobertura e **falha** se algum arquivo de `src/modules/calculos/*.service.ts` ou de `src/common/regras/` ficar abaixo de 80% em linhas, ramificações, funções ou instruções (`coverageThreshold` no `package.json`). **É o comando executado no CI**: rode-o antes de abrir um PR, principalmente se alterar cálculo ou classificação de estados. O relatório fica em `backend/coverage/`, ignorado pelo Git.
- O `npm run lint` verifica problemas sem alterar arquivos; use `npm run lint:fix` para corrigir automaticamente.

O teste com PostgreSQL real tem [guia próprio](../docs/teste-integracao-problema1.md), com seis testes aprovados registrados em 18/10. Não foi reexecutado em 19/10 porque o Docker estava desligado. O `test:e2e` padrão do Nest não é a mesma suíte desse Compose isolado.

## Limitações em revisão

- O `ServicosService` ainda acessa o Prisma diretamente; a extração para um repository está prevista para a Sprint 3.

Esses pontos estão associados aos itens da [revisão da Sprint 1](../docs/sprints/revisao-sprint-1.md); não são funcionalidades declaradas como concluídas.
