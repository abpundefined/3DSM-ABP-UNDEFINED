# #101 — P04 e P08

Registro de evidências visuais e automatizadas das melhorias de busca/filtros
na lista conectada e da validação visual dos campos de login.

## Evidências antes e depois

| Item                                    | Antes                                           | Depois                                 |
| --------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| P04 — lista conectada sem busca/filtros | [Antes](../frontend-25/P04-lista-servicos.png)  | [Depois](depois-P04-busca-filtros.png) |
| P08 — validação nativa no login         | [Antes](../frontend-25/P08-validacao-login.png) | [Depois](depois-P08-validacao.png)     |

As capturas de depois foram geradas no Chrome pelo teste Playwright em
desktop. P04 usa uma fixture local de API com serviços em diferentes estados e
valores para reproduzir os cenários de filtro e ordenação. P08 mostra as
mensagens por campo quando os campos obrigatórios estão vazios.

## Comportamentos verificados

- P04: busca por nome sem diferenciar maiúsculas/minúsculas; filtros Todos,
  Ativos, Indisponíveis e Sem métricas; ordenação por emissão, consumo ou nome;
  métricas ausentes permanecem ao final; chips de nome e estado são removíveis.
- P08: envio vazio mostra mensagens por campo, marca os campos inválidos e
  direciona o foco ao primeiro campo; e-mail malformado recebe orientação
  específica; corrigir o valor remove o erro.
- Axe: sem violações nos estados cobertos pelos testes de lista filtrada e
  formulário inválido.

## Validação automatizada

`npm run lint`, `npm run format:check`, `npm test` e `npm run build` aprovados.
Os testes Playwright de `dashboard-api.spec.ts` e `navigation.spec.ts`
passaram nos projetos desktop e mobile (40 testes). O build mantém o aviso
existente sobre o tamanho do bundle vetorial.
