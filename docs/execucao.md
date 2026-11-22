# Executar e verificar o GreenER

Este guia descreve a execução local do frontend, backend e PostgreSQL, incluindo o login administrativo e a criação inicial do administrador.

## Escolha o modo

- **Docker completo:** frontend, backend e PostgreSQL nos containers. É o modo de homologação da DoD. Não inicie outro backend/frontend nativo nas mesmas portas.
- **Desenvolvimento nativo:** Node executa frontend/backend; pode-se usar somente o PostgreSQL do Compose. Útil para depuração. Os passos estão abaixo.

Pré-requisitos: Git e Docker Desktop em execução, com containers Linux. Para o modo nativo: Node 24.x e npm 11.x. Os comandos abaixo usam PowerShell; `npm.cmd` e `npx.cmd` evitam o bloqueio de scripts `.ps1` neste ambiente.

## Docker completo

Na raiz do repositório:

```powershell
Copy-Item .env.example .env
```

Edite o `.env` antes de iniciar. Exemplo de preenchimento **local**, que deve ser adaptado:

```dotenv
DB_HOST=postgres
DB_PORT=5433
DB_USER=greener
DB_PASS=troque_senha_local
DB_NAME=greener
DATABASE_URL=postgresql://greener:troque_senha_local@127.0.0.1:5433/greener?schema=public
METRICS_API_URL=https://metrics.unilaunch.org
CARBON_API_URL=https://carbon.unilaunch.org
METRICS_POLL_INTERVAL_MS=30000
JWT_SECRET=<valor gerado pelo comando abaixo>
JWT_EXPIRES_IN=3600
ADMIN_NOME=Administrador
ADMIN_EMAIL=admin@greener.local
ADMIN_PASSWORD=SenhaLocal#2026
CORS_ORIGIN=http://localhost:5173
```

Gere o `JWT_SECRET` com:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O backend valida o ambiente no boot e não inicia se `JWT_SECRET` tiver menos de 32 caracteres ou se `JWT_SECRET` ou `ADMIN_PASSWORD` mantiverem os valores do `.env.example`. Quando definida, `ADMIN_PASSWORD` precisa de pelo menos 12 caracteres. A mensagem de erro lista cada variável inválida.

| Variável | Uso atual |
| --- | --- |
| `DB_PORT` | Porta do PostgreSQL publicada no host. O exemplo usa 5433 para permitir coexistência com uma instalação em 5432. |
| `DB_USER`, `DB_PASS`, `DB_NAME` | Inicialização do banco e conexão do backend. |
| `DATABASE_URL` | Necessária para Prisma/Nest no modo nativo. No container, o Compose monta outra URL com host `postgres` e porta interna 5432. |
| `DB_HOST` | Registro do ambiente; no backend containerizado o Compose fixa `postgres`. |
| `METRICS_API_URL` | Agregador consumido por descoberta e coleta. |
| `METRICS_POLL_INTERVAL_MS` | Frequência do ciclo de monitoramento, em milissegundos. O padrão é 30000. Não confundir com o intervalo da medição retornado pela API. |
| `CARBON_API_URL` | URL base da API de intensidade de carbono. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Segredo de assinatura e duração do JWT. Obrigatório, com pelo menos 32 caracteres e diferente do `.env.example`. |
| `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Dados usados para criar o administrador inicial se o e-mail ainda não existir. `ADMIN_PASSWORD` precisa de pelo menos 12 caracteres e não pode ser o valor do `.env.example`. |
| `CORS_ORIGIN` | Origens autorizadas a chamar a API diretamente pelo navegador, separadas por vírgula. Sem valor, apenas `http://localhost:5173`. Requisições feitas pelo proxy do frontend não dependem dessa lista. |

No Compose, o backend usa `postgres:5432` e o proxy do frontend usa `http://backend:3000`. A URL com `127.0.0.1:5433` é para processos que rodam no host. Caracteres reservados nas credenciais de uma URL precisam de codificação adequada.

### Configuração das APIs externas, timeouts e fallback

