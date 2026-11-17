# Evidências — #101 / P01, P03 e P07

> **Registro histórico preservado na integração de 16/11/2026.** As dez imagens desta pasta pertencem à implementação original `ad6e662`, anterior ao PR #177. Os hashes e resultados abaixo descrevem aquela versão. Na branch `fix/101-p01-p03-p07-integrado`, os conflitos foram resolvidos mantendo o painel e os formatadores compartilhados do PR #177. Consulte o [registro da versão atualizada](../issue-101-2026-11-16/README.md) para as dez capturas adicionais e a validação atual; a formatação antiga não representa a regra final integrada.

Registro em **15/11/2026**, horário de Brasília. Branch: `fix/101-p01-p03-p07`.

## Versão e rastreabilidade

- **Antes:** commit `70551fc39b8e233152d56d5eb321e22c9bb8cb47`, com o PR #173 integrado e sem modificações no frontend.
- **Depois:** mesmo commit-base acrescido das mudanças de P01/P03/P07 que acompanham estas imagens neste commit. Os hashes dos arquivos de implementação estão no fim deste registro para identificar exatamente o código capturado antes do commit local.
- As imagens são capturas reais de `http://localhost:5173`, com React/Vite, API NestJS e PostgreSQL locais em Docker. Não foram editadas para criar mensagens, nem produzidas a partir dos mocks dos testes.
- Dados e horários podem variar porque o monitoramento continua coletando. Os totais do dashboard representam o período, enquanto cards e painel lateral apresentam a coleta do serviço. Não se espera que esses valores sejam iguais.
- Desktop: viewport 1440 × 1200; celular simulado: 375 × 812. Escala de imagem 2: PNGs de 2880 × 2400 e 750 × 1624, respectivamente. Navegador: Chrome local controlado por Playwright 1.64.0.

## Capturas comparativas

| Cenário | Antes | Depois | Evidência |
| --- | --- | --- | --- |
| P03 — indicadores | [Antes](antes-P03-indicadores.png) | [Depois](depois-P03-indicadores.png) | Unidades junto aos valores e uso de Wh/gCO₂e para os dados pequenos retornados pela API local. |
| P03 — painel lateral | [Antes](antes-P03-painel-lateral.png) | [Depois](depois-P03-painel-lateral.png) | Painel do PR #173 preservado e usando a mesma regra de apresentação dos cards e indicadores. |
| P01/P07 — falha após carga, desktop | [Antes](antes-P01-P07-falha-desktop.png) | [Depois](depois-P01-P07-falha-desktop.png) | Antes: título de conexão contraditório, alertas extensos e indicadores removidos. Depois: aviso de indisponibilidade, um alerta com orientação e dados anteriores preservados. |
| P01/P07 — falha após carga, mobile escuro | [Antes](antes-P01-P07-falha-mobile-escuro.png) | [Depois](depois-P01-P07-falha-mobile-escuro.png) | Texto real de indisponibilidade em largura de 375 px e tema escuro. A página pode ser rolada para acessar conteúdo e ações abaixo da área visível. |
| P01 — primeiro acesso sem backend | [Antes](antes-P01-primeiro-acesso-sem-backend.png) | [Depois](depois-P01-primeiro-acesso-sem-backend.png) | Depois: informa que ainda não há dados válidos, sem afirmar que há dados anteriores. |

## Procedimento real de captura

1. Com os três containers ativos, abrir o dashboard e aguardar os cards reais e indicadores.
2. Capturar os indicadores; abrir um card, capturar o painel lateral e fechá-lo com Esc.
3. Parar **somente o backend local**, executar “Atualizar agora” e aguardar a conclusão da consulta. Capturar o erro em desktop e depois em mobile com tema escuro.
4. Recarregar o dashboard com o backend parado para representar o primeiro acesso sem cache de dados do componente.
5. Reiniciar o backend, aguardar a API e atualizar novamente. O retorno dos serviços foi confirmado e o ambiente ficou em execução.

Nenhuma credencial ou token foi usado nas capturas. As imagens anteriores da avaliação de 13/11 em `../frontend-25/` foram preservadas. As novas capturas de antes correspondem à versão atualizada de 15/11, para comparar também o painel lateral do PR #173.

## Implementação

- Cada consulta de serviços, indicadores e configuração informa sucesso/falha separadamente. O painel só declara indisponibilidade geral quando todas falham; quando alguma responde, identifica a falha parcial e o recurso afetado.
- Dados válidos de serviços e indicadores são preservados após uma tentativa malsucedida no mesmo período. A mudança de período mantém o comportamento existente de recriar o painel, evitando carregar totais de outro intervalo.
- O aviso ocupa uma única região `role="alert"`; detalhes HTTP e alertas redundantes foram removidos. A nova tentativa pode ser manual ou pelo ciclo automático de 30 segundos.
- `formatServiceMetricParts` é a regra central estendida de `serviceDetail.ts`; `formatServiceMetric` continua como a interface de texto usada pelos cards e pelo painel lateral. Não foi criado um formatador concorrente.
- Energia abaixo de 1 kWh positivo é apresentada em Wh; emissões positivas abaixo de 1000 g são apresentadas em gCO₂e, e a partir de 1000 g em kgCO₂e. Zero real continua sendo zero. A API continua retornando energia em kWh e emissões em gCO₂e, sem alteração de cálculo, coleta ou contrato.
- Abaixo da precisão de quatro casas da unidade menor, a notação científica evita representar uma leitura positiva como zero. Nulos, inexistentes, strings inválidas e não finitos permanecem como `—`.

