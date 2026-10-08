# Interface base do GreenER — task #25, parte 2

Responsável: Rainan Reis. Implementação em 08/10/2026, na branch `feat/25-frontend-layout`, criada da `develop` após `git pull --ff-only origin develop`.

## Contrato de design

- **Usuários e tarefa:** a pessoa de operações deve entender a disponibilidade dos serviços; a pessoa de sustentabilidade deve localizar energia e emissões. A consulta do dashboard é pública. Login é a entrada futura para configuração administrativa.
- **Hierarquia:** navegação → título e disponibilidade dos dados → três indicadores com unidades → serviços → explicação dos indicadores. O estado vazio é a informação principal enquanto a integração não existe.
- **Referências:** imagens GreenER v1 fornecidas pelo PO, especialmente o dashboard operacional e o login. Aplicada a skill oficial instalada `uizze-ui-research`, do Uizze. Pesquisa manual em https://uizze.com/ e sua amostra pública `/landing/after-uizze-simple-no-island-v2.webp`: títulos claros, agrupamento de informações e hierarquia tipográfica. A amostra é um aplicativo de hábitos; não foi copiada sua estética. O catálogo interativo não ficou acessível neste ambiente. Não houve auditoria pelo MCP Uizze ou envio de código ao serviço.
- **Paleta:** `#00661C` para marca e ações principais; `#346700`, `#086600`, `#5E6600` e `#665C00` para indicadores e elementos informativos. `#C55DFF` e `#B57D00` são acentos pontuais. Texto escuro sobre os acentos claros; os fundos suaves são variações das cores do PO. Superfícies neutras preservam leitura.
- **Componentes:** layout compartilhado, marca, ícones vetoriais, indicador, feedback e limite de erro. Fonte Figtree variável empacotada localmente; nenhuma requisição a Google Fonts no navegador.
- **Estados:** vazio sem números inventados; carregamento durante abertura das páginas; falha inesperada com recuperação; login administrativo explicitamente indisponível. Campos com rótulos, validação nativa e controle para mostrar senha.
- **Responsividade:** conteúdo limitado a 1240 px; três indicadores e duas colunas em desktop; empilhamento no celular a partir de 360 px. Navegação visível, sem menu escondendo dois destinos.
- **Evitar:** links para telas inexistentes, controles sem resposta, gráficos fictícios com aparência de dados reais, gradientes e animações decorativas, contextos sem estado compartilhado real.
- **Verificação:** links, histórico, acesso direto, refresh, 404, foco, login sem transmissão, carregamento/falha, contraste automatizado e ausência de overflow em desktop, tablet e celular.

## Como a aplicação funciona

`main.tsx` monta o React e o `BrowserRouter`. `App.tsx` associa URLs às páginas com `Routes` e `Route`. Uma rota de layout envolve as três páginas: seu `Outlet` mostra a página atual sem duplicar cabeçalho e rodapé. `Link` e `NavLink` navegam sem recarregar o documento. O link ativo recebe `aria-current`.

As páginas são carregadas com `lazy`. Enquanto seu arquivo JavaScript chega, `Suspense` apresenta feedback de carregamento. `AppErrorBoundary` captura falhas de renderização e oferece recarregar a aplicação. Esse limite não substitui o tratamento de erro das futuras chamadas HTTP.

`usePageTitle` atualiza o título da aba para ajudar orientação e leitores de tela. O layout leva o foco ao conteúdo e volta ao topo quando o caminho muda; há também um link “Pular para o conteúdo”.

### Rotas

| URL                    | Página    | Comportamento nesta entrega                                                                                     |
| ---------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `/`                    | Dashboard | Indicadores sem valores e estado vazio; explicação expansível do monitoramento.                                 |
| `/login`               | Login     | Formulário visual com validação e mostrar/ocultar senha. Enviar informa que o acesso ainda não está disponível. |
| Qualquer outro caminho | NotFound  | Mensagem de página não encontrada e retorno ao dashboard.                                                       |

O formulário não faz requisição, autentica, guarda credenciais ou cria token. Sua mensagem prévia deixa a indisponibilidade clara. A #15 deverá conectar o envio ao contrato `username`/`password`, tratar HTTP 401, sessão e proteção de configuração. Não há cadastro ou recuperação de senha previstos no contrato atual.

O dashboard oferece agora uma [demonstração opcional com gráficos e dados fictícios](frontend-demo.md), acessível por `/?demo=1`. O aviso de demonstração e a data simulada distinguem essa prévia do monitoramento real.

No modo padrão, o dashboard não consulta os endpoints que ainda estão em implementação. “—” significa **dado indisponível**, não zero. Não se inventou período nem horário da última coleta. As imagens com dados mockados orientaram a hierarquia e a paleta; a prévia implementada permite avaliar os gráficos, sem representar uma integração entregue. #7/#8 implementarão os totais e a lista reais; histórico, ranking e comparação continuam em suas próprias issues.

