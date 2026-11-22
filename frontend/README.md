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

| Comando                     | Finalidade                                             |
| --------------------------- | ------------------------------------------------------ |
| `npm.cmd run dev`           | Desenvolvimento com atualização automática             |
| `npm.cmd run build`         | Verificar TypeScript e gerar `dist/`                   |
| `npm.cmd run preview`       | Conferir o build em http://localhost:4173              |
| `npm.cmd run lint`          | Verificar problemas de código                          |
| `npm.cmd run format`        | Aplicar Prettier aos arquivos do frontend              |
| `npm.cmd run format:check`  | Conferir formatação                                    |
| `npm.cmd test`              | Executar testes utilitários e de componentes/hooks     |
| `npm.cmd run test:coverage` | Gerar cobertura dos testes Vitest em `coverage/`       |
| `npm.cmd run test:e2e`      | Gerar o build e testar as páginas em desktop e celular |
| `npm.cmd run test:e2e:dev`  | Testar as páginas em desenvolvimento                   |

Execute `build` antes de `preview`. O comando `test:e2e` gera um build atualizado
automaticamente. Preview é uma conferência local, não a configuração de publicação
da aplicação.

## Páginas e navegação

- `/`: dashboard público conectado ao backend com atualização em tempo real via Server-Sent Events (`EventSource` em `/api/eventos` para eventos `coleta-registrada` e `estado-alterado`, pulso visual no card atualizado respeitando `prefers-reduced-motion: reduce`, reconexão automática e fallback para atualização periódica a cada 30 s), contador de serviços, contador ao vivo de CO₂e (desktop), KPIs consolidados, seletor de período, painel de meta mensal de carbono (com planeta reativo à meta), gráfico de tendência, composição de energia por recurso, cards dos serviços (com anel de CPU `role="meter"`) e resumo das 4 maiores oportunidades de redução.
- `/?demo=1`: modo demonstração com dados fictícios identificados em todas as telas (também ativado permanentemente no build estático do GitHub Pages quando `VITE_DEMO_MODE=true`).
- `/ranking`: ranking de impacto por energia ou emissão, agrupamento por **Serviço**, **Região** ou **País** (`?grupo=regiao` e `?grupo=pais`, somando energia, emissão e coletas por localidade) e modo **Evolução** (`?modo=evolucao`, corrida de barras ao longo do período), além de variação global e participação por região.
- `/comparar`: comparação lado a lado de 2 a 5 serviços no mesmo período.
- `/mapa`: globo interativo (`d3-geo` + `world-atlas`), mapa 2D (`Leaflet` + `MapLibre`), linha do tempo, modo **Simular** (arrasto de marcador entre regiões monitoradas ou alternativa por lista com cálculo imutável e desfazer), intensidade regional e melhor horário (`7×24`). No **Modo TV**, renderiza globo 3D em WebGL com fallback automático para mapa 2D.
- `/oportunidades`: lista de oportunidades estimadas de redução de emissão (`GET /oportunidades`), ordenada pelo ganho em `gCO₂e` e `%`, com filtro por tipo e links para `/servicos/:id`.
- `/servicos/:id`: detalhe do serviço com histórico temporal, linha do tempo de estado, composição de energia, simulador de região e melhor janela horária.
- `/metodologia`: página **Como calculamos** documentando fórmulas, constantes, fontes externas, detecção de picos e limiares de oportunidades.
- `/relatorio`: relatório consolidado do período pronto para impressão (`@media print`).
- `/qr-code`: cartaz imprimível (A4) com QR code vetorial ISO/IEC 18004 apontando para a demonstração online.
- `/login` e `/admin`: autenticação administrativa via JWT e painel de configuração de intervalos, meta mensal de carbono e saúde das integrações.
- **Modo TV (`?tv=1`, desktop ≥ 761 px):** ativado pelo botão **Modo TV** no rodapé; alterna automaticamente entre Dashboard, Mapa (com globo 3D) e Ranking a cada 10 s, exibindo barra fixa inferior com contagem regressiva e QR code da demonstração online.
- Outros endereços: página 404 com retorno ao dashboard.

React Router usa `BrowserRouter` (com `basename={import.meta.env.BASE_URL}`), `Routes`, `Outlet` e carregamento sob demanda (`React.lazy`) com feedback e recuperação de falhas. O rodapé concentra os atalhos **Fazer tour**, **QR Code** e **Modo TV**. O tema claro é o padrão; os botões de lua e sol no cabeçalho alternam entre tema escuro e claro, com preferência persistida no `localStorage`.

