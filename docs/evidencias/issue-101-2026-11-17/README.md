# #101 — P02 e P06 sobre a develop atual

Registro: **17/11/2026**, horário de Brasília. Branch de entrega: `feat/101-p02-p06-dashboard`.

## Versão avaliada

- **Antes:** `40332d8`, `develop` com o merge do PR #191.
- **Depois:** o mesmo commit acrescido somente dos ajustes de P02 e P06, dos testes e desta documentação.

## Escopo

| Item | Correção desta entrega |
| --- | --- |
| P02 | `ServiceCard` explica por que o card não tem dados: “Sem coleta válida” quando nunca houve coleta, ou “Sem coleta válida no momento” com a data real da última coleta válida quando o serviço não está ativo. Serviço ativo com coleta válida não recebe aviso. |
| P06 | “Ver demonstração” como botão secundário, rótulo de saída “Sair da demonstração”, aviso da demonstração compacto no celular e contador “X ativos de Y monitorados” no topo do dashboard, conectado e em demonstração. |

## Capturas de antes e depois

As imagens foram geradas com o Chrome e o Playwright sobre o build de cada versão (`vite preview`), com **respostas controladas da API** (`page.route`), iguais nos dois lados. Não vêm do backend real. Os dados são fictícios: cinco serviços (dois ativos, um indisponível com coleta de 12/11, um sem métricas sem coleta e um removido).

| Cenário | Antes | Depois |
| --- | --- | --- |
| Dashboard em desktop (cards sem coleta — P02; botão e contador — P06) | [Antes](antes-P02-P06-dashboard-desktop.png) | [Depois](depois-P02-P06-dashboard-desktop.png) |
| Entrada na demonstração, celular — P06 | [Antes](antes-P06-entrada-mobile.png) | [Depois](depois-P06-entrada-mobile.png) |
| Demonstração ativa, celular — P06 | [Antes](antes-P06-demonstracao-mobile.png) | [Depois](depois-P06-demonstracao-mobile.png) |

Desktop: viewport 1440 px de largura, página inteira, escala 1. Celular: viewport 390 × 844, escala 2. O horário exibido em “Última atualização” e o período variam entre as capturas.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Aprovado. |
| `npm run format:check` | Aprovado. |
| `npm test` | 142 testes do Node e 24 do Vitest aprovados, zero falhas. Novos: 6 da regra de coleta e do contador, 4 do `ServiceCard`. |
| `npm run build` | Aprovado, com o aviso de bundles acima de 500 kB que já existia. |
| `npm run test:e2e` | 249 aprovados, 1 ignorado (teste da barra móvel no projeto desktop), zero falhas, em desktop (1440 × 1000) e mobile (390 × 844). 14 testes novos em `dashboard-estado-servicos.spec.ts`; `demo.spec.ts` ajustado ao novo rótulo. |
| Axe | Zero violações (WCAG 2 A/AA e 2.1 AA) no dashboard conectado e na demonstração, nos temas claro e escuro. |

O Axe não substitui avaliação manual de acessibilidade.

## Limitações

- A ergonomia no celular físico e a leitura com leitor de tela seguem pendentes.
- Não existe limite de antiguidade para a coleta; “coleta anterior” significa serviço não ativo com coleta válida registrada.
- P04, P08 e os achados novos do teste com usuários ficam para os outros PRs da #101.
