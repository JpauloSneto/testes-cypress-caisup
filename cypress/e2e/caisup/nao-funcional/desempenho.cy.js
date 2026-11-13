const api = () => Cypress.expose('apiUrl')

describe('Desempenho básico', () => {
  before(() => cy.acordarBackend()) // mede com o servidor já "acordado"

  it('CT-28 API de login responde em menos de 3s', () => {
    cy.request({
      method: 'POST', url: `${api()}/auth/login`, failOnStatusCode: false,
      body: { email: 'nao_existe_cypress@exemplo.com', senha: 'x' },
    }).its('duration').should('be.lessThan', 3000)
  })

  it('CT-44 Home carrega (DOMContentLoaded) em menos de 3s', () => {
    cy.visit('/')
    cy.window().then((w) => {
      const [nav] = w.performance.getEntriesByType('navigation')
      cy.log(`DOMContentLoaded: ${Math.round(nav.domContentLoadedEventEnd)} ms`)
      expect(nav.domContentLoadedEventEnd).to.be.lessThan(3000)
    })
  })

  it('CT-45 Login: tempo entre clique e mensagem de erro abaixo de 5s', () => {
    cy.visit('/login')
    cy.get('input[type="email"]').type('nao_existe_cypress@exemplo.com')
    cy.get('input[type="password"]').type('x')
    let t0
    cy.then(() => { t0 = Date.now() })
    cy.get('button[type="submit"]').click()
    cy.contains('Usuário não encontrado.').should('be.visible').then(() => {
      expect(Date.now() - t0).to.be.lessThan(5000)
    })
  })
})