### Variáveis de ambiente (proxy e build estático de demonstração)

| Variável               | Padrão                                               | Uso                                                                                               |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `API_PROXY_TARGET`     | `http://localhost:3000`                              | Endereço do backend visto pelo processo Vite (dev/preview)                                        |
| `API_PROXY_REWRITE`    | `true`                                               | Remove prefixo `/api` ao encaminhar para o backend                                                |
| `VITE_DEMO_MODE`       | `false`                                              | Quando `true`, ativa modo demo estático, bloqueia chamadas `/api` e gera `404.html` + `.nojekyll` |
| `VITE_BASE_PATH`       | `/`                                                  | Base path para publicação em subcaminho (ex.: `/3DSM-ABP-UNDEFINED/` no GitHub Pages)             |
| `VITE_PUBLIC_DEMO_URL` | `https://abpundefined.github.io/3DSM-ABP-UNDEFINED/` | URL pública codificada no QR code do Modo TV e da página `/qr-code`                               |

## Backend e proxy

O serviço `src/services/api.ts` chama caminhos relativos em `/api`.
O Vite encaminha essas chamadas para `http://localhost:3000`, removendo o
prefixo `/api` por padrão. O dashboard consulta `/servicos`, `/indicadores` e a coleta válida mais recente
de cada serviço em `/coletas/servico/:id/ultima-valida`.
Os indicadores e a lista são carregados independentemente: se os indicadores
falharem, os cartões exibem `—` com aviso e a lista continua disponível. O
resumo também informa quantos serviços estão sem métricas ou foram removidos.
O mesmo proxy está configurado para desenvolvimento e preview.

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

No Docker Compose, o serviço frontend recebe
`API_PROXY_TARGET=http://backend:3000`: o Vite acessa o backend pelo nome do
serviço na rede dos containers. O Dockerfile inicia o Vite com
`--host 0.0.0.0`, e o frontend fica disponível em http://localhost:5173.
Assim, `/api/servicos` é encaminhado para `http://backend:3000/servicos`.
Fora do Docker, o destino padrão continua sendo `http://localhost:3000`.

## Mapa de emissões

A página `/mapa` abre num globo (d3-geo e `world-atlas`, com fronteiras dos
países). Ele gira devagar sozinho e pode ser pausado; arrastar, as setas, a roda
do mouse e os botões + e − giram e aproximam. Aproximar até o fim ou clicar num
ponto entra no mapa (Leaflet com agrupamento de marcadores); afastar no zoom
mínimo volta ao globo. O tamanho e a cor dos pontos seguem a emissão (área
proporcional, 5 faixas com contraste validado), explicados na legenda.

- **URL:** `?visao=mapa` e `?regiao=<código>` ficam na URL junto com o período,
  para recarregar ou compartilhar a mesma tela. `?demo=1` usa dados fictícios.
- **Linha do tempo:** reproduz a `serie` intervalo a intervalo, com escala fixa
  durante a reprodução. Só começa quando a pessoa aperta Reproduzir.
- **Acessibilidade:** com "reduzir movimento" no sistema, não há rotação, inércia
  nem animações. O globo funciona pelo teclado, e a tabela "Ver os dados do mapa
  em tabela" traz os mesmos dados.
