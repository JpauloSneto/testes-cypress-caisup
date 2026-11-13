/**
 * Fluxos de negócio logados: dashboard, busca, interesse, match, chat e perfil.
 * TODOS gravam dados no banco, por isso só rodam com PERMITIR_ESCRITA=true.
 * Criam uma startup e um investidor novos a cada execução (e-mails teste_cypress_*).
 */
import { podeEscrever } from '../../../support/commands'

const idDe = (body) => body.id ?? body.usuario?.id ?? body.perfil?.id

describe('Matchmaking: fluxo completo startup ↔ investidor', () => {
  const s = {} // startup
  const i = {} // investidor
  let matchId

  before(function () {
    if (!podeEscrever()) this.skip()
    cy.acordarBackend()
    cy.criarConta('startup').then((c) => Object.assign(s, c))
    cy.criarConta('investidor').then((c) => Object.assign(i, c))
    cy.then(() => cy.tokenDe(s.email, s.senha)).then((b) => { s.token = b.token; s.id = idDe(b) })
    cy.then(() => cy.tokenDe(i.email, i.senha)).then((b) => { i.token = b.token; i.id = idDe(b) })
  })

  it('CT-10 Dashboard da startup mostra investidores recomendados', () => {
    cy.loginApi(s.email, s.senha)
    cy.visit('/dashboard')
    cy.contains(/Investidores recomendados/i).should('be.visible')
  })

  it('CT-10b Dashboard do investidor carrega recomendações', () => {
    cy.intercept('GET', '**/recomendacoes').as('rec')
    cy.loginApi(i.email, i.senha)
    cy.visit('/dashboard')
    cy.wait('@rec').its('response.statusCode').should('eq', 200)
  })

  it('CT-11 Busca por nome encontra o investidor recém-criado', () => {
    cy.loginApi(s.email, s.senha)
    cy.intercept('POST', '**/buscar').as('buscar')
    cy.visit('/buscar')
    cy.get('input[placeholder^="Buscar por nome"]').type(i.nome)
    // evidência: mostra no relatório o que a API devolveu para a busca
    cy.wait('@buscar').then(({ request, response }) => {
      cy.log(`POST /buscar ${JSON.stringify(request.body)} → ${response.statusCode}, ${JSON.stringify(response.body).length} bytes`)
    })
    cy.contains(i.nome, { timeout: 30000 }).should('be.visible')
  })

  it('CT-12 Busca sem resultado mostra estado vazio', () => {
    cy.loginApi(s.email, s.senha)
    cy.visit('/buscar')
    cy.get('input[placeholder^="Buscar por nome"]').type('zzz_nao_existe_cypress_zzz')
    cy.contains('Nenhum resultado com esses filtros.').should('be.visible')
  })

  it('CT-13 Startup envia interesse ao investidor (API)', () => {
    cy.apiAuth(s.token, 'POST', '/match/interesse', {
      id_startup: s.id, id_investidor: i.id, iniciado_por: 'startup',
      mensagem: 'Olá! Teste automatizado Cypress.',
    }).its('status').should('be.within', 200, 299)
    cy.apiAuth(s.token, 'GET', '/match/enviados').its('body').should('satisfy',
      (b) => JSON.stringify(b).includes(i.id))
  })

  it('CT-16 Interesse duplicado não cria segundo registro', () => {
    cy.apiAuth(s.token, 'POST', '/match/interesse', {
      id_startup: s.id, id_investidor: i.id, iniciado_por: 'startup', mensagem: 'dup',
    })
    cy.apiAuth(s.token, 'GET', '/match/enviados').its('body').then((b) => {
      const lista = Array.isArray(b) ? b : Object.values(b).find(Array.isArray) || []
      expect(lista.filter((x) => JSON.stringify(x).includes(i.id))).to.have.length(1)
    })
  })

  it('CT-14 Investidor vê o interesse pendente e aceita → vira match', () => {
    cy.apiAuth(i.token, 'GET', '/match/pendentes').its('body').should('satisfy',
      (b) => JSON.stringify(b).includes(s.id))
    cy.apiAuth(i.token, 'POST', '/match/aceitar', { alvoId: s.id }).its('status').should('be.within', 200, 299)
    // o app monta o link do chat a partir de /match/listar: [{ match, outro }]
    cy.apiAuth(s.token, 'GET', '/match/listar').then(({ body }) => {
      const item = (Array.isArray(body) ? body : []).find((x) => x.outro?.id === i.id)
      expect(item, 'match com o investidor em /match/listar').to.exist
      matchId = item.match.id
    })
  })

  it('CT-20 Startup envia mensagem no chat e ela aparece na conversa', function () {
    if (!matchId) this.skip()
    const texto = `Mensagem Cypress ${Date.now()}`
    cy.loginApi(s.email, s.senha)
    cy.visit(`/conversas/${matchId}`)
    cy.get('[placeholder="Escreva uma mensagem"]').type(texto)
    cy.get('[aria-label="Enviar"]').click()
    cy.contains(texto).should('be.visible')
    cy.apiAuth(i.token, 'GET', `/mensagens/${matchId}`).its('body').should('satisfy',
      (b) => JSON.stringify(b).includes(texto))
  })

  it('CT-21 Usuário de fora do match não lê as mensagens', function () {
    if (!matchId) this.skip()
    cy.criarConta('investidor').then((c) => cy.tokenDe(c.email, c.senha)).then(({ token }) => {
      cy.apiAuth(token, 'GET', `/mensagens/${matchId}`).then((res) => {
        const vazou = res.status === 200 && JSON.stringify(res.body).includes('Mensagem Cypress')
        expect(vazou, 'mensagens de outro match expostas').to.be.false
      })
    })
  })

  it('CT-46 Usuário de fora do match não envia mensagem na conversa', function () {
    if (!matchId) this.skip()
    cy.criarConta('startup').then((c) => cy.tokenDe(c.email, c.senha)).then(({ token }) => {
      cy.apiAuth(token, 'POST', '/mensagens', { matchId, texto: 'Mensagem intrusa Cypress' })
        .its('status').should('be.oneOf', [403, 404])
    })
  })

  it('CT-47 Conexão Socket.io sem login não recebe mensagens do match', function () {
    if (!matchId) this.skip()
    const url = Cypress.expose('apiUrl').replace(/\/api$/, '')
    const texto = `Mensagem socket Cypress ${Date.now()}`
    cy.task('socketOuvir', { url, matchId }, { timeout: 90000 }).then((estado) => cy.log(`socket: ${estado}`))
    cy.apiAuth(s.token, 'POST', '/mensagens', { matchId, texto }).its('status').should('be.within', 200, 299)
    cy.wait(3000)
    cy.task('socketLer').then((recebidas) => {
      const vazou = recebidas.some((m) => m.texto === texto)
      expect(vazou, 'mensagem entregue a um socket sem login').to.be.false
    })
  })

  it('CT-48 Startup que escolhe estágio "MVP" mantém o estágio MVP', () => {
    // a conta da startup foi criada com estagio = 'MVP' (padrão de cy.criarConta)
    cy.tokenDe(s.email, s.senha).its('estagio').should('match', /mvp/i)
  })

  it('CT-15 Investidor recusa interesse de outra startup', () => {
    cy.criarConta('startup').then((c) => cy.tokenDe(c.email, c.senha)).then((b) => {
      const outraId = idDe(b)
      cy.apiAuth(b.token, 'POST', '/match/interesse', {
        id_startup: outraId, id_investidor: i.id, iniciado_por: 'startup', mensagem: 'recusar',
      })
      cy.apiAuth(i.token, 'POST', '/match/recusar', { alvoId: outraId }).its('status').should('be.within', 200, 299)
      cy.apiAuth(i.token, 'GET', '/match/pendentes').its('body').should('not.satisfy',
        (p) => JSON.stringify(p).includes(outraId))
    })
  })

  it('CT-19 Perfil público do investidor abre para a startup', () => {
    cy.loginApi(s.email, s.senha)
    cy.visit(`/perfil/${i.id}`)
    cy.contains(i.nome).should('be.visible')
  })

  it('CT-17 Startup edita o próprio perfil pela tela e a alteração persiste', () => {
    const nova = `Descrição editada pelo Cypress ${Date.now()}`
    cy.loginApi(s.email, s.senha)
    cy.visit('/perfil')
    cy.intercept('PUT', '**/perfil').as('salvar')
    cy.get('textarea').first().clear().type(nova)
    cy.contains('button', 'Salvar alterações').click()
    cy.wait('@salvar').its('response.statusCode').should('be.within', 200, 299)
    cy.contains('Alterações salvas!').should('be.visible')
    // persistência: confere no perfil público, que vem do servidor
    cy.visit(`/perfil/${s.id}`)
    cy.contains(nova).should('be.visible')
  })

  it('CT-27 Página de planos carrega para usuário logado', () => {
    cy.loginApi(s.email, s.senha)
    cy.visit('/planos')
    cy.location('pathname').should('eq', '/planos')
    cy.contains(/Comece grátis/i).should('be.visible')
  })
})
