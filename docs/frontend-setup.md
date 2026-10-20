# Como foi criada a base do frontend GreenER

> Registro histórico da implementação inicial. Para o comportamento atual, consulte [execução](execucao.md), [API](api.md) e [revisão da Sprint 1](sprints/revisao-sprint-1.md). O dashboard `/` agora consome o backend; a demonstração continua separada.

**Task:** #25 — parte de Rainan Reis
**Data:** 06/10/2026
**Branch:** `feat/25-frontend-base`
**Base:** `develop`, atualizada no commit `fd7b19f`

Este documento explica a implementação para quem está começando com frontend.
A entrega prepara o projeto para o time desenvolver as telas. A #25 inteira
ainda depende da parte da Nadla e das validações de integração.

## 1. O que cada tecnologia faz

**React** organiza a interface em componentes. Um componente é uma função
que descreve uma parte da tela usando JSX, uma sintaxe parecida com HTML.
Arquivos React com TypeScript e JSX usam a extensão `.tsx`.

**TypeScript** verifica os tipos enquanto desenvolvemos e no build.
Ele ajuda a detectar, por exemplo, quando uma função espera um número
e recebe um texto. O navegador executa o JavaScript gerado pelas ferramentas.

**Vite** executa o servidor de desenvolvimento e prepara os arquivos finais.
Ao salvar uma alteração, a interface pode ser atualizada sem reiniciar o servidor.

**Node.js** permite executar essas ferramentas no computador. **npm** instala
dependências e executa os comandos registrados no projeto. Padronizamos
Node 24.x e npm 11.x, compatíveis com as ferramentas instaladas.

O React Router foi instalado para a Nadla configurar a navegação.
Ter a dependência instalada não significa que as rotas já estejam implementadas.

## 2. Preparação com Git

Primeiro, conferi a pasta, a versão do Git, a branch, o estado dos arquivos
e o endereço remoto. A cópia estava na `main`, sem alterações locais.

Comandos de conferência utilizados durante o trabalho:

```powershell
git --version
git status --short --branch
git remote -v
git branch --list
```

Depois executei, nessa ordem:

```powershell
git switch develop
git pull --ff-only origin develop
git switch -c feat/25-frontend-base
```

**git switch develop:** mudou para a branch de integração do time.
Como não existia uma develop local, o Git criou essa branch acompanhando
a develop do origin.

**git pull --ff-only origin develop:** trouxe as alterações remotas.
A opção --ff-only aceita somente uma atualização direta do histórico;
se houver divergência, o comando interrompe em vez de criar um merge
automaticamente. A atualização foi concluída até fd7b19f.

**git switch -c feat/25-frontend-base:** criou e entrou na branch desta
implementação. A develop não recebeu os novos arquivos diretamente.

Seguimos develop porque o trabalho atual do backend foi integrado nela.
O guia Git e a DoD antigos ainda citam main como origem/destino; esse
acordo precisa ser atualizado com o time antes de considerar a entrega
encerrada no fluxo oficial.

No fechamento local, também usei:

```powershell
git diff --check
git diff --stat
git diff --name-only
git status --short --branch
```

Esses comandos ajudam a revisar espaços, arquivos e tamanho das alterações.
Arquivos novos aparecem no status, mas só entram no diff comum depois
que forem adicionados ao Git.

**Não executei git add, git commit, git push nem merge.**
As alterações ficaram locais, na branch da task, para revisão.

## 3. Criação do projeto

Na raiz do repositório, executei:

```powershell
npm.cmd create --yes vite@latest frontend -- --template react-ts --no-interactive
```

O comando usou o template oficial React + TypeScript e criou a pasta
frontend. O parâmetro --no-interactive evita perguntas do gerador;
o template escolhido já informa quais tecnologias serão usadas.

Neste Windows, o PowerShell bloqueia npm.ps1 pela política de execução.
Por isso usei npm.cmd, que executa o npm sem mudar essa política.
Não foi necessário alterar a configuração de segurança do computador.

