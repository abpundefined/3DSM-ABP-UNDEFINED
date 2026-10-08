# Frontend GreenER

Frontend React + TypeScript + Vite da task #25, implementado por Rainan.
Dashboard, Login e página 404 compartilham layout, navegação e estilos responsivos.

## Executar localmente

Use Node **24.x** e npm **11.x**. Abra o terminal nesta pasta:

```powershell
npm.cmd ci
npm.cmd run dev
```

Acesse **http://localhost:5173**. O frontend abre mesmo sem o backend.
No PowerShell deste ambiente, use `npm.cmd`: `npm` tenta executar um script
bloqueado pela política local. Em outros terminais, `npm` também funciona.

## Comandos

| Comando                    | Finalidade                                       |
| -------------------------- | ------------------------------------------------ |
| `npm.cmd run dev`          | Desenvolvimento com atualização automática       |
| `npm.cmd run build`        | Verificar TypeScript e gerar `dist/`             |
| `npm.cmd run preview`      | Conferir o build em http://localhost:4173        |
| `npm.cmd run lint`         | Verificar problemas de código                    |
| `npm.cmd run format`       | Aplicar Prettier aos arquivos do frontend        |
| `npm.cmd run format:check` | Conferir formatação                              |
| `npm.cmd test`             | Executar os testes do serviço HTTP               |
| `npm.cmd run test:e2e`     | Testar as páginas no build, em desktop e celular |
| `npm.cmd run test:e2e:dev` | Testar as páginas em desenvolvimento             |

Execute `build` antes de `preview` ou `test:e2e`. Preview é uma conferência local,
não a configuração de publicação da aplicação.

## Páginas e navegação

- `/`: dashboard público inicial, com indicadores sem valores e estado vazio.
- `/?demo=1`: demonstração opcional com gráficos e serviços fictícios para avaliação visual. Também pode ser aberta pelo botão **Ver demonstração**.
- `/login`: formulário administrativo; o acesso ainda está indisponível. Não envia nem armazena credenciais.
- Outros endereços: página 404 com retorno ao dashboard.

React Router usa `BrowserRouter`, `Routes`, `Outlet` e links de navegação.
As páginas são carregadas sob demanda com feedback e recuperação de falhas.
O hook `usePageTitle` atualiza o título da aba. Há link para pular ao conteúdo,
foco visível e ajuste do foco ao navegar.

A fonte Figtree é local; as cores seguem a paleta do PO.
Métricas reais (#7/#8), autenticação (#15) e demais telas continuam em suas issues.
Leia [o guia da segunda parte](../docs/frontend-interface.md), com decisões,
arquitetura, rubrica e capturas das telas.

## Backend e proxy

O serviço `src/services/api.ts` chama caminhos relativos em `/api`.
O Vite encaminha essas chamadas para `http://localhost:3000`.

O backend atual ainda não tem prefixo global `/api`; o proxy remove esse
prefixo por padrão: `/api/services` vira `/services` no backend.
Esse exemplo não significa que a rota de serviços já esteja implementada.

Os padrões funcionam sem criar `.env`. Para personalizar:

```powershell
Copy-Item .env.example .env
```

| Variável            | Padrão                  | Uso                                                           |
| ------------------- | ----------------------- | ------------------------------------------------------------- |
| `API_PROXY_TARGET`  | `http://localhost:3000` | Endereço do backend visto pelo processo Vite                  |
| `API_PROXY_REWRITE` | `true`                  | Remover `/api`; use `false` quando o backend adotar o prefixo |

Reinicie o Vite depois de alterar o ambiente. Essas variáveis são lidas
na configuração do servidor; não recebem prefixo `VITE_` nem são expostas
pelo mecanismo de ambiente do navegador.

Em Docker, coordenar com a #22 o nome do serviço e usar, por exemplo,
`API_PROXY_TARGET=http://backend:3000` e o comando
`npm run dev -- --host 0.0.0.0`. O Compose ainda não inclui o frontend.

## Serviço HTTP

`apiRequest<T>(path, options)` usa fetch, preserva headers/opções e retorna
JSON ou `undefined` para HTTP 204/205. Caminhos começam com `/`, como
`/services`; URLs externas não são aceitas.

Falhas HTTP lançam `ApiError`, com o status e uma mensagem genérica.
Falhas de rede, cancelamento e JSON inválido são propagados para a tela
tratar. O tipo `T` ajuda no TypeScript, mas não valida o JSON em execução.
Para enviar JSON, informe `Content-Type` e serialize o corpo explicitamente.

## Testes de navegador

```powershell
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run test:e2e:dev
```

Playwright testa Chromium em desktop e celular: navegação, foco, acesso direto,
refresh, formulário, carregamento e falha. Axe verifica problemas automatizáveis
de acessibilidade. Esses testes não substituem testes com usuários.
`test:e2e` inicia o preview na porta 4173; `test:e2e:dev` inicia o Vite na 5173.
As portas devem estar livres. Capturas e traces ficam em `test-results/` (ignorado).

Em produção, o servidor deve oferecer fallback de URLs da SPA para `index.html`,
sem interceptar `/api`. Isso será coordenado com a configuração de publicação/Compose.

## Validação e pendências

Em 08/10/2026: build, lint, formatação, 7 testes HTTP e 18 testes de navegador
no preview passaram. A base das páginas também foi verificada com 14 testes em desenvolvimento. As páginas foram verificadas
em 360, 390, 768 e 1440 px quanto a overflow, e as capturas de desktop e celular
foram revisadas. Axe não encontrou violações nas regras executadas nas três páginas.

O proxy foi verificado na parte 1 com servidor HTTP temporário, em sucesso,
erro e backend indisponível. A integração com NestJS/PostgreSQL real, execução
pelo Compose oficial, aprovação no Figma e revisão por outro integrante permanecem pendentes.

Leia também [o guia da base técnica para iniciantes](../docs/frontend-setup.md).

Leia [o guia do modo de demonstração](../docs/frontend-demo.md).
