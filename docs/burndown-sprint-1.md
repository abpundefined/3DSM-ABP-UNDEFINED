# Preparação do burndown — Sprint 1

## O que já está preparado

Baseline de **13 itens e 60 SP**, com IDs, pontos, responsáveis, situação observada, recomendação técnica e pendências em [escopo.csv](metricas/sprint-1/escopo.csv). Os épicos são agrupadores e não acrescentam pontos.

Ainda não foi gerado um gráfico. Faltam confirmar a data real de início, o horário de corte e os registros de aceite. O primeiro commit do repositório não será usado como início da sprint sem confirmação do planejamento.

| Arquivo | Finalidade |
| --- | --- |
| [periodo.json](metricas/sprint-1/periodo.json) | Período, fuso e decisões pendentes sobre calendário/corte. |
| [escopo.csv](metricas/sprint-1/escopo.csv) | Baseline e snapshot de acompanhamento dos 13 itens. |
| [aceites.csv](metricas/sprint-1/aceites.csv) | Ledger de aceites completos e eventuais reaberturas, com autor e evidência. Começa sem eventos. |
| [alteracoes-escopo.csv](metricas/sprint-1/alteracoes-escopo.csv) | Mudanças justificadas de escopo, sem reescrever a baseline. Começa sem eventos. |

Os arquivos são dados de planejamento; não alteram a aplicação. Não há tarefa de extração automática ou integração com CI implementada nesta etapa.

## Regra de contagem

- **In progress/In review:** o item conserva todos os seus pontos restantes.
- **Done:** baixa todos os pontos após cumprir critérios e DoD, com aceite verificável. Não usar percentuais subjetivos de conclusão.
- **PR integrado:** evidência de implementação, sem equivaler automaticamente a aceite.
- **Reabertura:** devolve os pontos a partir da data do evento registrado.
- **Mudança de escopo:** registra adição/remoção, motivo e autorização; não apaga a versão inicial.

O snapshot de 19/10 não contém aceites comprovados; isso não significa ausência de trabalho implementado. O ledger vazio não deve ser apresentado como uma série histórica de produtividade zero. A recomendação técnica também não muda sozinha o estado do Kanban.

## Atualização diária simples

1. O responsável apresenta implementação, testes e PR/evidência.
2. Outro integrante registra a revisão e o PO registra o aceite ou a pendência.
3. O SM atualiza a issue e o Projects. Se houver aceite, adiciona uma linha em `aceites.csv` com o timestamp real e a evidência.
4. O SM registra mudanças autorizadas em `alteracoes-escopo.csv`, se ocorrerem.
5. Na geração posterior, somar os eventos até o horário de corte de cada dia para obter os pontos restantes.

`aceites.csv` usa as colunas `issue,evento,ocorrido_em,responsavel,evidencia`. Os eventos permitidos são `aceite` e `reabertura`; usar timestamp ISO com fuso, por exemplo `2026-10-19T18:00:00-03:00`, e URL/arquivo versionado como evidência. O exemplo de timestamp é somente formato e não um aceite ocorrido. Uma reabertura deve se referir a um aceite anterior; um segundo aceite após a reabertura não pode contar duas vezes.

`alteracoes-escopo.csv` usa `ocorrido_em,issue,variacao_sp,autorizado_por,motivo,evidencia`. Acréscimo é positivo e retirada é negativa. Nenhuma alteração foi registrada nesta preparação.

## Construção do gráfico na próxima etapa

Eixo X: datas do período confirmado. Eixo Y: pontos restantes. Duas linhas:

- **Ideal:** começa em 60 no início confirmado e chega a zero no fim previsto, usando o calendário acordado (dias corridos ou úteis).
- **Real:** baseline mais variações de escopo, menos pontos com aceite válido até cada corte. Reaberturas devolvem pontos.

Para um período sem mudanças e com D intervalos de calendário, no intervalo t:

```text
ideal(t) = 60 × (1 − t / D)
real(t) = 60 + variações acumuladas de escopo − pontos com aceite válido no corte
```

Mostrar somente dias já ocorridos para a linha real. Dias históricos sem registros suficientes devem ser identificados como sem evidência; não interpolar como se fossem medições nem usar a data do merge como aceite. Se a documentação comprovar aceites anteriores, registrá-los com fonte e data do evento, distinguindo a data em que o registro foi consolidado.

O gráfico futuro deverá ser publicado com os CSVs e a data de atualização, ligado ao README. Se o escopo mudar, manter a linha ideal original e explicar a mudança; uma previsão revisada pode ser apresentada separadamente.

## Informações que o PO/SM precisam confirmar

- Data real de início da Sprint 1.
- Horário de fechamento para a entrega de 20/10/2026 e calendário adotado.
- Aceites já ocorridos: issue, data, revisor/PO e evidência.
- Caso o Projects continue sem acesso para edição: integrante autorizado para aplicar a [tabela de sincronização](sprints/revisao-sprint-1.md).

As tarefas #18 e #23 mencionam mais de uma fase/sprint. Não duplicar seus pontos em outro ciclo nem repartir retroativamente os 60 SP para fabricar conclusão; qualquer refinamento precisa de registro do PO.
