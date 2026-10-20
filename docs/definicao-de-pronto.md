# Definição de Pronto — GreenER

## Regra de aceite

Um item só é **Done** quando atende aos critérios da issue, tem evidências pertinentes de teste/homologação, foi revisado por outro integrante e recebeu aceite verificável do PO. Um PR integrado ou um checklist de implementação marcado não é, isoladamente, um aceite.

Esta revisão documental alinha a descrição do fluxo ao uso de `develop` pelo time. Não retira requisitos de qualidade nem declara aceites retroativos. Na versão anterior o texto mencionava branches/merge na `main`; a versão avaliada ao final da sprint continua precisando de uma tag que identifique exatamente a entrega.

## Situações de trabalho

| Situação | Quando usar |
| --- | --- |
| Backlog / Sprint Backlog | Item planejado, ainda sem implementação iniciada ou selecionado para a sprint. |
| In progress | Implementação, correção de defeito ou produção de evidência ainda incompleta. |
| In review | Implementação disponível para revisão/homologação; aceite final ainda pendente. Se a revisão identificar correção necessária, registrar e devolver para In progress. |
| Done | Critérios e checklist aplicáveis abaixo verificados, com registro de aceite. |

O responsável mantém a issue; o revisor registra resultados; o PO decide o aceite; o SM mantém quadro e métricas sincronizados. A [revisão de 19/10](sprints/revisao-sprint-1.md) não substitui aprovação de outro integrante.

## Checklist aplicável ao item

### Código e funcionamento

- [ ] Critérios da issue implementados e verificados na versão entregue.
- [ ] Builds e verificações de tipos passam; `any` em contratos tem justificativa ou é substituído por tipos adequados.
- [ ] Responsabilidades e dependências coerentes, sem duplicação relevante de regras nem código morto pertinente.
- [ ] Entradas e falhas tratadas; valores desconhecidos/antigos não são apresentados como valores atuais confirmados.
- [ ] Checks de lint/formatação pertinentes passam; limitações ou exceções aceitas precisam de justificativa explícita, sem ocultar falhas.

### Testes e homologação

- [ ] Regras centrais alteradas têm testes executáveis, incluindo dados ausentes/falhas quando pertinentes, e passam.
- [ ] Não há regressão do comportamento entregue anteriormente.
- [ ] A funcionalidade foi verificada no Compose oficial, quando envolve a aplicação, com versão, responsável, resultado e evidência registrados.
- [ ] Está claro o que foi testado com fixtures/doubles e o que foi verificado com PostgreSQL/serviços reais.

Um item exclusivamente documental não exige inventar um teste de aplicação: revisar os comandos/links e a correspondência com o código. A exceção de escopo não dispensa a homologação de funcionalidades que o documento declara operacionais.

### Interface, quando aplicável

- [ ] Fluxo/tela corresponde ao protótipo aprovado, com versão identificável.
- [ ] Há feedback para carregamento, vazio, erro e indisponibilidade pertinentes.
- [ ] Estados críticos têm texto/ícone, sem depender apenas de cor; unidades/datas são compreensíveis.
- [ ] A interface foi verificada nos tamanhos de tela previstos; evidências foram registradas.

### Git e revisão

- [ ] Branch temática baseada em `develop`, conforme o fluxo utilizado pela equipe.
- [ ] Commits/PR identificam problema, resultado e relação com as issues.
- [ ] Outro integrante revisou e registrou a aprovação e as verificações realizadas.
- [ ] PR integrado em `develop` sem conflitos, com documentação correspondente.
- [ ] PO registrou o aceite do item e sua evidência; issue/quadro e ledger foram atualizados coerentemente.

No fechamento, consolidar a versão conforme o fluxo acordado pelo time e publicar `sprint-1`, `sprint-2` ou `sprint-3`. Não mover uma tag entregue para apontar silenciosamente para outra versão. O link da tag avaliada deve constar no registro da sprint.

### Documentação e rastreabilidade

- [ ] README/API/arquitetura/ambiente atualizados quando o item os afeta.
- [ ] Testes, PR, resultado da homologação e pendências estão vinculados à issue/registro da sprint.
- [ ] Responsáveis e contribuições efetivas estão documentados.

## Registro mínimo do aceite

Registrar na issue, em comentário ou seção de aceite:

```text
Versão/commit:
Critérios verificados:
Testes executados e resultado:
Homologação Compose (quando aplicável):
Revisor e evidência da revisão:
Aceite do PO, data/hora e evidência:
Limitações aceitas e justificativa (se houver):
```

Esse bloco é um modelo, não um aceite realizado. O registro deve conter fatos, links e datas reais. Sem informações suficientes, o item permanece em andamento ou revisão e seus pontos não são baixados no [burndown](burndown-sprint-1.md).