- **Fundo do mapa:** tiles vetoriais do [OpenFreeMap](https://openfreemap.org)
  (estilo claro, gratuito e sem chave), desenhados com MapLibre e com os nomes
  em português (`name:pt`). O MapLibre só é baixado ao abrir a visão de mapa
  (cerca de 290 KB comprimidos, mais 150 KB do worker). Sem WebGL ou com o
  OpenFreeMap fora do ar, o mapa usa as imagens do OpenStreetMap, com os nomes
  no idioma local. A atribuição aparece no canto do mapa.
- **Testes:** `tests/e2e/mapa.spec.ts` simula o `GET /mapa` e o estilo do mapa,
  sem depender da rede.

## Serviço HTTP

`apiRequest<T>(path, options)` usa fetch, preserva headers/opções e retorna
JSON ou `undefined` para HTTP 204/205. Caminhos começam com `/`, como
`/services`; URLs externas não são aceitas.

Falhas HTTP lançam `ApiError`, com o status e uma mensagem genérica.
Falhas de rede, cancelamento e JSON inválido são propagados para a tela
tratar. O tipo `T` ajuda no TypeScript, mas não valida o JSON em execução.
Para enviar JSON, informe `Content-Type` e serialize o corpo explicitamente.

## Testes de componentes e hooks

`npm.cmd test` executa os testes existentes com Node e os testes React com
Vitest e Testing Library. Para gerar o relatório de cobertura localmente, rode
`npm.cmd run test:coverage`; o CI publica `frontend-coverage` como artefato.
Os testes do ranking cobrem carregamento, dados, estados vazios, erro com nova
tentativa, troca de métrica e demonstração sem acessar a API. A comparação
ainda é uma página em construção; o teste verifica o aviso atual.

## Comparação com o período anterior

Dashboard e ranking mostram a variação percentual de energia e emissão
recebida do backend, por exemplo, **▲ 12% em relação aos 7 dias anteriores**.
Aumento usa estilo de alerta; redução usa estilo de melhoria, sempre com
seta e texto, não apenas cor. `null` aparece como **sem base de comparação**,
inclusive quando o total anterior é zero. A duração exibida vem do período
efetivamente retornado pela API, inclusive em intervalos personalizados.

No ranking, **Variação por serviço** mostra emissão atual, anterior, diferença
e percentual para todos os serviços com dados em qualquer janela, não apenas
o top 10. Clique no cabeçalho de qualquer coluna para alternar a ordenação;
valores ausentes ficam ao final. Sem emissão no período atual, com ou sem
impacto registrado, o valor permanece `null`: a tabela mostra `—` na emissão e
na diferença e **sem dados no período atual** no percentual. Um zero medido
pode produzir uma redução de -100%. Os totais exibidos no dashboard mantêm
zero por compatibilidade quando não há dados, mas a variação vem `null`.
A tabela permanece disponível quando só há dados na janela anterior.
As comparações não são inventadas para respostas antigas da API: os blocos
só aparecem quando os novos campos estão presentes. Na demonstração, não há
dados anteriores e a base é indicada como ausente.

Testes focados: `npx.cmd vitest run tests/unit/variacao-periodo.test.tsx tests/unit/dashboard-variacao.test.tsx tests/unit/analises-pages.test.tsx`.

## Testes de navegador

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run test:e2e:dev
```

Playwright testa Chromium em desktop e celular: navegação, foco, acesso direto,
refresh, formulário, carregamento e falha. Axe verifica problemas automatizáveis
de acessibilidade. Esses testes não substituem testes com usuários.
`test:e2e` gera o build e inicia o preview na porta 4173; `test:e2e:dev` inicia o
Vite na 5173. As portas devem estar livres. Capturas e traces (`trace: 'retain-on-failure'`) ficam em
`test-results/` (ignorado pelo Git e publicado como artefato pelo job `frontend-e2e` do CI em caso de falha).

Em produção, o servidor deve oferecer fallback de URLs da SPA para `index.html`,
sem interceptar `/api`. Isso será coordenado com a configuração de publicação/Compose.

## Validação e pendências

Em 08/10/2026: build, lint, formatação, 7 testes HTTP e 18 testes de navegador
no preview passaram. A base das páginas também foi verificada com 14 testes em desenvolvimento. As páginas foram verificadas
em 360, 390, 768 e 1440 px quanto a overflow, e as capturas de desktop e celular
foram revisadas. Axe não encontrou violações nas regras executadas nas três páginas.

O proxy foi verificado na parte 1 com servidor HTTP temporário, em sucesso,
erro e backend indisponível. Em 18/10/2026, a integração pelo Compose com
NestJS/PostgreSQL reais também passou: a página inicial respondeu HTTP 200,
e `/api/servicos` retornou HTTP 200 com os mesmos 8 serviços consultados no banco.
O build e os 7 testes HTTP passaram. O Vite iniciou com `--host 0.0.0.0`,
sem erros de proxy nos logs das requisições verificadas.

O destino local padrão e a reescrita também foram conferidos com um Vite e um
backend temporários, sem `API_PROXY_TARGET`, dentro do container. A execução
nativa no Windows não foi repetida: o host tem Node 22, enquanto o frontend
documenta Node 24, e não há dependências do frontend instaladas no host.
A aprovação no Figma e a revisão por outro integrante permanecem pendentes.

Leia também [o guia da base técnica para iniciantes](../docs/frontend-setup.md).

Leia [o guia do modo de demonstração](../docs/frontend-demo.md).