- **`METRICS_API_URL`:** consumida em `GET /services` (descoberta) e `GET /metrics/:id` (coleta por serviço), ambas com timeout explícito de **8 segundos (`8000 ms`)**. Em caso de falha/timeout na descoberta, o backend registra `agregador = FALHA` em `GET /saude` e preserva os serviços já cadastrados. Na coleta por serviço, HTTP 5xx, erro de rede ou timeout classificam o serviço como `INDISPONIVEL` (`estadoColeta = FALHA`) e o ciclo segue para os demais serviços; HTTP 404 ou payload sem medições válidas classificam como `SEM_METRICAS`.
- **`CARBON_API_URL`:** consumida em `GET /regions/:code/carbon-intensity`, também com timeout de **8 segundos (`8000 ms`)**. Em falha, resposta inválida ou timeout, as métricas brutas e `energiaKwh` são preservadas com `estadoColeta = SUCESSO` e `estadoCalculo = FALHA`, atualizando `apiCarbono = FALHA` em `GET /saude`.
- **Fallback de intervalo e interface:** se a consulta à tabela `ConfiguracaoMonitoramento` falhar, o agendador usa `METRICS_POLL_INTERVAL_MS` (padrão `30000 ms`). Na interface, `GET /coletas/servico/:id/ultima-valida` recupera a última coleta válida preservada (`CACHE_FALLBACK`) e `/?demo=1` permite usar a aplicação sem backend.

### Testar o login administrativo

No boot, o `AdminSeedService` cria o administrador configurado quando `ADMIN_EMAIL` e `ADMIN_PASSWORD` estão definidos e o e-mail ainda não existe. Alterar o `.env` depois que a conta foi criada não redefine sua senha; use um e-mail de teste novo ou atualize a conta pelo mecanismo administrativo do banco.

Com os valores **locais de exemplo** acima, abra `http://localhost:5173/login` e informe:

- E-mail: `admin@greener.local`
- Senha: `SenhaLocal#2026`

Troque esses placeholders por credenciais próprias antes de iniciar o ambiente. O endpoint do backend é `POST /auth/login` e recebe `{ "email": "...", "senha": "..." }`. A tela encaminha a requisição pelo proxy do frontend, salva o `accessToken` retornado, exibe o item **Administração** no menu e libera o acesso à página `/admin` (onde é possível consultar e alterar os intervalos de monitoramento via `GET`/`PUT /configuracao` e acompanhar a saúde das integrações via `GET /saude`). O dashboard continua público.

Para validar o endpoint diretamente, com o backend ativo:

```powershell
$body = @{ email = "admin@greener.local"; senha = "SenhaLocal#2026" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType "application/json" -Body $body
```

Uma resposta bem-sucedida contém `accessToken`. Credenciais inválidas retornam HTTP 401. A partir da 6ª tentativa no mesmo minuto, o endpoint retorna HTTP 429 até a janela expirar.

```powershell
docker compose config --quiet
docker compose up --build
```

Para validar o ambiente a partir de um banco totalmente vazio (atenção: `-v` remove o volume local do PostgreSQL):

```powershell
docker compose down -v
docker compose up --build
```

O Dockerfile do backend já gera o Prisma Client, aplica `prisma migrate deploy` e executa `start:dev`. Não é necessário abrir outro terminal para iniciar um segundo backend.

Em outro terminal, na raiz:

```powershell
docker compose ps
docker compose logs --tail 100 backend
Invoke-RestMethod http://localhost:3000/servicos
Invoke-RestMethod http://localhost:5173/api/servicos
```

Abra `http://localhost:5173`. Para consultar a última coleta de um serviço, use um ID interno retornado pela listagem:

```powershell
$servicos = Invoke-RestMethod http://localhost:3000/servicos
$servicoId = $servicos[0].id
Invoke-RestMethod "http://localhost:3000/coletas/servico/$servicoId/ultima-valida"
```

Uma lista vazia ou 404 em `ultima-valida` exige conferir se já houve descoberta/coleta bem-sucedida. Os logs do backend ajudam a distinguir banco não preparado, configuração e falhas externas.

## Desenvolvimento nativo com PostgreSQL do Compose

Depois de preencher o `.env` da raiz, inicie **somente** o banco:

```powershell
docker compose up -d postgres
```

No terminal do backend:

```powershell
cd backend
Copy-Item ..\.env.example .env
npm.cmd ci
```