O template atual trazia Oxlint. A issue pede ESLint + Prettier, então
substituí a configuração de lint. Também retirei logos, contador e
arquivos demonstrativos gerados pelo template, deixando uma tela
inicial simples com a identificação do GreenER.

## 4. Dependências e scripts

Dentro de frontend, instalei React Router e as ferramentas de qualidade.
A instalação inicial do ESLint 9 informou que seu suporte havia terminado;
atualizei ESLint e @eslint/js para a versão atual antes de validar a entrega.

```powershell
npm.cmd install react-router
npm.cmd install --save-dev eslint@9 @eslint/js@9 typescript-eslint globals eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier prettier
npm.cmd install --save-dev eslint@latest @eslint/js@latest
```

O package.json final declara React 19, React Router 8, Vite 8, TypeScript 6,
ESLint 10 e Prettier 3. O package-lock.json registra as versões efetivamente
resolvidas, incluindo as dependências indiretas.

**dependencies** contém bibliotecas utilizadas pela aplicação.
**devDependencies** contém ferramentas para desenvolver, verificar e gerar
o build. O Vite inclui no build os módulos necessários para a aplicação,
não simplesmente toda a pasta node_modules.

Para outros integrantes instalarem a mesma resolução de dependências,
o comando recomendado é npm.cmd ci. Não precisam repetir os comandos
de criação ou de instalação individual das ferramentas.

Os scripts disponíveis são:

| Script | O que faz |
| --- | --- |
| dev | Inicia o Vite em localhost:5173 |
| build | Executa tsc -b e depois vite build |
| preview | Serve o build em localhost:4173 |
| lint | Verifica código com ESLint e rejeita avisos |
| format | Aplica Prettier |
| format:check | Verifica Prettier sem editar arquivos |
| test | Executa os testes do serviço HTTP com o Node |

## 5. Estrutura de arquivos e como a tela abre

```text
frontend/
  public/
  src/
    assets/
    components/       # Continuação da Nadla
    hooks/            # Continuação da Nadla
    pages/            # Continuação da Nadla
    services/
      api.ts
    App.tsx
    index.css
    main.tsx
  tests/
    api.test.mjs
  .env.example
  .gitignore
  .node-version
  .prettierignore
  .prettierrc.json
  eslint.config.js
  index.html
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts
  README.md
```

O navegador recebe index.html. Esse arquivo tem o elemento div com id root
e referencia src/main.tsx. O main encontra esse elemento, cria a raiz React
e renderiza App. Se o elemento de entrada não existir, há um erro explícito
em vez de uma falha silenciosa.

App.tsx contém apenas a tela inicial. index.css fornece uma base pequena de
estilos. A tela não faz chamadas automáticas a endpoints que ainda não existem.

StrictMode, usado na inicialização, ativa verificações adicionais do React
em desenvolvimento. A Nadla deverá considerar que alguns comportamentos
de desenvolvimento podem ser executados novamente para revelar problemas.

O TypeScript foi configurado explicitamente com strict e noImplicitAny.
As configurações também verificam variáveis não usadas e evitam geração
duplicada de JavaScript: o TypeScript verifica e o Vite faz o build.

Pastas que ainda não têm implementação usam um arquivo vazio .gitkeep.
Esse nome é uma convenção; o Git versiona arquivos, não pastas vazias.
Nadla pode remover esses marcadores quando criar os componentes reais.

## 6. ESLint e Prettier: por que usar os dois

ESLint identifica problemas no código, como variáveis não usadas,
uso inadequado de hooks e alguns padrões problemáticos em componentes.
A configuração usa o formato atual de arquivo eslint.config.js e aplica
os ambientes corretos: navegador para src, Node para configuração e testes.

Prettier padroniza a aparência: indentação, aspas, ponto e vírgula e quebras
de linha. Adotei aspas simples, ponto e vírgula e finais de linha LF.
Isso reduz diferenças de formatação entre computadores.

