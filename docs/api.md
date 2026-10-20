# API REST implementada — GreenER

Versão de referência: `0adb1e0`, conferida em 19/10/2026. Esta página descreve o comportamento atual, inclusive suas limitações. Os exemplos são ilustrativos e não representam uma medição real.

## Endereços

- Backend direto: `http://localhost:3000`, sem prefixo global `/api`.
- Pelo frontend: `http://localhost:5173/api`; o Vite remove `/api` antes de encaminhar.
- Exemplo equivalente: `/api/servicos` no Vite → `/servicos` no NestJS.

Não existem, nesta versão, `/api/services`, `/api/docs`, login/JWT, endpoints ambientais ou Swagger. As rotas implementadas são públicas; o acesso publicado pelo Compose está ligado a `127.0.0.1`.

## Endpoints

| Método | Caminho no backend | Sucesso | Função |
| --- | --- | --- | --- |
| GET | `/` | 200, texto | Resposta inicial do template; não verifica banco/API externa. |
| GET | `/servicos` | 200, array | Lista registros persistidos, ordenados por atualização decrescente. |
| POST | `/servicos/sync` | 201, array | Consulta descoberta externa e sincroniza o banco. Não recebe corpo. |
| POST | `/coletas` | 201, objeto | Registra uma coleta pelo DTO. |
| GET | `/coletas` | 200, array | Consulta histórico. |
| GET | `/coletas/:id` | 200, objeto | Detalhe pelo ID inteiro interno; inexistente retorna 404. |
| GET | `/coletas/servico/:servicoId/ultima-valida` | 200, objeto | Última coleta `SUCESSO`; inexistente retorna 404. |

O 201 de `/servicos/sync` é o comportamento atual do decorator POST sem sobrescrita; o contrato pode ser revisado em tarefa própria. Não há paginação implementada nessas listagens.

## Serviços e estados

`GET /servicos` retorna campos do modelo `Servico`: `id`, `idExterno`, `nome`, `regiaoCodigo`, `caminhoMetricas`, `estadoAtual`, `descobertoEm`, `ultimaVezListadoEm` e `atualizadoEm`. Não inclui automaticamente a relação `regiao` nem as coletas.

| Estado | Significado esperado |
| --- | --- |
| `DESCONHECIDO` | Serviço novo ou retornado, aguardando confirmação por coleta. |
| `DISPONIVEL` | Coleta encontrou métricas consideradas válidas. |
| `INDISPONIVEL` | Falha de acesso/coleta. |
| `SEM_METRICAS` | Serviço acessível sem medições válidas. |
| `REMOVIDO` | Não consta na última descoberta válida; histórico permanece armazenado. |

O coletor ainda confunde alguns erros de ausência de métricas com indisponibilidade. Além disso, o normalizador não lê corretamente `location` do contrato oficial; a localização pode ser desconhecida mesmo quando existe na origem. Ver #1 e #5.

## Registrar coleta

Exemplo de `POST /coletas`, usando um `servicoId` existente:

```json
{
  "servicoId": 1,
  "estadoColeta": "SUCESSO",
  "iniciadaEm": "2026-10-19T12:00:00.000Z",
  "intervaloColetaSegundos": 30,
  "cpuPercent": 47.5,
  "memoryGb": 2.75,
  "diskGb": 18.2,
  "networkGb": 0.4
}
```

`servicoId` e `estadoColeta` são obrigatórios. O enum de coleta aceita `SUCESSO`, `SEM_METRICAS` e `FALHA`. Campos adicionais permitidos pelo DTO:

- `regiaoCodigoNaColeta`: código da região, opcional.
- `iniciadaEm`, `finalizadaEm`: datas ISO convertidas pelo DTO; a primeira recebe a data atual se omitida.
- `intervaloColetaSegundos`: intervalo da medição, em segundos.
- `codigoErro`, `mensagemErro`: detalhes de falha.
- `cpuPercent`: percentual; memória, disco e rede em GB, conforme a fonte.
- `intensidadeCarbonoGCo2ePorKwh`, `energiaKwh`, `emissaoGCo2e`: campos ambientais opcionais; não são calculados automaticamente nesta versão.

Há validação de tipos/enum/datas e rejeição de propriedades desconhecidas nas rotas de coletas. Ainda faltam limites de faixa, IDs inteiros positivos e validação de coerência temporal. Não considerar validado um valor apenas porque o endpoint o aceitou.

O service manual pode reclassificar um payload com zeros ou sem CPU como `SEM_METRICAS`, mesmo havendo outros valores. Essa é uma pendência da #5. A coleta automática usa outro caminho de persistência e não herda essa regra.

## Histórico e última coleta válida

Filtros opcionais de `GET /coletas`:

| Query | Formato |
| --- | --- |
| `servicoId` | Número do ID interno. |
| `dataInicio` | Data ISO; limite inferior inclusivo de `iniciadaEm`. |
| `dataFim` | Data ISO; limite superior inclusivo de `iniciadaEm`. |

O retorno é ordenado por `iniciadaEm` decrescente e inclui nome/identificador externo do serviço. O detalhe por ID também inclui relações disponíveis de serviço e região.

`GET /coletas/servico/1/ultima-valida` retorna:

```json
{
  "fonte": "CACHE_FALLBACK",
  "mensagem": "Dados recuperados da última coleta válida preservada",
  "dados": {
    "id": 10,
    "servicoId": 1,
    "estadoColeta": "SUCESSO",
    "iniciadaEm": "2026-10-19T12:00:00.000Z",
    "cpuPercent": 47.5,
    "memoryGb": 2.75,
    "energiaKwh": null,
    "emissaoGCo2e": null
  }
}
```

O objeto `dados` contém os demais campos do modelo `Coleta`, omitidos no exemplo por brevidade. `CACHE_FALLBACK` é sempre devolvido por esse endpoint, inclusive quando o serviço está disponível. Portanto, esse rótulo sozinho não comprova falha atual; verificar estado do serviço e timestamp da coleta. Valores podem ser antigos. Campos nulos não significam zero.

## Erros

Nas rotas de coletas, o filtro retorna:

```json
{
  "sucesso": false,
  "statusCode": 404,
  "timestamp": "2026-10-19T12:00:00.000Z",
  "rota": "/coletas/servico/1/ultima-valida",
  "mensagem": "Nenhuma coleta válida anterior encontrada para o serviço ID 1"
}
```

`mensagem` pode ser texto ou lista de mensagens de validação. Erros de validação/parâmetros retornam 400, ausência retorna 404 e erros inesperados de coletas retornam 500 com mensagem genérica. O filtro não está registrado globalmente: outras rotas usam a resposta padrão do NestJS. A ausência de uma coleta válida não equivale, por si só, a serviço indisponível.

## Integrações e endpoints futuros

A API externa de métricas usa `/services` e `/metrics/{id}`; esses caminhos pertencem ao agregador e não devem ser confundidos com as rotas locais em português. A documentação oficial está em https://metrics.unilaunch.org/docs.

Autenticação/configuração protegida, API de carbono, cálculos/agregados, ranking, comparação e documentação interativa permanecem no plano de entregas. Sua existência neste planejamento não representa implementação atual.
