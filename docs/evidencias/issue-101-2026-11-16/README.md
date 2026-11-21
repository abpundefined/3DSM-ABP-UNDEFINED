# #101 — P01, P03 e P07 sobre a develop atual

Registro: **16/11/2026**, horário de Brasília. Branch de entrega: `fix/101-p01-p03-p07-integrado`.

## Versão avaliada

- **Antes:** `3f8559699796c0bb0bdc6af9ae3f1c1f0e882633`, versão da `origin/develop` obtida no início desta atualização, já com PRs #173 e #177 e o simulador de região.
- **Depois:** o mesmo commit-base acrescido somente dos ajustes de P01/P03/P07, testes e documentação desta entrega. Os hashes ao final identificam o código de produção capturado.
- O commit original `ad6e662c418dc5e24c29cfcd45d2d7b1e4a83396` permanece em uma branch local de backup. Ele foi aplicado com `cherry-pick --no-commit` sobre a base atual; os conflitos em `serviceDetail.ts` e `ServiceQuickDrawer.tsx` foram resolvidos preservando integralmente os arquivos do PR #177. O resultado incorpora os ajustes compatíveis preservados em `fe2652e`, também em uma branch local de backup. A branch anterior `fix/101-p01-p03-p07` não foi alterada e o stash de IHC permaneceu intacto.
- As dez imagens originais de `ad6e662` foram preservadas sem alteração em [issue-101](../issue-101/README.md). Elas documentam a versão anterior ao PR #177; as dez imagens desta pasta registram a atualização para a base atual. Os hashes do código de produção abaixo coincidem com a implementação integrada, permitindo reutilizar essas capturas sem atribuir a elas outra versão visual.
- Foram mantidos sem alterações `formatters.ts`, `serviceDetail.ts`, `ServiceQuickDrawer.tsx`, os módulos de backend, o simulador, as dependências e os lockfiles da equipe.

## Escopo e comportamento

| Item | Correção desta entrega |
| --- | --- |
| P01 | Consultas de serviços, indicadores e configuração com estados separados; falha geral diferenciada de parcial. Primeiro acesso sem dados não promete dados anteriores. Após carga bem-sucedida, serviços e indicadores são preservados; nova tentativa pelo botão ou pelo polling recupera a conexão. |
| P03 | Indicadores e cards passam a consumir `formatEnergy` e `formatEmission`, já existentes em `utils/formatters.ts` e usados pelo painel lateral. Não foi criado um segundo formatador ou modificada a política do PR #177. |
| P07 | Um único alerta acessível com descrição curta e orientação para nova tentativa; falha exclusiva dos indicadores não apaga os cards nem os indicadores válidos anteriores. |

A API mantém energia em kWh e emissões em gCO₂e. A regra existente mostra Wh abaixo de 1 kWh, gCO₂e abaixo de 1000 g e kgCO₂e a partir desse limite. Valores positivos abaixo da precisão são representados por `< 0,01 Wh` ou `< 0,01 gCO₂e`, preservando a diferença em relação a zero. Valores inválidos ou ausentes passam pela normalização existente antes dos formatadores e permanecem como `—`. As conversões são apenas de apresentação; não houve alteração de cálculos ou coleta.

O painel lateral conserva o campo único `emissions`, a seção “Última coleta”, a interação por clique/teclado, Esc, foco e link “Ver histórico”. Esta implementação não restaura `emissionsKg`/`emissionsG` nem a apresentação dupla anterior.

## Capturas reais de antes e depois

Todas as imagens foram produzidas pelo Chrome local com Playwright em `http://localhost:5173`, com frontend, API e PostgreSQL do projeto via Docker. Não foram produzidas com respostas simuladas ou mensagens desenhadas artificialmente. As capturas de 13/11 existentes em `../frontend-25/` permanecem preservadas.

| Cenário | Antes | Depois |
| --- | --- | --- |
| Indicadores e unidades — P03 | [Antes](antes-P03-indicadores.png) | [Depois](depois-P03-indicadores.png) |
| Compatibilidade com o painel lateral atual — P03 | [Antes](antes-P03-painel-lateral.png) | [Depois](depois-P03-painel-lateral.png) |
| Falha geral depois de carregar dados, desktop — P01/P07 | [Antes](antes-P01-P07-falha-desktop.png) | [Depois](depois-P01-P07-falha-desktop.png) |
| Falha geral, mobile em tema escuro — P01/P07 | [Antes](antes-P01-P07-falha-mobile-escuro.png) | [Depois](depois-P01-P07-falha-mobile-escuro.png) |
| Primeiro acesso sem backend — P01 | [Antes](antes-P01-primeiro-acesso-sem-backend.png) | [Depois](depois-P01-primeiro-acesso-sem-backend.png) |