## Verificações executadas

Os quatro comandos obrigatórios foram executados em `/app` no container `projeto-greener-undefined-frontend-1`, com **Node 24.21.0** e as dependências do lockfile do projeto:

| Comando / verificação | Resultado |
| --- | --- |
| `npm run lint` | Aprovado, sem avisos do ESLint. |
| `npm run format:check` | Aprovado, todos os arquivos correspondentes formatados. |
| `npm test` | 95 testes aprovados, zero falhas, incluindo quatro testes novos do formatador. |
| `npm run build` | Aprovado: TypeScript e Vite. Aviso não impeditivo sobre chunks acima de 500 kB; otimização de bundles não faz parte desta correção. |
| Playwright, seleção de oito arquivos relacionados em desktop e mobile | 105 aprovados, zero falhas, um ignorado: o teste de barra inferior é exclusivo de celular e é ignorado no projeto desktop. |
| Axe nos testes selecionados | Sem violações nas regras executadas (`wcag2a`, `wcag2aa`, `wcag21aa`), incluindo estado normal, falhas, recuperação e painel lateral em temas claro e escuro. |

Seleção E2E: `dashboard-api.spec.ts`, `dashboard-usability.spec.ts`, `service-drawer.spec.ts`, `tema-escuro.spec.ts`, `period.spec.ts`, `demo.spec.ts`, `navigation.spec.ts` e `pages.spec.ts`.

O Playwright e o Axe foram executados no Windows com o Chrome instalado, usando cópias idênticas desses testes em um runtime temporário e uma configuração temporária com `baseURL=http://localhost:5173`, dois workers e viewports 1440 × 1000 / 375 × 812. Isso evitou instalar dependências no repositório ou iniciar outro Vite na mesma porta. O build foi verificado separadamente; essa execução E2E foi contra o servidor de desenvolvimento, não contra `vite preview`.

Houve uma tentativa inicial de E2E interrompida: o Vite ainda entregava módulos antigos apesar dos arquivos atualizados no bind mount. A diferença entre fonte e módulo servido foi confirmada, o frontend foi reiniciado e a execução completa acima ocorreu após conferir o módulo novo. Não se contabiliza a tentativa interrompida como aprovação.

Nos testes automatizados, respostas controladas da API permitem verificar falha parcial, recuperação automática, valores minúsculos, resposta inválida e preservação do foco do painel lateral. Essas respostas são fixtures de testes, não dados usados nas capturas reais.

Para repetir no ambiente padrão com as dependências e o navegador Playwright instalados, na pasta `frontend`:

```powershell
npm.cmd run test:e2e -- tests/e2e/dashboard-api.spec.ts tests/e2e/dashboard-usability.spec.ts tests/e2e/service-drawer.spec.ts tests/e2e/tema-escuro.spec.ts tests/e2e/period.spec.ts tests/e2e/demo.spec.ts tests/e2e/navigation.spec.ts tests/e2e/pages.spec.ts
```

Esse comando padrão faz build e usa o preview/configuração do repositório; a configuração mobile padrão é 390 × 844, diferente dos 375 × 812 utilizados nesta verificação adicional.

## Limitações e próximos passos

- Revisão visual e aceite pela equipe, teclado/leitor de tela manual e aparelho físico continuam recomendados. Axe não comprova acessibilidade completa.
- Não foram executadas as suítes completas de mapa e administração nem testes de backend; não houve modificação desses módulos. A abertura das rotas pelos testes existentes não significa aceite funcional das páginas novas ou realização da Rodada 2 de IHC.
- P02, P04, P05, P06 e P08 e demais critérios da #101 não foram implementados nesta entrega. Testes com usuários e SUS não foram executados.
- O stash anterior de IHC foi mantido intacto. Não há alteração em API, banco, coleta, dependências ou lockfile.
- Push, publicação do PR e merge aguardam revisão do usuário. Referência de acompanhamento: **Refs #101**, sem fechamento automático da issue.

## Hashes SHA-256 do código capturado depois

Os arquivos abaixo são os cinco arquivos de implementação desta entrega; os hashes identificam a versão usada nas capturas de depois.

| Arquivo | SHA-256 |
| --- | --- |
| frontend/src/components/dashboard/LiveDashboard.tsx | 1a9c8947fcb556226111d4196d0dbbdd261062fc2feb550d87d8e1890d85c4f0 |
| frontend/src/components/dashboard/ServiceCard.tsx | 8141510c6cd0904fd62e4eb38c6d3eabb066a94858234d260a44dc60ea4c27a5 |
| frontend/src/components/dashboard/ServiceQuickDrawer.tsx | 8b476c5feca31c3a5c60a5bd17fd9cc85c9382ee69e306af995f47bad9c3f3ba |
| frontend/src/components/dashboard/live.css | 6dec43f2c12367e0c6a3dbf711cf6b1dbc89608ce9737be3716c28405d835d78 |
| frontend/src/utils/serviceDetail.ts | 09e7ba0d7ad5e044d1e1dab231585551dbdf289537b97bcbda3a10da61531958 |