Preencha `backend/.env` com as credenciais do mesmo banco, `DB_HOST=127.0.0.1`, `DB_PORT=5433` e `DATABASE_URL=postgresql://greener:troque_senha_local@127.0.0.1:5433/greener?schema=public`, ajustando usuário, senha, nome e porta. O Nest e o Prisma leem o ambiente a partir da pasta do backend; criar apenas o `.env` da raiz não configura essa execução nativa.

```powershell
npx.cmd prisma generate --config prisma7.config.ts
npx.cmd prisma migrate deploy --config prisma7.config.ts
npm.cmd run start:dev
```

Em outro terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

O frontend nativo encaminha `/api/...` para `http://localhost:3000`, removendo `/api`. As opções `API_PROXY_TARGET` e `API_PROXY_REWRITE` são descritas em [frontend/README.md](../frontend/README.md).

Para a execução nativa, configure também `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `CORS_ORIGIN` em `backend/.env`. O backend não lê o `.env` da raiz nesse modo. O seed cria a conta no primeiro boot se o e-mail ainda não existir; alterar as variáveis não redefine a senha de uma conta já criada.

## Verificações

No frontend:

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:coverage
npm.cmd run lint
npm.cmd run format:check
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

- `npm.cmd run test:e2e` gera o build do frontend e executa a suíte de navegador Playwright (com verificação de acessibilidade Axe) em Chromium para os projetos `desktop` e `mobile` — é o mesmo comando executado automaticamente pelo job `frontend-e2e` no GitHub Actions (que publica os traces de `frontend/test-results/` como artefato quando ocorre falha).

No backend, após gerar o Prisma Client:

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:cov
npm.cmd run lint
```

- `npm.cmd run test:cov` executa os testes unitários exigindo cobertura mínima de **80%** em linhas, funções, branches e statements para `*.service.ts` e `*.repository.ts` (mesma regra aplicada no CI).
- `npm.cmd run lint` somente verifica problemas (`--max-warnings 0`); use `npm.cmd run lint:fix` quando desejar aplicar correções automáticas.
- `npm.cmd run start:prod` executa `node dist/src/main.js` após `npm.cmd run build`.
- Para testes E2E de API contra PostgreSQL real (`npm.cmd run test:e2e`, usando um banco cujo nome termine em `_e2e`), siga o passo a passo em [backend/README.md](../backend/README.md#testes-e2e-de-api-npm-run-teste2e).

O [teste isolado de retorno de serviços](teste-integracao-problema1.md) usa PostgreSQL exclusivo de teste e tem instruções próprias. Ele não substitui a homologação dos três containers oficiais com a interface.

## Hot reload, encerramento e dados

Os diretórios `src` são montados nos containers de desenvolvimento. Alterações em dependências e Dockerfiles exigem reconstrução com `docker compose up --build`.

Para encerrar o ambiente iniciado por você:

```powershell
docker compose down
```

Esse comando mantém o volume nomeado do PostgreSQL. Para recriar o banco do zero em ambiente local de teste, use `docker compose down -v` somente após confirmar que não há dados a preservar.

## O que esperar da interface

- `/`: dashboard operacional conectado ao backend, com indicadores consolidados, tendência, busca/filtros de serviços e atualização periódica automática.
- `/?demo=1`: modo demonstração completo com dados fictícios identificados, funcionando mesmo sem backend.
- `/ranking`: ranking de serviços por consumo energético ou emissão de CO₂e no período selecionado.
- `/comparar`: comparação lado a lado de 2 a 5 serviços no mesmo período.
- `/mapa`: globo e mapa interativo animado das emissões por região, com filtro regional e tabela acessível.
- `/servicos/:id`: detalhe do serviço com histórico temporal, composição de potência e simulador de região.
- `/metodologia`: explicação das fórmulas de energia e emissão de CO₂e ("Como calculamos").
- `/relatorio`: resumo imprimível / exportável em PDF para o período selecionado.
- `/login`: autentica o administrador via `POST /auth/login`.
- `/admin`: área restrita (exige JWT) para editar intervalos de monitoramento (`PUT /configuracao`) e acompanhar a saúde das integrações (`GET /saude`).

As limitações históricas da Sprint 1 estão registradas na [revisão da Sprint 1](sprints/revisao-sprint-1.md); os contratos atuais constam em [documentação da API](api.md).
