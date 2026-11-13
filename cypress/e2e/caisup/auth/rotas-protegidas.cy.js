describe('Rotas protegidas e navegação pública', () => {
  ;['/dashboard', '/buscar', '/perfil', '/planos', '/conversas'].forEach((rota) => {
    it(`CT-08 ${rota} sem login redireciona para /login`, () => {
      cy.visit(rota)
      cy.location('pathname').should('eq', '/login')
    })
  })

  it('CT-08b Token falso/expirado: API recusa e o app volta para o login', () => {
    cy.intercept('GET', '**/api/**').as('api')
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'token-invalido')
        win.localStorage.setItem('usuario', JSON.stringify({ id: 'x', papel: 'startup', nome: 'Falso', token: 'token-invalido' }))
      },
    })
    cy.visit('/dashboard')
    cy.wait('@api').its('response.statusCode').should('be.oneOf', [401, 403])
    // esperado: com a sessão inválida o app deve deslogar o usuário
    cy.location('pathname', { timeout: 10000 }).should('eq', '/login')
  })

  it('CT-25 Rota inexistente exibe página 404 com link de volta', () => {
    cy.visit('/rota-que-nao-existe')
    cy.contains('404').should('be.visible')
    cy.contains('Página não encontrada.').should('be.visible')
    cy.contains('a', 'Voltar ao início').click()
    cy.location('pathname').should('eq', '/')
  })

  it('CT-33 Home exibe chamadas para investidor e startup', () => {
    cy.visit('/')
    cy.get('h1').should('contain.text', 'STARTUPS').and('contain.text', 'INVESTIDORES')
    cy.get('a[href="/cadastro?papel=investidor"]').should('be.visible')
    cy.get('a[href="/cadastro?papel=startup"]').should('be.visible')
    cy.get('a[href="/login"]').should('be.visible')
  })
})