## Estrutura e responsabilidades

```text
src/
  components/
    common/       Icon, Brand, MetricCard, FeedbackPanel, AppErrorBoundary
    layout/       AppLayout
  hooks/          usePageTitle
  pages/          Dashboard, Login, NotFound
  services/       api.ts (base HTTP da parte 1)
  App.tsx         rotas e carregamento das páginas
  main.tsx        montagem do React e BrowserRouter
  index.css       tokens, componentes e regras responsivas
```

Cada página organiza seu conteúdo. Componentes comuns recebem propriedades tipadas e podem ser reutilizados. O CSS usa variáveis de cor, espaçamento e foco, evitando valores de marca espalhados. `FeedbackPanel` oferece vazio, carregamento e erro, com texto além da cor. Não há contexto artificial: ainda não existe sessão ou dado compartilhado que o justifique. O `BrowserRouter` já fornece o contexto de navegação.

## Executar e verificar

Na pasta `frontend/`, use Node 24 e npm 11:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abra http://localhost:5173. Para os testes:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Os testes de navegador iniciam um servidor de preview do build na porta 4173, sem backend. Execute `build` antes de `test:e2e`. Os testes HTTP da parte 1 continuam separados em `npm.cmd test`. Para testar também o desenvolvimento, use `npm.cmd run test:e2e:dev`; ele inicia o Vite na porta 5173. Feche servidores já usando essas portas antes desses testes.

O provedor de produção deverá servir `index.html` para caminhos da SPA, como `/login`, preservando o encaminhamento de `/api`. Vite e preview já oferecem o fallback; isso não configura Nginx ou o Compose oficial.

## Rubrica e limites da evidência

- **DW01:** React/TypeScript usados efetivamente nas páginas.
- **DW05:** organização de páginas, componentes, hook e serviço HTTP. O consumo funcional da API e o estado compartilhado de domínio ainda dependem das próximas entregas; não declarar atendimento completo desse critério.
- **TP01/TP03:** responsabilidades coesas e TypeScript estrito; sem abstrações artificiais ou `any`.
- **IHC02:** fluxo e telas base documentados. A aprovação no Figma e a versão do protótipo da #23 ainda precisam ser registradas pelo time.
- **IHC03/IHC04:** unidades e indisponibilidade explícitas, feedback, teclado e layout responsivo. Estados dos serviços e datas reais serão verificados quando houver integração.
- **GA08:** comandos e limites de execução registrados. Testes com usuários (IHC05/IHC06) permanecem previstos para a Sprint 3.

A verificação local não substitui teste com usuários, revisão por outro integrante, aprovação do protótipo ou execução no Compose oficial. Não fechar #25 automaticamente com esta alteração.

## Git desta implementação

```powershell
git status --short --branch
git pull --ff-only origin develop
git switch -c feat/25-frontend-layout
```

O trabalho foi iniciado na `develop` limpa. Em 08/10/2026, o PO autorizou a integração direta na `develop`. Esta publicação não registra PR ou revisão por outro integrante. A entrega preserva o backend e o Compose.

## Evidências da verificação local — 08/10/2026

- `npm.cmd run build`, `lint` e `format:check`: passaram.
- `npm.cmd test`: 7 testes HTTP passaram.
- `npm.cmd run test:e2e`: 18 testes passaram no build servido pelo preview, incluindo a demonstração.
- `npm.cmd run test:e2e:dev`: 14 testes da versão base passaram no Vite de desenvolvimento, antes da inclusão da demonstração.
- Testes executados em Chromium, com projetos desktop (1440 × 1000) e celular (390 × 844). Verificação de overflow também em 360 e 768 px.
- Axe: nenhuma violação nas regras WCAG A/AA executadas nas três páginas. Isso cobre verificações automatizáveis, não certifica conformidade completa.
- Falha de carregamento simulada pelo teste, com mensagem acessível e recuperação por recarregamento. O login foi verificado sem requisições POST, chamadas `/api` ou persistência em storage.
- Revisão visual das capturas de desktop e celular. Não houve avaliação com usuários nesta task.

### Capturas da versão implementada

| Tela       | Desktop                                                | Celular                                               |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Dashboard  | [Imagem](evidencias/frontend-25/dashboard-desktop.png) | [Imagem](evidencias/frontend-25/dashboard-mobile.png) |
| Login      | [Imagem](evidencias/frontend-25/login-desktop.png)     | [Imagem](evidencias/frontend-25/login-mobile.png)     |
| Página 404 | [Imagem](evidencias/frontend-25/404-desktop.png)       | [Imagem](evidencias/frontend-25/404-mobile.png)       |

As capturas registram a versão base desta task, sem métricas reais ou autenticação funcional. Atualize as imagens quando a interface evoluir.
