# Causas e soluções dos bugs – caisUp

Análise feita em 13/11/2026 a partir dos testes Cypress e da leitura do código do backend
(repositório `Plataforma_matchmaking_backend-banco_deploy`, commit `539c87a`).
O frontend não foi lido no código-fonte; as soluções de frontend descrevem o que mudar.

Stack do backend: Node.js + Express 5 + TypeScript, Prisma 5, MySQL, JWT, Socket.io.

---

## 🔴 BUG-07 – Usuário lê e envia mensagens em conversas das quais não participa (Alta)

**Causa** – `src/controllers/mensagemController.ts` e `src/server.ts`
- `listarMensagens` (GET /mensagens/:matchId) só verifica se existe token. Não confere se o usuário pertence ao match, então qualquer usuário **lê** a conversa.
- `enviarMensagem` (POST /mensagens) tem o mesmo problema: qualquer usuário **envia** mensagens na conversa dos outros. Ainda cria a conversa automaticamente se ela não existir.
- O evento `entrar_conversa` do Socket.io **não exige login**. Qualquer conexão que saiba o ID do match entra na sala e recebe as mensagens novas em tempo real.

**Solução**
```ts
// função de verificação (match_conexao guarda id_startup / id_investidor, não id de usuário)
async function participaDoMatch(matchId: string, usuarioId: string) {
  const match = await prisma.match_conexao.findUnique({
    where: { id_match: matchId },
    include: { startup: { select: { id_usuario: true } }, investidor: { select: { id_usuario: true } } }
  });
  if (!match) return null;
  return [match.startup.id_usuario, match.investidor.id_usuario].includes(usuarioId);
}

// no início de listarMensagens e enviarMensagem:
const ok = await participaDoMatch(matchId, req.usuarioId);
if (ok === null) return res.status(404).json({ error: 'Match não encontrado' });
if (!ok) return res.status(403).json({ error: 'Acesso negado a esta conversa' });
```
```ts
// server.ts – autenticar o Socket.io
io.use((socket, next) => {
  try {
    const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET!) as { id: string };
    socket.data.usuarioId = id; next();
  } catch { next(new Error('Não autorizado')); }
});
io.on('connection', (socket) => {
  socket.on('entrar_conversa', async (matchId) => {
    if (await participaDoMatch(matchId, socket.data.usuarioId)) socket.join(matchId);
  });
});
```
No frontend, conectar com `io(URL, { auth: { token } })`.

**Validação:** CT-21, CT-46 e CT-47 devem passar.

---

## 🟠 BUG-01 – Login sem dados retorna 500 (Média)

**Causa** – `authController.ts`, função `login`: `prisma.usuario.findUnique({ where: { email } })` com `email` indefinido faz o Prisma lançar erro, e o `catch` responde 500.

**Solução** – validar no início do `login` (e do `register`):
```ts
const { email, senha } = req.body ?? {};
if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
```
**Validação:** CT-41.

---

## 🟠 BUG-02 – Mínimo maior que o máximo aceito no cadastro de investidor (Média)

**Causa** – `authController.ts`, função `register`: grava `faixa_minima` e `faixa_maxima` sem comparar. O formulário do frontend também não valida.

**Solução** – no `register` e no `atualizarPerfil`:
```ts
if (papel === 'investidor' && investimentoMinimo && investimentoMaximo
    && Number(investimentoMinimo) > Number(investimentoMaximo)) {
  return res.status(400).json({ error: 'O investimento mínimo não pode ser maior que o máximo.' });
}
```
No frontend, a mesma checagem antes de enviar o formulário.
**Validação:** CT-05.

---

## 🟠 BUG-04 – Token inválido não leva de volta ao login (Média)

**Causa** – o backend está correto (`authMiddleware` responde 401). A função de requisição do frontend lança o erro, mas ninguém trata o 401.

**Solução (frontend)** – na função que faz o `fetch` com `Authorization`:
```js
if (r.status === 401) {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/login';
  return;
}
```
**Validação:** CT-08b.

---

## 🟠 BUG-05 – Busca de investidores ignora o nome (Média) – confirmado

**Causa** – `buscaController.ts`: quando a startup busca investidores, o texto só é comparado com `tese_investimento`.

**Solução**
```ts
...(texto ? {
  OR: [
    { tese_investimento: { contains: texto } },
    { usuario: { nome: { contains: texto } } }
  ]
} : {})
```
**Validação:** CT-11.

---

## 🟡 BUG-03 – ARIA inválido no indicador de etapas (Baixa)

**Solução (frontend)**
```jsx
<div role="progressbar" aria-label={`Etapa ${etapa} de 2`}
     aria-valuemin={1} aria-valuemax={2} aria-valuenow={etapa}>
```
**Validação:** CT-26 (3 páginas do cadastro).

---

## 🟡 BUG-06 – Botão "Criar minha conta" estoura a tela no mobile (Baixa)

**Solução (frontend)** – trocar `whitespace-nowrap` por `whitespace-normal sm:whitespace-nowrap`, ou usar `w-full sm:w-auto` no botão.
**Validação:** CT-24 (Cadastro, iphone-x e iphone-se2).

---

## Achados novos da revisão de código

### 🟡 BUG-08 – Estágio "MVP" da startup é salvo como "Validação" (Baixa)

**Causa** – o enum `startup_estagio` do banco só tem `ideacao`, `validacao`, `tracao` e `escala`. A função `mapearEstagio` (authController.ts) converte `'MVP'` em `'validacao'`. A startup escolhe MVP no cadastro e o perfil passa a mostrar "Validação". Os investidores têm outro enum, que inclui MVP.

**Solução** – adicionar `MVP` ao enum `startup_estagio` (migração do banco) e mapear `'MVP': 'MVP'`, como já é feito para investidores.
**Validação:** CT-48.

### ⚠️ RISCO-01 – Chave JWT de reserva no código (Alta, se confirmado)

**Causa** – `authMiddleware.ts` e `authController.ts` usam `process.env.JWT_SECRET || 'secret_padrao'`. Se a variável `JWT_SECRET` não estiver definida no Render, qualquer pessoa que leia o repositório (que é público) consegue gerar tokens válidos de qualquer usuário.

**Solução** – conferir no painel do Render se `JWT_SECRET` existe e é forte. No código, remover o valor reserva e falhar ao iniciar sem ele:
```ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET não definida');
```
**Validação:** verificação manual no Render (não foi testado em produção de propósito).
