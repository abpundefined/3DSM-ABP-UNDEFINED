# Segurança do GreenER

Este documento registra os controles de segurança implementados no backend, como verificá-los e as limitações conhecidas.

## Controles implementados

| Controle | Implementação | Arquivo |
| --- | --- | --- |
| Senhas com hash | bcrypt com custo 10; a senha nunca é armazenada em texto puro. | `backend/src/modules/auth/admin-seed.service.ts` |
| Mensagem de login genérica | E-mail inexistente e senha errada retornam o mesmo HTTP 401, sem indicar qual campo falhou. | `backend/src/modules/auth/auth.service.ts` |
| Rotas de escrita protegidas | `PUT /configuracao`, `POST /coletas` e `POST /servicos/sync` exigem JWT Bearer. | `backend/src/modules/auth/guards/jwt-auth.guard.ts` |
| Limite de tentativas de login | 5 tentativas por minuto em `POST /auth/login`; a 6ª retorna HTTP 429. | `backend/src/modules/auth/limite-login.ts` |
| Validação de entrada | `ValidationPipe` global com `whitelist` e `forbidNonWhitelisted`; a senha aceita no máximo 128 caracteres. | `backend/src/main.ts`, `backend/src/modules/auth/dto/login.dto.ts` |
| Validação do ambiente no boot | O backend não inicia com `JWT_SECRET` ausente, com menos de 32 caracteres ou igual ao `.env.example`, nem com `ADMIN_PASSWORD` com menos de 12 caracteres ou igual ao `.env.example`. | `backend/src/config/validar-ambiente.ts` |
| Cabeçalhos HTTP de segurança | helmet: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, remoção de `X-Powered-By`, entre outros. | `backend/src/seguranca.ts` |
| CORS restrito | Apenas as origens de `CORS_ORIGIN` (padrão `http://localhost:5173`) recebem permissão de CORS. | `backend/src/seguranca.ts` |
| SQL parametrizado | Consultas pelo Prisma; o SQL manual usa somente `$queryRaw` com template, que parametriza os valores. | `backend/src/modules/**/*.repository.ts` |
| Erros sem detalhes internos | O filtro global não devolve stack trace ao cliente. | `backend/src/common/filters/http-exception.filter.ts` |
| Segredos fora do versionamento | `.env` está no `.gitignore`; o repositório contém apenas `.env.example`. | `.gitignore` |
| Portas locais | O Compose publica PostgreSQL, backend e frontend apenas em `127.0.0.1`. | `compose.yaml` |
| Dependências | `npm audit --omit=dev` sem vulnerabilidades no backend e no frontend em 16/11/2026. | `backend/package-lock.json` |

A CSP não inclui `upgrade-insecure-requests`, porque a API é servida por HTTP. Com essa diretiva, o Swagger acessado pelo IP da máquina tentava carregar os arquivos por HTTPS e não abria.

## Como verificar

Com o backend em execução na porta 3000:

```powershell
curl.exe -sI http://localhost:3000/
```

A resposta deve conter `Content-Security-Policy`, `X-Content-Type-Options: nosniff` e `X-Frame-Options: SAMEORIGIN`, e não deve conter `X-Powered-By`.

```powershell
1..6 | ForEach-Object {
  try {
    Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType "application/json" -Body '{"email":"admin@greener.local","senha":"errada"}'
  } catch { $_.Exception.Response.StatusCode.value__ }
}
```

As cinco primeiras tentativas retornam 401 e a sexta retorna 429.

Os testes automatizados ficam em `backend/src/seguranca.spec.ts`, `backend/src/config/validar-ambiente.spec.ts`, `backend/src/modules/auth/auth.controller.spec.ts` e `backend/src/modules/auth/dto/login.dto.spec.ts`.

## Limitações conhecidas

- O limite de login conta por IP de origem. No Compose, as requisições do navegador passam pelo proxy do frontend e chegam ao backend com o IP do container do frontend, então o limite é compartilhado por todos os usuários que usam o proxy.
- O token JWT fica no `localStorage` do navegador. Um script injetado na página conseguiria lê-lo; não há refresh token nem revogação antes da expiração (`JWT_EXPIRES_IN`).
- Os containers rodam como `root` e o frontend usa o servidor de desenvolvimento do Vite.
- A comunicação é por HTTP. Em uma implantação pública, a API precisa ficar atrás de HTTPS.
