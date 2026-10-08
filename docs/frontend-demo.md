# Dashboard com dados fictícios — prévia visual

Adicionado a pedido do PO para avaliar como os gráficos ficam sobre a interface base da #25.

## Abrir a demonstração

Com o frontend em execução, acesse **http://localhost:5173/?demo=1** ou clique em **Ver demonstração** no dashboard. **Voltar ao estado vazio** retorna ao painel inicial. O parâmetro da URL preserva o modo ao atualizar ou compartilhar o endereço local; não é gravado em storage.

O aviso **Modo demonstração · Dados fictícios** permanece acima dos indicadores. Datas, status e valores são exemplos, identificados como simulados. O modo padrão `/` continua sem valores até a integração real.

## Decisões de design

- Mantida a paleta do PO e a hierarquia das imagens de referência: totais → evolução e disponibilidade → lista e ranking.
- Gráfico de área para energia/emissões diárias; rosca para a distribuição de status; barras horizontais para os cinco maiores impactos.
- Verde domina os dados ambientais; dourado identifica indisponibilidade e roxo identifica ausência de métricas. Ícones e textos acompanham as cores.
- Controles com resultados concretos: alternar o indicador, consultar valores em tabela, ordenar o ranking, buscar serviços, filtrar status e limpar uma busca sem resultados.
- Pontos do gráfico podem ser explorados com mouse, toque ou foco por teclado. Uma tabela de valores oferece alternativa textual.
- Layout empilhado no celular; a tabela de serviços permite rolagem horizontal dentro da própria região, sem alargar a página.

Aplicado o mesmo contrato da skill Uizze e as referências já revisadas na parte 2. Não houve envio de código ou dados ao Uizze.

## Dados e coerência

`src/mocks/dashboard.ts` contém todas as fixtures. São 12 serviços: 10 ativos, 1 indisponível e 1 sem métricas. Os totais de 07/10/2026 são derivados da mesma lista usada na tabela e no ranking:

- Energia: **14,85 kWh**.
- Emissões: **1,26 kgCO₂e**.
- Histórico: 01 a 07/10/2026, totalizando **94,65 kWh** e **7,96 kgCO₂e**.
- Último dia do gráfico coincide com os totais dos serviços.

Valores ausentes são `null` e aparecem como **—**, sem se transformar em métricas zero. A soma inclui apenas valores disponíveis; os exemplos não afirmam que um serviço indisponível deixou de consumir recursos. Os percentuais de CPU, GB de memória e fatores ambientais são ilustrativos, não resultados do contrato da API ou do motor de cálculo. A integração real deverá fazer a conversão e validação das unidades necessárias.

## Arquitetura

- `Dashboard.tsx` lê `?demo=1`, mostra o aviso e alterna `DashboardEmpty`/`DashboardDemo`.
- `MetricCard` aceita valor opcional; sem valor conserva o traço do estado vazio, e valores usam formatação brasileira.
- `components/charts/` concentra evolução, status e ranking; cada gráfico recebe dados por propriedades.
- `DemoServicesTable` concentra busca e filtro locais. Seus filtros não alteram os totais ou os gráficos gerais.
- `types/dashboard.ts` descreve os dados de apresentação. Não é um DTO do backend.
- `demo.css` complementa os tokens existentes. Os gráficos usam SVG/CSS, sem adicionar uma biblioteca de gráficos.

Não há chamadas a `/api`, polling, persistência ou autenticação neste modo. Ele não representa entrega das funcionalidades reais de dashboard, histórico, ranking ou comparação.

## Verificação

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run test:e2e
```

`tests/e2e/demo.spec.ts` verifica alternância de modos, recarga, indicadores, mudança do gráfico e ranking, valores textuais, filtros, ausência de chamadas à API, acessibilidade automatizada e largura em 360/390/768/1440 px.

Em 08/10/2026: build, lint, formatação, 7 testes HTTP e 18 testes de navegador do preview passaram. Axe não identificou violações nas regras WCAG A/AA executadas no modo demonstrativo. As capturas de desktop e celular foram revisadas.

- [Demonstração em desktop](evidencias/frontend-25/demo-desktop.png).
- [Demonstração em celular](evidencias/frontend-25/demo-mobile.png).

Os relatórios gerados por Playwright são ignorados por Git, ESLint e Prettier. Isso evita que a limpeza desses relatórios durante um teste interfira na verificação do código-fonte.

O servidor local de desenvolvimento permaneceu disponível em `http://localhost:5173/?demo=1`. A alteração foi feita na branch `feat/25-frontend-layout`, com integração na develop autorizada pelo PO em 08/10/2026.
