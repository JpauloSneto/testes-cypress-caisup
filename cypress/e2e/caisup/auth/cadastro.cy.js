import { sel, podeEscrever, emailUnico } from '../../../support/commands'

const dadosValidos = () => ({
  nome: 'Teste Cypress', email: emailUnico('val'), senha: 'Senha123!',
  descricao: 'Descrição de teste',
})

describe('Cadastro: validações (sem gravar no banco)', () => {
  beforeEach(() => {
    // Garante que nada seja gravado: qualquer POST de cadastro é interceptado e respondido localmente.
    cy.intercept('POST', '**/auth/register', { statusCode: 418, body: { error: 'bloqueado pelo teste' } }).as('register')
  })

  it('CT-34 Escolher "sou STARTUP" exibe o formulário de startup', () => {
    cy.visit('/cadastro')
    cy.contains('Primeiro, como você quer usar o caisUp?').should('be.visible')
    cy.contains('button', /sou\s*STARTUP/i).click()
    cy.location('search').should('include', 'papel=startup')
    cy.contains('Agora, conte mais sobre sua startup.').should('be.visible')
    cy.contains('label', 'Valor de investimento pretendido (R$)').should('be.visible')
  })

  it('CT-35 Escolher "sou INVESTIDOR" exibe o formulário de investidor', () => {
    cy.visit('/cadastro')
    cy.contains('button', /sou\s*INVESTIDOR/i).click()
    cy.location('search').should('include', 'papel=investidor')
    cy.contains('Agora, conte mais sobre sua tese de investimento.').should('be.visible')
    cy.contains('label', 'Investimento mínimo (R$)').should('be.visible')
    cy.contains('label', 'Investimento máximo (R$)').should('be.visible')
  })

  it('CT-04 Envio com campos obrigatórios vazios não chama a API', () => {
    cy.visit('/cadastro?papel=startup')
    cy.get(sel.cadastro.enviar).click()
    cy.get('form').then(($f) => expect($f[0].checkValidity()).to.be.false)
    cy.wait(800)
    cy.get('@register.all').should('have.length', 0)
  })

  it('CT-36 Campo senha exige no mínimo 6 caracteres', () => {
    // Obs.: o Cypress preenche campos via script, e o navegador só aplica "minlength" em digitação humana.
    // Por isso verificamos a regra declarada no campo (é ela que barra o usuário real).
    cy.visit('/cadastro?papel=startup')
    cy.get(sel.cadastro.senha).should('have.attr', 'minlength', '6').and('have.attr', 'required')
  })

  it('CT-37 Participação acima de 100% é inválida', () => {
    cy.visit('/cadastro?papel=startup')
    cy.get(sel.cadastro.participacao).type('150')
    cy.get(sel.cadastro.participacao).then(($i) => expect($i[0].validity.rangeOverflow).to.be.true)
  })

  it('CT-38 Sem aceitar os Termos o cadastro não é enviado', () => {
    cy.preencherCadastro('startup', dadosValidos())
    cy.get(sel.cadastro.termos).uncheck()
    cy.get(sel.cadastro.enviar).click()
    cy.wait(800)
    cy.get('@register.all').should('have.length', 0)
  })

  it('CT-39 Formulário de startup completo envia o payload esperado', () => {
    const d = dadosValidos()
    cy.preencherCadastro('startup', d)
    cy.get(sel.cadastro.enviar).click()
    cy.wait('@register').its('request.body').should((body) => {
      expect(body).to.include({ email: d.email, papel: 'startup' })
    })
  })

  it('CT-05 Investidor com mínimo maior que o máximo deveria ser barrado', () => {
    cy.preencherCadastro('investidor', { ...dadosValidos(), min: '900000', max: '100000' })
    cy.get(sel.cadastro.enviar).click()
    cy.wait(1500)
    cy.get('@register.all').should('have.length', 0)
  })

  it('CT-40 Botão "Voltar" retorna à escolha de perfil', () => {
    cy.visit('/cadastro')
    cy.contains('button', /sou\s*STARTUP/i).click()
    cy.contains('button', 'Voltar').click()
    cy.contains('Primeiro, como você quer usar o caisUp?').should('be.visible')
  })
})

describe('Cadastro: gravação real (requer PERMITIR_ESCRITA)', () => {
  before(function () { if (!podeEscrever()) this.skip() })

  it('CT-01 Startup se cadastra e é levada ao dashboard', () => {
    cy.preencherCadastro('startup', { ...dadosValidos(), email: emailUnico('startup') })
    cy.get(sel.cadastro.enviar).click()
    cy.location('pathname', { timeout: 60000 }).should('include', '/dashboard')
  })

  it('CT-02 Investidor se cadastra e é levado ao dashboard', () => {
    cy.preencherCadastro('investidor', { ...dadosValidos(), email: emailUnico('investidor') })
    cy.get(sel.cadastro.enviar).click()
    cy.location('pathname', { timeout: 60000 }).should('include', '/dashboard')
  })

  it('CT-03 E-mail já cadastrado é recusado', () => {
    cy.criarConta('startup').then((conta) => {
      cy.preencherCadastro('startup', { ...dadosValidos(), email: conta.email })
      cy.intercept('POST', '**/auth/register').as('dup')
      cy.get(sel.cadastro.enviar).click()
      cy.wait('@dup').its('response.statusCode').should('be.gte', 400)
      cy.location('pathname').should('include', '/cadastro')
    })
  })
})
