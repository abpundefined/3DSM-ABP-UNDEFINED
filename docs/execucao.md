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
JWT_SECRET=defina_um_valor_local
JWT_EXPIRES_IN=3600
ADMIN_NOME=Administrador
ADMIN_EMAIL=admin@greener.local
ADMIN_PASSWORD=troque-esta-senha
```

| Variável | Uso atual |
| --- | --- |
| `DB_PORT` | Porta do PostgreSQL publicada no host. O exemplo usa 5433 para permitir coexistência com uma instalação em 5432. |
| `DB_USER`, `DB_PASS`, `DB_NAME` | Inicialização do banco e conexão do backend. |
| `DATABASE_URL` | Necessária para Prisma/Nest no modo nativo. No container, o Compose monta outra URL com host `postgres` e porta interna 5432. |
| `DB_HOST` | Registro do ambiente; no backend containerizado o Compose fixa `postgres`. |
| `METRICS_API_URL` | Agregador consumido por descoberta e coleta. |
| `METRICS_POLL_INTERVAL_MS` | Frequência do ciclo de monitoramento, em milissegundos. O padrão é 30000. Não confundir com o intervalo da medição retornado pela API. |
| `CARBON_API_URL` | URL base da API de intensidade de carbono. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Segredo de assinatura e duração do JWT. Configure um segredo local forte; não use o placeholder em produção. |
| `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Dados usados para criar o administrador inicial se o e-mail ainda não existir. Os valores do exemplo são somente para desenvolvimento local. |

No Compose, o backend usa `postgres:5432` e o proxy do frontend usa `http://backend:3000`. A URL com `127.0.0.1:5433` é para processos que rodam no host. Caracteres reservados nas credenciais de uma URL precisam de codificação adequada.

### Testar o login administrativo

No boot, o `AdminSeedService` cria o administrador configurado quando `ADMIN_EMAIL` e `ADMIN_PASSWORD` estão definidos e o e-mail ainda não existe. Alterar o `.env` depois que a conta foi criada não redefine sua senha; use um e-mail de teste novo ou atualize a conta pelo mecanismo administrativo do banco.

Com os valores **locais de exemplo** acima, abra `http://localhost:5173/login` e informe:

- E-mail: `admin@greener.local`
- Senha: `troque-esta-senha`

Troque esses placeholders por credenciais próprias antes de iniciar o ambiente. O endpoint do backend é `POST /auth/login` e recebe `{ "email": "...", "senha": "..." }`. A tela encaminha a requisição pelo proxy do frontend, salva o `accessToken` retornado e redireciona para `/dashboard`. O dashboard continua público. A API de configuração está disponível em `/configuracao`; ainda não há uma tela administrativa para editar esses valores.

Para validar o endpoint diretamente, com o backend ativo:

```powershell
$body = @{ email = "admin@greener.local"; senha = "troque-esta-senha" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType "application/json" -Body $body
```

Uma resposta bem-sucedida contém `accessToken`. Credenciais inválidas retornam HTTP 401.

```powershell
docker compose config --quiet
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

Para a execução nativa, configure também `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` em `backend/.env`. O backend não lê o `.env` da raiz nesse modo. O seed cria a conta no primeiro boot se o e-mail ainda não existir; alterar as variáveis não redefine a senha de uma conta já criada.

## Verificações

No frontend:

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run lint
npm.cmd run format:check
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

No backend, após gerar o Prisma Client:

```powershell
npm.cmd run build
npm.cmd test -- --runInBand
npx.cmd eslint "{src,apps,libs,test}/**/*.ts"
```

O script `npm run lint` do backend contém `--fix`; o comando acima somente verifica. Na auditoria, o lint do backend e o `format:check` do frontend tiveram falhas. O script `start:prod` também tem uma pendência: aponta para `dist/main`, mas a saída atual é `dist/src/main.js`. Não usar esse script como caminho de execução validado até sua correção.

O [teste isolado de retorno de serviços](teste-integracao-problema1.md) usa PostgreSQL exclusivo de teste e tem instruções próprias. Ele não substitui a homologação dos três containers oficiais com a interface.

## Hot reload, encerramento e dados

Os diretórios `src` são montados nos containers de desenvolvimento. Alterações em dependências e Dockerfiles exigem reconstrução com `docker compose up --build`. O funcionamento do hot reload precisa ser registrado na homologação da #22.

Para encerrar o ambiente iniciado por você:

```powershell
docker compose down
```

Esse comando mantém o volume nomeado do PostgreSQL. Remoção de volumes não faz parte da rotina deste guia. Confirme o ambiente/projeto de teste antes de executar comandos de administração.

## O que esperar da interface

- `/`: serviços e última coleta válida do backend, com atualização a cada 30 segundos.
- `/?demo=1`: gráficos e indicadores com dados fictícios identificados.
- `/login`: autentica no backend com as credenciais configuradas para o administrador.
- `/configuracao`: consulta os intervalos atuais; alterações exigem JWT Bearer.

As limitações conhecidas e os critérios de homologação estão na [revisão da Sprint 1](sprints/revisao-sprint-1.md).
