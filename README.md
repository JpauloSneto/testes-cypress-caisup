# Testes automatizados – caisUp

Suíte Cypress da plataforma caisUp (https://plataforma-matchmaking-frontend-dep.vercel.app).

## Como rodar

> No terminal integrado do VS Code, use `env -u ELECTRON_RUN_AS_NODE` antes do comando,
> senão o Cypress não abre (erro "bad option: --no-sandbox").

| Comando | O que faz |
|---|---|
| `npm test` | Roda só os testes que **não gravam nada** no banco |
| `npm run test:completo` | Roda tudo, inclusive cadastro, match, chat e perfil (**cria contas `teste_cypress_*` no banco**) |
| `npm run test:abrir` | Abre a interface visual do Cypress |

Relatório HTML: `cypress/reports/index.html`. Prints das falhas: `cypress/screenshots/`.

## Estrutura

```
cypress/e2e/caisup/
  auth/           login, cadastro, rotas protegidas, 404
  api/            autenticação e autorização da API (Render)
  negocio/        dashboard, busca, interesse, match, chat, perfil, planos  (só com escrita)
  ui/             responsividade (4 telas) e acessibilidade (axe)
  nao-funcional/  tempo de resposta
cypress/support/commands.js   seletores e comandos (loginUi, loginApi, criarConta, apiAuth…)
```

O ID de cada caso de teste (CT-xx) está no nome do teste, para rastrear com a matriz do Plano de Testes.

## Defeitos encontrados (atualizado em 13/11/2026)

| ID | Teste | Defeito | Severidade sugerida |
|---|---|---|---|
| BUG-01 | CT-41 | `POST /auth/login` sem corpo retorna **500** (erro interno) em vez de 400 | Média |
| BUG-02 | CT-05 | Cadastro de investidor aceita investimento mínimo **maior** que o máximo (R$ 900.000 / R$ 100.000) | Média |
| BUG-03 | CT-26 | Acessibilidade: indicador "Etapa X de 2" do cadastro é `<div>` com `aria-label` sem `role` (regra axe `aria-prohibited-attr`, impacto *serious*) | Baixa |
| BUG-04 | CT-08b | Com token inválido ou expirado, o app continua mostrando o dashboard (vazio) em vez de voltar ao login, e gera erro não tratado "Token inválido". A API recusa corretamente (401), então não há vazamento de dados | Média |
| **BUG-07** | CT-21 | **Falha de segurança:** qualquer usuário logado lê as mensagens de conversas das quais **não participa**. `GET /api/mensagens/:matchId` com o token de um terceiro retorna 200 com o conteúdo do chat (a API não confere se o usuário pertence ao match). Expõe conversas privadas (LGPD) | **Alta** |
| BUG-06 | CT-24 | No mobile (375px), o botão "Criar minha conta" do cadastro ultrapassa a tela em 3px (largura 378px) e cria rolagem horizontal. Intermitente: ocorreu em 2 de 3 execuções, provavelmente conforme o carregamento da fonte | Baixa |
| BUG-05 | CT-11 | Busca pelo nome completo de um investidor recém-cadastrado retorna "Nenhum resultado com esses filtros." (**a confirmar** manualmente: pode ser regra de negócio, como só listar perfis completos) | Média |

| BUG-08 | CT-48 | Estágio "MVP" da startup é salvo como "Validação" (o enum `startup_estagio` do banco não tem MVP). Achado na revisão de código | Baixa |
| RISCO-01 | – | Código usa `JWT_SECRET \|\| 'secret_padrao'`: se a variável faltar no Render, tokens podem ser forjados. Verificar manualmente | Alta (se confirmado) |

Causas e soluções de cada bug (com trechos de código): [SOLUCOES_BUGS.md](SOLUCOES_BUGS.md).

Testes adicionados após a revisão do backend, todos falharam em 13/11/2026 às 10:35, confirmando os achados:
CT-46 (terceiro envia mensagem: 201), CT-47 (Socket.io sem login recebe mensagens) e CT-48 (MVP vira `validacao`).

Resultados detalhados por execução ficam em `cypress/reports/` (veja `execucao-2026-11-13_10-35.md`).

