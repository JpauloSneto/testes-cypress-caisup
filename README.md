# Testes automatizados – caisUp

Suíte de testes **Cypress** da plataforma [caisUp](https://plataforma-matchmaking-frontend-dep.vercel.app),
que conecta startups a investidores. Cobre testes funcionais (E2E), de API, responsividade,
acessibilidade (axe-core) e desempenho básico. Foi feita como atividade da disciplina de Testes de Software.

**Última execução completa (13/11/2026):** 78 testes, 67 aprovados, 11 reprovados (85,9%).
As 11 falhas correspondem a defeitos reais do sistema, descritos abaixo.

## Pré-requisitos

- Node.js 20 ou superior
- Google Chrome ou o Electron que já vem com o Cypress

## Instalação

```bash
git clone https://github.com/JpauloSneto/testes-cypress-caisup.git
cd testes-cypress-caisup
npm install
```

O arquivo `.npmrc` ativa `legacy-peer-deps`, porque o `cypress-axe` ainda não declara suporte ao Cypress 16
(funciona normalmente).

## Como rodar

| Comando | O que faz |
|---|---|
| `npm test` | Roda só os testes que **não gravam nada** no banco |
| `npm run test:completo` | Roda tudo, inclusive cadastro, match, chat e perfil (**cria contas `teste_cypress_*` no banco**) |
| `npm run test:abrir` | Abre a interface visual do Cypress |

> No terminal integrado do VS Code, use `env -u ELECTRON_RUN_AS_NODE npm test`,
> senão o Cypress não abre (erro "bad option: --no-sandbox").

Cada execução gera uma pasta própria em `cypress/reports/<data_hora>/`, com o relatório `index.html`
e os prints das falhas em `screenshots/`. Uma rodada nova não apaga as anteriores.

## Estrutura

```
cypress/e2e/caisup/
  auth/           login, cadastro, rotas protegidas, 404
  api/            autenticação e autorização da API
  negocio/        dashboard, busca, interesse, match, chat, perfil, planos  (só com escrita)
  ui/             responsividade (4 telas) e acessibilidade (axe)
  nao-funcional/  tempo de resposta
cypress/support/commands.js   seletores e comandos (loginUi, loginApi, criarConta, apiAuth…)
cypress/support/e2e.js        plugins e tratamento de erros conhecidos do app
cypress.config.js             URLs, timeouts, relatório e tarefas do Socket.io
```

O ID de cada caso de teste (CT-xx) está no nome do teste, para rastrear com a Matriz de Casos de Teste.

## Defeitos encontrados

| ID | Teste | Defeito | Severidade |
|---|---|---|---|
| **BUG-07** | CT-21, CT-46, CT-47 | **Falha de segurança:** qualquer usuário logado lê e envia mensagens em conversas das quais não participa, e uma conexão Socket.io sem login recebe as mensagens em tempo real | **Alta** |
| BUG-01 | CT-41 | `POST /auth/login` sem corpo retorna 500 em vez de 400 | Média |
| BUG-02 | CT-05 | Cadastro de investidor aceita investimento mínimo maior que o máximo | Média |
| BUG-04 | CT-08b | Com token inválido ou expirado, o app fica no dashboard vazio em vez de voltar ao login | Média |
| BUG-05 | CT-11 | Busca de investidores ignora o nome: o texto só é comparado com a tese de investimento | Média |
| BUG-03 | CT-26 | Indicador "Etapa X de 2" do cadastro com ARIA inválido (`aria-label` em `div` sem `role`) | Baixa |
| BUG-06 | CT-24 | No mobile (375px), o botão "Criar minha conta" ultrapassa a tela em 3px. Intermitente | Baixa |
| BUG-08 | CT-48 | Estágio "MVP" da startup é salvo como "Validação" (o enum do banco não tem MVP) | Baixa |
| RISCO-01 | – | Código do backend usa uma chave JWT de reserva se `JWT_SECRET` faltar no servidor. Verificar no Render | Alta (se confirmado) |

Causa e solução de cada defeito, com trechos de código: [SOLUCOES_BUGS.md](SOLUCOES_BUGS.md).
