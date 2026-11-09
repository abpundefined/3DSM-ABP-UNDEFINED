# API REST implementada — GreenER

Esta página descreve as rotas implementadas e suas limitações. Os exemplos são ilustrativos e não representam uma medição real.

## Endereços

- Backend direto: `http://localhost:3000`, sem prefixo global `/api`.
- Pelo frontend: `http://localhost:5173/api`; o Vite remove `/api` antes de encaminhar.
- Exemplo equivalente: `/api/servicos` no Vite → `/servicos` no NestJS.

O Swagger está disponível no backend em [http://localhost:3000/docs](http://localhost:3000/docs), com o documento OpenAPI em [http://localhost:3000/docs-json](http://localhost:3000/docs-json). Acesse `POST /auth/login` para obter um JWT e informe-o em **Authorize** para testar `PUT /configuracao`. As operações de escrita alteram dados reais. O Compose publica o backend em `127.0.0.1`.

## Endpoints

| Método | Caminho no backend | Sucesso | Função |
| --- | --- | --- | --- |
| GET | `/` | 200, texto | Resposta inicial do template; não verifica banco/API externa. |
| POST | `/auth/login` | 200, objeto | Autentica com e-mail e senha e retorna `accessToken`. |
| GET | `/configuracao` | 200, objeto | Consulta os intervalos atuais ou os valores padrão; público. |
| PUT | `/configuracao` | 200, objeto | Atualiza os intervalos; requer JWT Bearer. |
| GET | `/servicos` | 200, array | Lista registros persistidos, ordenados por atualização decrescente. |
| POST | `/servicos/sync` | 201, array | Consulta descoberta externa e sincroniza o banco. Não recebe corpo; requer JWT Bearer. |
| POST | `/coletas` | 201, objeto | Registra uma coleta pelo DTO; requer JWT Bearer. |
| GET | `/coletas` | 200, array | Consulta histórico. |
| GET | `/coletas/:id` | 200, objeto | Detalhe pelo ID inteiro interno; inexistente retorna 404. |
| GET | `/coletas/servico/:servicoId/ultima-valida` | 200, objeto | Última coleta `SUCESSO`; inexistente retorna 404. |
| GET | `/indicadores` | 200, objeto | Retorna consumo, emissão e contagem atual por estado; padrão ambiental são as últimas 24 horas. |

O 201 de `/servicos/sync` é o comportamento atual do decorator POST sem sobrescrita; o contrato pode ser revisado em tarefa própria. Não há paginação implementada nessas listagens.

## Login e configuração administrativa

`POST /auth/login` recebe o e-mail e a senha do administrador:

```json
{
  "email": "admin@greener.local",
  "senha": "troque-esta-senha"
}
```

Resposta de sucesso:

```json
{
  "accessToken": "<JWT>"
}
```

O administrador inicial é criado no boot quando `ADMIN_EMAIL` e `ADMIN_PASSWORD` estão definidos e o e-mail ainda não existe. Configure essas variáveis no `.env` lido pelo backend. Alterar as variáveis depois da criação não troca a senha armazenada. Use os valores de exemplo apenas em desenvolvimento local e defina um `JWT_SECRET` forte.

`GET /configuracao` retorna `intervaloDescobertaSegundos`, `intervaloColetaSegundos`, `atualizadaEm` e `padrao`. Para atualizar, envie `PUT /configuracao` com os dois campos inteiros; o intervalo de descoberta aceita de 10 a 86400 segundos e o de coleta de 10 a 3600 segundos:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "intervaloDescobertaSegundos": 120,
  "intervaloColetaSegundos": 60
}
```

O JWT é emitido em `accessToken`; credenciais inválidas ou token ausente/inválido resultam em HTTP 401. Pelo frontend, use `/api/auth/login` e `/api/configuracao`; o proxy remove `/api` ao chamar o NestJS.

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
- `intensidadeCarbonoGCo2ePorKwh`, `energiaKwh` e `emissaoGCo2e` são calculados e persistidos quando a coleta contém medições. Nessa situação, `estadoCalculo` é salvo como `CONCLUIDO`; sem medições, permanece `PENDENTE`.

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

## Indicadores consolidados

`GET /indicadores` retorna o consumo energético e a emissão total das coletas com `estadoCalculo = CONCLUIDO` no intervalo informado. Sem datas, considera as últimas 24 horas. `dataInicio` e `dataFim` são opcionais, aceitam datas ISO 8601 e delimitam `iniciadaEm` de forma inclusiva; início posterior ao fim retorna 400.

Exemplo de resposta:

```json
{
  "periodo": {
    "inicio": "2026-11-07T12:00:00.000Z",
    "fim": "2026-11-08T12:00:00.000Z"
  },
  "energiaTotalKwh": 2.5,
  "emissaoTotalGCo2e": 100,
  "coletasCalculadas": 2,
  "servicos": {
    "monitorados": 6,
    "disponiveis": 2,
    "indisponiveis": 1,
    "semMetricas": 1,
    "desconhecidos": 2,
    "removidos": 0
  },
  "ultimaColetaEm": "2026-11-08T11:59:30.000Z",
  "geradoEm": "2026-11-08T12:00:00.000Z"
}
```

`energiaTotalKwh` é expresso em kWh e `emissaoTotalGCo2e` em gramas de CO₂e. O dashboard apresenta a emissão em kgCO₂e. `disponiveis` corresponde aos serviços ativos e `indisponiveis` aos que estão nesse estado; `SEM_METRICAS`, `DESCONHECIDO` e `REMOVIDO` não são somados a esses dois indicadores. Os estados são contados independentemente da presença de valores de energia ou emissão.

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

`mensagem` pode ser texto ou lista de mensagens de validação. Erros de validação/parâmetros retornam 400, ausência retorna 404 e erros inesperados retornam 500 com mensagem genérica. O filtro é registrado globalmente na aplicação. A ausência de uma coleta válida não equivale, por si só, a serviço indisponível.

## Integrações e endpoints futuros

A API externa de métricas usa `/services` e `/metrics/{id}`; esses caminhos pertencem ao agregador e não devem ser confundidos com as rotas locais em português. A documentação oficial está em https://metrics.unilaunch.org/docs.

Ranking e comparação permanecem no plano de entregas. Sua existência neste planejamento não representa implementação atual.