eslint-config-prettier desativa regras de formatação do ESLint que poderiam
conflitar com o Prettier. Assim, cada ferramenta tem uma função clara.
Lint e format:check verificam sem alterar; format modifica os arquivos.

node_modules, dist, arquivos locais de ambiente e outros artefatos gerados
ficam ignorados. O .env.example é versionado porque documenta a configuração
sem carregar credenciais reais.

## 7. Serviço HTTP: preparação para as funcionalidades

src/services/api.ts concentra as requisições JSON ao backend.
As páginas poderão usar apiRequest em vez de repetir fetch em cada tela.

Exemplo didático para quando o endpoint de serviços estiver disponível:

```typescript
import { apiRequest } from './services/api';

const dados = await apiRequest('/services');
```

O serviço acrescenta /api, informa Accept: application/json por padrão,
preserva headers e demais opções recebidas, verifica o status HTTP e
converte a resposta JSON. Para HTTP 204 ou 205, retorna undefined porque
essas respostas não devem ter um corpo para converter.

Um HTTP 404 ou 500 gera ApiError, que guarda o status e uma mensagem
genérica. O corpo de uma resposta de erro não é exposto automaticamente
ao usuário. Falhas de conexão, cancelamento e JSON inválido continuam
sendo erros; a tela deverá tratá-los e apresentar o feedback adequado.

Para enviar JSON, o chamador informa Content-Type: application/json e
usa JSON.stringify no corpo. O serviço também aceita AbortSignal para
cancelar requisições.

apiRequest<T> permite descrever um payload conhecido usando TypeScript.
Esse tipo é uma expectativa do código: não valida o formato recebido
em execução. Os DTOs definitivos devem seguir o contrato real do backend.

Não foram adicionados gerenciamento de JWT, polling, cache de métricas
ou chamadas às APIs externas. Essas funcionalidades têm suas próprias
issues. O frontend fala com NestJS; acesso ao PostgreSQL e às APIs
de coleta permanece no backend.

## 8. Proxy e variáveis de ambiente

Em desenvolvimento, frontend e backend usam portas diferentes.
O proxy permite ao navegador chamar /api no endereço do próprio frontend,
enquanto o processo Vite encaminha a chamada ao backend.

O fluxo padrão é:

```text
Navegador: localhost:5173/api/services
    -> proxy do Vite
Backend: localhost:3000/services
```

O backend atual ainda não configura um prefixo global /api.
Por isso, API_PROXY_REWRITE=true remove esse prefixo.
Quando Israel configurar endpoints com /api, use false e reinicie o Vite:

```text
API_PROXY_TARGET=http://localhost:3000
API_PROXY_REWRITE=false
```

A configuração usa valores padrão e funciona sem .env.
Para personalizar, dentro de frontend:

```powershell
Copy-Item .env.example .env
```

As variáveis API_ são lidas por loadEnv na configuração do Vite.
Não são variáveis VITE_ para exposição ao código do navegador.
Senhas, tokens de serviços e JWT_SECRET pertencem ao backend.

A porta 5173 é fixa: strictPort=true faz o comando falhar se ela já estiver
ocupada, evitando que o endereço mude silenciosamente. Preview usa 4173
e também rejeita porta ocupada.

Em Docker, localhost é o próprio container. A #22 deverá configurar
o destino com o nome real do serviço, por exemplo http://backend:3000,
e iniciar Vite com --host 0.0.0.0 para acesso através da porta publicada.
Não foi alterado o Compose; ele atualmente contém somente PostgreSQL.

O preview também herda o proxy do servidor de desenvolvimento.
Isso ajuda a conferir o build localmente, mas não configura a publicação:
o ambiente publicado precisará encaminhar /api ou ter outra configuração
de API acordada com o backend.

## 9. Como executar e verificar no seu computador

A partir da raiz do projeto:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Abra http://localhost:5173. Use Ctrl+C no terminal para encerrar o servidor.

