import { podeEscrever } from '../../../support/commands'

const api = () => Cypress.expose('apiUrl')

describe('API: autenticação e autorização', () => {
  before(() => cy.acordarBackend())

  it('CT-22 Login com usuário inexistente retorna erro 4xx com mensagem', () => {
    cy.request({
      method: 'POST', url: `${api()}/auth/login`, failOnStatusCode: false,
      body: { email: 'nao_existe_cypress@exemplo.com', senha: '123456' },
    }).then((res) => {
      expect(res.status).to.be.within(400, 499)
      expect(res.body).to.have.property('error')
      expect(res.body).not.to.have.property('token')
    })
  })

  it('CT-41 Login sem corpo retorna 4xx (e não 500)', () => {
    cy.request({ method: 'POST', url: `${api()}/auth/login`, body: {}, failOnStatusCode: false })
      .its('status').should('be.within', 400, 499)
  })

  ;[
    ['GET', '/match/listar'], ['GET', '/match/pendentes'], ['GET', '/match/enviados'],
    ['GET', '/dashboard'], ['GET', '/recomendacoes'], ['PUT', '/perfil'], ['POST', '/match/interesse'],
  ].forEach(([method, rota]) => {
    it(`CT-23 ${method} ${rota} sem token retorna 401/403`, () => {
      cy.request({ method, url: `${api()}${rota}`, failOnStatusCode: false })
        .its('status').should('be.oneOf', [401, 403])
    })
  })

  it('CT-23b Token inválido é rejeitado', () => {
    cy.request({
      url: `${api()}/match/listar`, failOnStatusCode: false,
      headers: { Authorization: 'Bearer token.falso.123' },
    }).its('status').should('be.oneOf', [401, 403])
  })

  describe('com conta real (requer PERMITIR_ESCRITA)', () => {
    let conta
    before(function () {
      if (!podeEscrever()) this.skip()
      cy.criarConta('investidor').then((c) => { conta = c })
    })

    it('CT-22b Login válido retorna 200, token e papel', () => {
      cy.request('POST', `${api()}/auth/login`, { email: conta.email, senha: conta.senha }).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body.token).to.be.a('string').and.not.be.empty
        expect(res.body.papel).to.eq('investidor')
        expect(res.body).not.to.have.property('senha') // senha nunca deve voltar na resposta
      })
    })

    it('CT-22c Senha errada retorna 4xx', () => {
      cy.request({
        method: 'POST', url: `${api()}/auth/login`, failOnStatusCode: false,
        body: { email: conta.email, senha: 'errada' },
      }).its('status').should('be.within', 400, 499)
    })

    it('CT-42 Rotas protegidas respondem 200 com token válido', () => {
      cy.tokenDe(conta.email, conta.senha).then(({ token }) => {
        ;['/match/listar', '/match/pendentes', '/recomendacoes', '/dashboard'].forEach((r) =>
          cy.apiAuth(token, 'GET', r).its('status').should('eq', 200))
      })
    })
  })
})
