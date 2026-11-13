// Verifica violações de impacto "critical" e "serious" (WCAG) com axe-core.
const logViolacoes = (violacoes) => {
  violacoes.forEach((v) =>
    Cypress.log({ name: `a11y ${v.impact}`, message: `${v.id}: ${v.help} (${v.nodes.length} elemento(s))` }))
}

describe('Acessibilidade (axe)', () => {
  ;[
    ['CT-26 Home', '/'],
    ['CT-26 Login', '/login'],
    ['CT-26 Cadastro - escolha de perfil', '/cadastro'],
    ['CT-26 Cadastro - startup', '/cadastro?papel=startup'],
    ['CT-26 Cadastro - investidor', '/cadastro?papel=investidor'],
  ].forEach(([titulo, rota]) => {
    it(`${titulo} sem violações graves`, () => {
      cy.visit(rota)
      cy.get('h1').should('be.visible')
      cy.injectAxe()
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logViolacoes)
    })
  })

  it('CT-43 Todos os campos do login têm rótulo acessível', () => {
    cy.visit('/login')
    cy.get('input').each(($i) => {
      const temLabel = $i.closest('label').length > 0 || $i.attr('aria-label') || $i.attr('id') && Cypress.$(`label[for="${$i.attr('id')}"]`).length
      expect(Boolean(temLabel), `rótulo de ${$i.attr('type')}`).to.be.true
    })
  })
})