Para conferir a entrega:

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

O último comando mantém o servidor aberto em http://localhost:4173.
Use Ctrl+C para encerrá-lo. dist é o resultado do build e não deve ser
editado manualmente nem enviado ao Git.

Se a porta estiver ocupada, encerre o servidor antigo que você iniciou.
Se uma chamada à API falhar, confirme se o backend está executando,
qual é seu endereço e se ele usa /api. Essa falha não impede a tela
inicial de abrir.

O backend atual possui GET /, que retorna texto. Quando ele puder ser
iniciado, http://localhost:5173/api/ pode ajudar a conferir o encaminhamento
com a configuração padrão. Não use apiRequest nessa rota de texto:
o helper foi preparado para respostas JSON.

## 10. O que foi validado e o que ainda falta

| Verificação | Resultado |
| --- | --- |
| Instalação limpa com npm ci | Passou; dependências reproduzidas pelo lockfile |
| Formatação Prettier | Passou no format:check |
| Lint | Passou sem erros ou avisos |
| Testes unitários do serviço HTTP | 7 passaram |
| Build TypeScript + Vite | Passou |
| Desenvolvimento | HTML e módulo React servidos por HTTP |
| Componente inicial | Renderização programática com main e título GreenER |
| Preview | HTML e JavaScript do build servidos por HTTP |
| Proxy | Sucesso, query string e erro HTTP verificados |
| Mudança de prefixo | Remoção e preservação de /api verificadas |
| Backend indisponível | Erro HTTP na API; frontend continuou respondendo |

Os testes unitários usam o runner e mocks do Node 24, sem uma dependência
adicional de testes. Eles cobrem opções/headers, envio de JSON, erros HTTP,
respostas vazias, rede/cancelamento, JSON inválido e caminhos inválidos.

Para verificar o proxy, foi usado um servidor HTTP temporário e isolado,
não o NestJS real. Ele simulou respostas e permitiu conferir os dois
comportamentos do prefixo. Os servidores do teste foram encerrados.

A validação da tela foi programática; não substitui uma revisão visual
e de usabilidade no navegador. A interface definitiva pertence à Nadla.

Permanecem pendentes: validação real com NestJS/PostgreSQL; execução pelo
Compose oficial da #22; páginas/rotas da Nadla; revisão, commit, push e PR.
A #25 deve continuar aberta até todos os critérios aplicáveis serem atendidos.

## 11. Como a Nadla continua

Primeiro, essa base deve ser revisada e integrada na develop.
Depois, Nadla cria uma branch da develop atualizada e implementa App.tsx,
pages, components, hooks e estilos. A dependência react-router já está pronta.

Rainan mantém as configurações, scripts, serviço HTTP e instruções técnicas.
Mudanças de dependências devem ser combinadas para evitar conflitos no
package-lock.json. As páginas básicas podem ser feitas sem o backend.

Após revisão local, estes são comandos possíveis para versionar a entrega.
Eles são próximos passos e **não foram executados**:

```powershell
git add frontend README.md docs/README.md docs/frontend-setup.md docs/frontend-setup.docx
git commit -m "feat: prepara base tecnica do frontend #25"
git push -u origin feat/25-frontend-base
```

O PR deve ter base develop e descrever a parte de Rainan. Use Refs #25
na descrição para relacionar a task sem fechá-la prematuramente.
O time precisa alinhar esse fluxo com a documentação antiga da DoD.

## 12. Referências oficiais

- [Vite: criação do projeto e scripts](https://vite.dev/guide/)
- [Vite: servidor, portas e proxy](https://vite.dev/config/server-options)
- [Vite: preview](https://vite.dev/config/preview-options)
- [Vite: variáveis de ambiente](https://vite.dev/guide/env-and-mode)
- [ESLint: configuração](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Prettier: integração com linters](https://prettier.io/docs/integrating-with-linters)
- [Node 24: suporte a TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html)
