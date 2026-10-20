# Integração isolada: retorno de serviços removidos

Valida o problema 1 com PostgreSQL 17, PrismaService, ServicosService e
MonitoramentoService reais. Somente `fetch` é simulado; nenhuma chamada é
feita à API oficial. Não inicializa o AppModule nem o agendador automático.

## Isolamento

- Compose independente: `compose.problem1.integration.yaml`.
- Projeto Docker separado: `greener-problem1-integration`.
- PostgreSQL exclusivo, sem portas publicadas, com dados em `tmpfs`.
- Nenhum volume, container ou rede de desenvolvimento é reutilizado.
- Rede de execução interna, sem acesso às APIs externas.
- As migrations existentes são aplicadas somente ao PostgreSQL de teste.
- O teste verifica flag, host, usuário, nome do banco e schema antes de migrar.
- O teste usa as dependências existentes do backend, sem adicionar pacotes.

## Executar

Pré-requisito: Docker Desktop em execução e suporte a containers Linux.
Execute na raiz do repositório, em PowerShell:

```powershell
docker compose -f compose.problem1.integration.yaml -p greener-problem1-integration up --build --abort-on-container-exit --exit-code-from backend-test
$validationExitCode = $LASTEXITCODE
docker compose -f compose.problem1.integration.yaml -p greener-problem1-integration down
if ($validationExitCode -ne 0) { throw "A validação falhou com código $validationExitCode" }
```

O `--build` monta uma imagem de teste com o Dockerfile existente. Na primeira
execução, as imagens e dependências declaradas podem precisar ser obtidas.
O comando do container gera o Prisma Client, compila o backend e executa
`node --test --test-concurrency=1 test/integration/servicos-retorno.integration.test.cjs`.

Use exclusivamente esse arquivo e o projeto explícito acima; não combine
com o Compose de desenvolvimento. O `down` remove somente os recursos do
projeto de integração. Os dados temporários não são persistidos.

## Verificações

1. Serviço e duas coletas anteriores gravados pelo Prisma no PostgreSQL.
2. Descoberta vazia válida persiste `REMOVIDO`.
3. O coletor ignora o removido e não acrescenta histórico.
4. Nova descoberta persiste `DESCONHECIDO`, mantendo o ID original.
5. O coletor real retoma o serviço e persiste `DISPONIVEL` e uma nova coleta.
6. Os IDs e o conteúdo completo das duas coletas anteriores permanecem iguais.
7. Falha HTTP, falha de rede e payload inválido não alteram os dados persistidos.
8. Serviços listados preservam `INDISPONIVEL` e `SEM_METRICAS` na descoberta.

O teste imprime um resumo com a sequência de estados, o ID do serviço e os
IDs das coletas antes e depois. O resultado esperado é código de saída zero
e nenhuma falha no relatório do runner do Node.

## Resultado da validação em 18/10/2026

Execução em Docker com PostgreSQL 17.9, Prisma 7.10.0 e Node 24.22.0:
build do NestJS concluído; 6 testes de integração passaram, sem falhas.
A migration inicial foi aplicada somente ao banco `greener_problem1_test`.

```json
{
  "database": "greener_problem1_test",
  "serviceIdBefore": 1,
  "serviceIdAfter": 1,
  "states": ["DISPONIVEL", "REMOVIDO", "DESCONHECIDO", "DISPONIVEL"],
  "previousCollectionIds": [1, 2],
  "collectionIdsAfter": [1, 2, 3],
  "previousHistoryPreserved": true
}
```

Os containers e a rede exclusivos do teste foram removidos após a execução.
O teste acessa os serviços diretamente; não cobre as rotas HTTP nem o agendador.
