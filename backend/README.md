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
prisma/
  schema.prisma
  migrations/
prisma7.config.ts
test/integration/            regressão de remoção/retorno com PostgreSQL
```

O diretório `src/generated/prisma` é gerado pelo Prisma Client e não precisa ser editado. A integração atual não possui os módulos de cálculos, carbono ou autenticação.

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

- `GET /servicos`: registros persistidos de serviços, incluindo estados removidos.
- `POST /servicos/sync`: sincroniza a descoberta externa.
- `POST /coletas`: registra uma coleta pelo DTO.
- `GET /coletas`: histórico com filtros opcionais.
- `GET /coletas/:id`: detalhe de coleta.
- `GET /coletas/servico/:servicoId/ultima-valida`: última coleta de sucesso, ou 404.

Não há prefixo global `/api`; esse prefixo é do proxy do frontend. As rotas atuais não implementam JWT. `GET /` ainda é a resposta inicial do Nest, e não um health check de banco.

Leia [contratos, unidades e erros](../docs/api.md). Rotas de autenticação, cálculos, ranking, comparação e Swagger ainda não estão implementadas.

## Testes e checks

```powershell
npm.cmd run build
npm.cmd test -- --runInBand
npx.cmd eslint "{src,apps,libs,test}/**/*.ts"
```

Em 19/10: build aprovado após gerar o Prisma Client e 25 testes unitários aprovados. O ESLint ainda apresenta falhas; o comando acima não aplica `--fix`. O `npm run lint` definido no projeto aplica correções automaticamente.

O teste com PostgreSQL real tem [guia próprio](../docs/teste-integracao-problema1.md), com seis testes aprovados registrados em 18/10. Não foi reexecutado em 19/10 porque o Docker estava desligado. O `test:e2e` padrão do Nest não é a mesma suíte desse Compose isolado.

## Limitações em revisão

- `start:prod` aponta para `dist/main`; o build atual gera `dist/src/main.js`.
- O mapeamento geográfico, a distinção de ausência de métricas, o intervalo real da medição e a validação numérica precisam de correções.
- O agendador ainda não tem timeout explícito, trava entre ciclos ou encerramento do timer no ciclo de destruição.
- Serviços/monitoramento ainda acessam o Prisma diretamente; há regras duplicadas em relação ao registro manual de coletas.

Esses pontos estão associados aos itens da [revisão da Sprint 1](../docs/sprints/revisao-sprint-1.md); não são funcionalidades declaradas como concluídas.
