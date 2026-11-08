# Arquitetura atual — GreenER

A aplicação é um frontend SPA, um backend NestJS modular e um PostgreSQL. Não há múltiplos microsserviços de negócio implementados.

```mermaid
flowchart LR
    React[React e TypeScript] -->|/api/servicos e /api/coletas| Vite[Proxy Vite]
    Vite -->|remove /api| Nest[API NestJS]
    Nest --> Prisma[Prisma ORM]
    Prisma --> PG[(PostgreSQL)]
    Timer[Monitoramento periódico] --> Descoberta[ServicosService]
    Timer --> Coletor[MonitoramentoService]
    Descoberta --> Metrics[API externa de métricas]
    Coletor --> Metrics
    Descoberta --> Prisma
    Coletor --> Prisma
```

## Componentes implementados

| Componente | Responsabilidade e limite atual |
| --- | --- |
| `frontend/src/pages` | Dashboard público, formulário de login e página 404, com React Router. O login chama o backend; não há ainda uma tela para editar a configuração administrativa. |
| `frontend/src/components` | Layout, feedback, gráficos demonstrativos e painel conectado `LiveDashboard`. |
| `frontend/src/services/api.ts` | Cliente JSON por caminhos relativos, erros HTTP e cancelamento por signal fornecido. Não valida o JSON em runtime. |
| `frontend/src/hooks/usePageTitle.ts` | Título da página. A lógica de consultas periódicas ainda está no componente LiveDashboard. |
| `backend/src/modules/servicos` | Descobre, normaliza e sincroniza serviços; lista registros persistidos. Acessa Prisma diretamente. |
| `backend/src/modules/monitoramento` | Inicia ciclo ao subir o módulo, sincroniza descoberta e coleta sequencialmente os serviços não removidos. Persiste diretamente no Prisma. |
| `backend/src/modules/coletas` | API de registro/histórico/última coleta válida, DTOs e repository próprio. O coletor automático não passa por esse service. |
| `backend/src/database` | PrismaService e verificação das tabelas necessárias. |
| `backend/prisma` | Esquema e migrações versionadas, incluindo Região, Serviço, Coleta, Usuário e Configuração. |

## Fluxo de dados

1. O backend verifica conexão/schema e inicia monitoramento, por padrão a cada 30 segundos.
2. A descoberta recebe `/services`, valida a lista e sincroniza os registros. Novos/retornados aguardam coleta como `DESCONHECIDO`; ausentes de uma lista válida tornam-se `REMOVIDO`.
3. O coletor consulta `/metrics/{idExterno}`, grava resultado e atualiza estado. O histórico anterior é preservado.
4. O frontend consulta `/servicos` e a última coleta `SUCESSO` de cada serviço, atualizando a cada 30 segundos. Essa coleta pode ser antiga.
5. O modo `?demo=1` usa fixtures locais e não alimenta o banco ou os indicadores reais.

No Compose, os nomes de rede são `postgres`, `backend` e `frontend`. O navegador usa a porta publicada 5173; Vite encaminha para `http://backend:3000`. O backend usa PostgreSQL interno em `postgres:5432`.

## Decisões e melhorias necessárias

- A base modular e a injeção permitem substituir persistência/agendador em testes isolados.
- A separação em repositories é parcial: existe em coletas, mas descoberta e monitoramento concentram persistência e integração.
- A regra de ausência de métricas está duplicada e diverge entre registro manual e automático; deve ter uma implementação compartilhada.
- A leitura de localização não corresponde ao objeto `location` oficial. É necessário preservar a região original antes da integração de carbono.
- Coleta não tem timeout explícito nem trava de ciclo; o intervalo gravado não usa o intervalo real recebido.
- A carga do dashboard depende do sucesso de todas as consultas individuais. Extrair a coordenação para service/hook e isolar as falhas facilita teste e manutenção.

Não criar contexts/providers ou padrões de projeto sem uma necessidade de estado compartilhado/regra que os justifique. As mudanças recomendadas organizam responsabilidades já existentes.

## Autenticação e configuração

`POST /auth/login` valida o e-mail e a senha do administrador inicial criado a partir das variáveis de ambiente e retorna um JWT. `GET /configuracao` é público; `PUT /configuracao` exige esse JWT. A interface de login já está integrada, mas o fluxo ainda redireciona para o dashboard público e não existe uma tela de administração. Ranking, comparação e mapa permanecem planejados.

Consulte [plano de entregas](plano-de-entregas.md), [API implementada](api.md), [execução](execucao.md) e [revisão da Sprint 1](sprints/revisao-sprint-1.md).
