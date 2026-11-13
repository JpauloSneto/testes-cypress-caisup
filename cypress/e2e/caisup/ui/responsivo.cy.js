const telas = [
  { nome: 'Desktop 1280x800', vp: [1280, 800] },
  { nome: 'Tablet (ipad-2)', vp: ['ipad-2'] },
  { nome: 'Mobile (iphone-x)', vp: ['iphone-x'] },
  { nome: 'Mobile pequeno (iphone-se2)', vp: ['iphone-se2'] },
]

const semScrollHorizontal = () =>
  // compara com a largura da tela (innerWidth) para não contar a barra de rolagem do navegador de teste
  cy.window().then((w) => {
    expect(w.document.documentElement.scrollWidth, 'largura do conteúdo (px)').to.be.at.most(w.innerWidth)
  })

describe('Responsividade', () => {
  telas.forEach(({ nome, vp }) => {
    describe(nome, () => {
      beforeEach(() => cy.viewport(...vp))

      it('CT-24 Home: título e chamadas visíveis, sem scroll horizontal', () => {
        cy.visit('/')
        cy.get('h1').should('be.visible')
        cy.get('a[href="/cadastro?papel=startup"]').scrollIntoView().should('be.visible')
        cy.get('a[href="/cadastro?papel=investidor"]').scrollIntoView().should('be.visible')
        semScrollHorizontal()
      })

      it('CT-24 Login: formulário utilizável, sem scroll horizontal', () => {
        cy.visit('/login')
        cy.get('input[type="email"]').should('be.visible')
        cy.get('input[type="password"]').should('be.visible')
        cy.get('button[type="submit"]').should('be.visible')
        semScrollHorizontal()
      })

      it('CT-24 Cadastro: formulário de startup utilizável, sem scroll horizontal', () => {
        cy.visit('/cadastro?papel=startup')
        cy.get('input[type="email"]').should('be.visible')
        cy.get('button[type="submit"]').scrollIntoView().should('be.visible')
        semScrollHorizontal()
      })
    })
  })
})