Desktop: viewport 1440 × 1200, PNG 2880 × 2400. Mobile: viewport 375 × 812, PNG 750 × 1624. A escala 2 preserva a legibilidade. O monitoramento permaneceu ativo, portanto números e horários podem diferir entre capturas. O painel lateral já usava a regra do PR #177 no antes; sua imagem de depois documenta preservação, não uma nova correção nesse componente.

Procedimento: abrir a aplicação e aguardar os dados reais; capturar os indicadores; abrir e fechar o painel pelo card; parar somente o backend local; tentar atualizar e capturar os erros em desktop e mobile escuro; recarregar sem backend para o primeiro acesso; reiniciar a API e conferir o retorno dos serviços. Nenhuma credencial ou token foi usado nas imagens. O backend foi restaurado após as capturas.

## Testes efetivamente executados

Os comandos obrigatórios foram repetidos na branch integrada em `/app`, no container do frontend, com Node 24.21.0 e dependências do lockfile atual:

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Aprovado. |
| `npm run format:check` | Aprovado, inclusive após a atualização das asserções de regressão. |
| `npm test` | 107 aprovados, zero falhas. Três novos testes verificam compatibilidade com o resumo atual do painel, valores pequenos/zero e normalização de inválidos sem alterar dados de entrada. |
| `npm run build` | Aprovado: TypeScript e Vite; aviso não impeditivo de bundles acima de 500 kB permanece fora do escopo. |
| Playwright, seleção de nove arquivos em desktop e mobile | 119 aprovados, um ignorado (teste da barra móvel no projeto desktop), zero falhas |
| Axe nos cenários selecionados | Zero violações nos estados conectado, falha parcial, falha geral e recuperado, em temas claro/escuro e viewports desktop/mobile, com os critérios WCAG 2 A/AA e 2.1 AA selecionados |

Seleção E2E: `dashboard-api`, `dashboard-usability`, `demo`, `navigation`, `pages`, `period`, `service-drawer`, `simulador` e `tema-escuro`. Foram usados Playwright 1.64.0, Chrome instalado no Windows, dois workers e uma configuração temporária contra o Vite em `localhost:5173`, sem iniciar servidor duplicado. Os testes executados em runtime temporário são cópias idênticas por hash dos arquivos do repositório. Para os fixtures do simulador, foi copiada também a árvore de fontes correspondente. Viewports: 1440 × 1000 e 375 × 812. Build verificado separadamente; esta execução não foi contra `vite preview`.

A primeira execução encontrou quatro falhas, em dois testes rodados nos dois viewports, por expectativas antigas de unidades fixas/zero e quatro casas decimais. As três asserções afetadas foram atualizadas para o padrão compartilhado atual, sem mudar a regra de produção da equipe. A execução final foi repetida com esses testes atualizados; a tentativa anterior não foi contada como aprovação.

As respostas controladas nos testes E2E comprovam queda no primeiro acesso, queda após dados válidos, recuperação automática, falha isolada de indicadores/coleta/configuração, valores mínimos, resposta inválida e compatibilidade do painel. Esses fixtures são separados das capturas reais acima. A execução do simulador é regressão de compatibilidade; não constitui implementação ou aceite de outra tarefa.

## Limitações e revisão

- Revisão da equipe, aparelho físico e leitor de tela manual continuam pendentes. Axe não comprova acessibilidade completa.
- Os demais itens da #101, a Rodada 2 de IHC e os testes com usuários continuam em suas atividades próprias.
- Não foram alterados ou revalidados os cálculos de backend. Não foram executadas as suítes completas de backend, mapa ou administração; a seleção descrita acima é a validação desta entrega.
- Publicação da branch e abertura do PR autorizadas pelo usuário nesta etapa, com solicitação de revisão e sem merge. **Refs #101**, sem fechamento automático da issue.

## Hashes SHA-256 do código de produção capturado

| Arquivo | SHA-256 |
| --- | --- |
| frontend/src/components/dashboard/LiveDashboard.tsx | 062c7549b332e892cf6a9bef34be393ab9b6e2de583221d0695ea61e572738cd |
| frontend/src/components/dashboard/ServiceCard.tsx | 9094973b919fc17625df76ed085ed58ae70cd15b72155e9232570ce29a635336 |
| frontend/src/components/dashboard/live.css | 2784d12f7fb345ce85db6c5e748f7a2679b73d075178d1f0bc492734085d8b63 |
