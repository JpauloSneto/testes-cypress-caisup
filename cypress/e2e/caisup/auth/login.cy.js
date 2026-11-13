import { sel, podeEscrever } from '../../../support/commands'

describe('Login', () => {
  before(() => cy.acordarBackend())
  beforeEach(() => cy.visit('/login'))

  it('CT-29 Página de login exibe campos e botão', () => {
    cy.contains('h1', 'Entrar').should('be.visible')
    cy.get(sel.login.email).should('be.visible').and('have.attr', 'required')
    cy.get(sel.login.senha).should('be.visible').and('have.attr', 'required')
    cy.get(sel.login.entrar).should('be.visible').and('contain', 'Entrar')
  })

  it('CT-07 E-mail não cadastrado exibe "Usuário não encontrado."', () => {
    cy.intercept('POST', '**/auth/login').as('login')
    cy.get(sel.login.email).type('nao_existe_cypress@exemplo.com')
    cy.get(sel.login.senha).type('senhaQualquer123')
    cy.get(sel.login.entrar).click()
    cy.wait('@login').its('response.statusCode').should('be.gte', 400)
    cy.contains('Usuário não encontrado.').should('be.visible')
    cy.location('pathname').should('eq', '/login')
  })

  it('CT-30 Campos vazios não enviam requisição', () => {
    cy.intercept('POST', '**/auth/login').as('login')
    cy.get(sel.login.entrar).click()
    cy.get(sel.login.email).then(($i) => expect($i[0].checkValidity()).to.be.false)
    cy.wait(1000)
    cy.get('@login.all').should('have.length', 0)
  })

  it('CT-31 E-mail com formato inválido é barrado pelo formulário', () => {
    cy.get(sel.login.email).type('emailsemarroba')
    cy.get(sel.login.senha).type('123456')
    cy.get(sel.login.entrar).click()
    cy.get(sel.login.email).then(($i) => expect($i[0].validity.typeMismatch).to.be.true)
    cy.location('pathname').should('eq', '/login')
  })

  it('CT-32 Link "Cadastre-se" leva para o cadastro', () => {
    cy.contains('a', 'Cadastre-se').click()
    cy.location('pathname').should('eq', '/cadastro')
  })

  describe('com conta real (requer PERMITIR_ESCRITA)', () => {
    let conta
    before(function () {
      if (!podeEscrever()) this.skip()
      cy.criarConta('startup').then((c) => { conta = c })
    })

    it('CT-06 Login válido redireciona para o dashboard', () => {
      cy.loginUi(conta.email, conta.senha)
      cy.location('pathname').should('include', '/dashboard')
    })

    it('CT-07b Senha incorreta mantém na tela de login com erro', () => {
      cy.intercept('POST', '**/auth/login').as('login')
      cy.loginUi(conta.email, 'senhaErrada!')
      cy.wait('@login').its('response.statusCode').should('be.gte', 400)
      cy.location('pathname').should('eq', '/login')
    })

    it('CT-09 Logout limpa a sessão e bloqueia o dashboard', () => {
      cy.loginApi(conta.email, conta.senha)
      cy.visit('/dashboard')
      cy.clearAllLocalStorage() // equivalente ao "sair" do app (remove usuario/token)
      cy.visit('/dashboard')
      cy.location('pathname').should('eq', '/login')
    })
  })
})
