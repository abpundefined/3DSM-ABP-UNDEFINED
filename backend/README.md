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
  common/utils/              normalização das respostas externas e intervalos de período
  modules/servicos/          descoberta e sincronização
  modules/monitoramento/     agendador e coleta automática
  modules/coletas/           controller, service, repository e DTOs
  modules/indicadores/       agregados ambientais e contagem por estado
  modules/mapa/              serviços no mapa com a série de emissão do período
  modules/simulacao/         simulação da emissão do serviço em outra região
  modules/saude/             saúde das integrações externas e das coletas
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
- `GET /mapa`: serviços com coordenadas, totais e série de emissão por hora (até 48 horas) ou por dia, além da lista `semCoordenadas`. Aceita os mesmos parâmetros de período de `GET /indicadores`.
- `GET /servicos/:id/simulacao-regiao`: emissão estimada do serviço em cada região monitorada (energia do período × intensidade média da região), com a diferença em g e em % e a região de menor emissão. Aceita os mesmos parâmetros de período; serviço inexistente retorna 404.
- `GET /saude`: última consulta e resultado do agregador e da API de carbono, taxa de falha das coletas na última hora e serviços por estado. Requer JWT.

Não há prefixo global `/api`; esse prefixo é do proxy do frontend. `PUT /configuracao`, `POST /coletas`, `POST /servicos/sync` e `GET /saude` requerem JWT; `GET /` é a resposta inicial do Nest, e não um health check de banco.

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

### Testes E2E de API (`npm run test:e2e`)

Sobem a aplicação inteira (`AppModule`) contra um PostgreSQL real e chamam as rotas por HTTP com Supertest: login, `GET /configuracao` e `PUT /configuracao` (com e sem token), `POST /servicos/sync`, um ciclo do monitoramento, `GET /servicos`, a última coleta válida, `GET /indicadores`, `GET /ranking`, `GET /comparacao` e `GET /mapa`, incluindo os casos de 400, 401 e 404.

- O script confere o banco, aplica `prisma migrate deploy` e roda o Jest com `test/jest-e2e.json`.
- O banco precisa ter o nome terminado em `_e2e`: os testes apagam todas as tabelas no início e no fim. Com outro nome, o script para antes de qualquer migração.
- A API de descoberta, a de métricas e a de carbono são simuladas por um servidor local na porta 45999 (`test/e2e/apis-simuladas.ts`); nenhuma chamada sai para a internet.
- As variáveis da aplicação (URLs externas, `JWT_SECRET` e administrador) são definidas pelos próprios testes em `test/e2e/ambiente.ts`, antes do `.env`; só `DATABASE_URL` vem de fora.
- O agendamento automático do monitoramento fica desligado; o teste dispara um ciclo e espera ele terminar, para o resultado não depender de tempo.
- O Jest usa `--experimental-vm-modules` porque o `@nestjs/config` é distribuído apenas como ESM.
- No CI, o job `backend-e2e` roda a mesma suíte com o serviço `postgres:17`, partindo de um banco vazio.

Para rodar na máquina, com o PostgreSQL do Compose em execução e os valores de `DB_USER`, `DB_PASS` e `DB_PORT` do `.env` da raiz:

```powershell
docker compose exec postgres createdb -U <DB_USER> greener_e2e
cd backend
$env:DATABASE_URL="postgresql://<DB_USER>:<DB_PASS>@localhost:<DB_PORT>/greener_e2e?schema=public"
npm.cmd run test:e2e
Remove-Item Env:DATABASE_URL
```

O `createdb` só é necessário na primeira vez. No Git Bash, use `DATABASE_URL="..." npm run test:e2e` na mesma linha.

O teste com PostgreSQL real tem [guia próprio](../docs/teste-integracao-problema1.md), com seis testes aprovados registrados em 18/10. Não foi reexecutado em 19/10 porque o Docker estava desligado.

