// ---------------------------------------------------------------------------
// Seletores centralizados (o frontend não tem data-testid, então usamos
// placeholders/tipos. Se um texto mudar no app, ajuste só aqui.)
// ---------------------------------------------------------------------------
export const sel = {
  login: {
    email: 'input[type="email"]',
    senha: 'input[type="password"]',
    entrar: 'button[type="submit"]',
  },
  cadastro: {
    nome: 'input[placeholder="Ex.: MaréFintech"], input[placeholder="Seu nome"]',
    email: 'input[type="email"]',
    senha: 'input[type="password"]',
    descricao: 'textarea[required]',
    localizacao: 'input[placeholder="Ex.: Porto Digital"]',
    valor: 'input[placeholder="Ex.: R$ 300.000"]',
    participacao: 'input[type="number"]',
    termos: 'input[type="checkbox"]',
    enviar: 'button[type="submit"]',
  },
}

const api = () => Cypress.expose('apiUrl')

/** Escrita no banco só é feita se PERMITIR_ESCRITA=true (ver README_TESTES.md). */
export const podeEscrever = () => String(Cypress.expose('PERMITIR_ESCRITA')) === 'true'

export const emailUnico = (papel) =>
  `teste_cypress_${papel}_${Date.now()}_${Cypress._.random(1e4)}@exemplo.com`

/** Acorda o backend do Render (plano grátis "dorme" e leva ~60s na 1ª chamada). */
Cypress.Commands.add('acordarBackend', () => {
  cy.request({
    method: 'POST', url: `${api()}/auth/login`, failOnStatusCode: false, timeout: 120000,
    body: { email: 'aquecimento@exemplo.com', senha: 'x' },
  })
})

/** Login pela interface. */
Cypress.Commands.add('loginUi', (email, senha) => {
  cy.visit('/login')
  cy.get(sel.login.email).type(email)
  cy.get(sel.login.senha).type(senha, { log: false })
  cy.get(sel.login.entrar).click()
})

/** Login via API + cy.session (rápido). Replica o que o app guarda no localStorage. */
Cypress.Commands.add('loginApi', (email, senha) => {
  cy.session(['login', email], () => {
    cy.request('POST', `${api()}/auth/login`, { email, senha }).then(({ body }) => {
      window.localStorage.setItem('token', body.token)
      window.localStorage.setItem('usuario', JSON.stringify(body))
    })
  })
})

/** Token de um usuário (para chamadas de API autenticadas). */
Cypress.Commands.add('tokenDe', (email, senha) =>
  cy.request('POST', `${api()}/auth/login`, { email, senha }).its('body'))

/** Requisição autenticada à API. */
Cypress.Commands.add('apiAuth', (token, method, path, body) =>
  cy.request({
    method, url: `${api()}${path}`, body, failOnStatusCode: false,
    headers: { Authorization: `Bearer ${token}` },
  }))

/**
 * Preenche o formulário de cadastro.
 * papel: 'startup' | 'investidor'
 */
Cypress.Commands.add('preencherCadastro', (papel, dados) => {
  cy.visit(`/cadastro?papel=${papel}`)
  cy.get(sel.cadastro.nome).type(dados.nome)
  cy.get(sel.cadastro.email).type(dados.email)
  cy.get(sel.cadastro.senha).type(dados.senha, { log: false })
  cy.get(sel.cadastro.descricao).type(dados.descricao)
  cy.get(sel.cadastro.localizacao).type(dados.localizacao || 'Porto Digital')
  if (papel === 'startup') {
    cy.get('select').eq(0).select(dados.segmento || 'Fintech')
    cy.get('select').eq(1).select(dados.estagio || 'MVP')
    cy.get(sel.cadastro.valor).type(dados.valor || '300000')
    cy.get(sel.cadastro.participacao).type(String(dados.participacao ?? 10))
  } else {
    cy.contains('button', dados.segmento || 'Fintech').click()
    cy.contains('button', dados.estagio || 'MVP').click()
    cy.get('input[placeholder="Ex.: R$ 50.000"]').type(dados.min || '50000')
    cy.get('input[placeholder="Ex.: R$ 500.000"]').type(dados.max || '500000')
  }
  cy.get(sel.cadastro.termos).check()
})

/** Cria uma conta nova pela interface e devolve { email, senha }. Requer PERMITIR_ESCRITA. */
Cypress.Commands.add('criarConta', (papel) => {
  const conta = {
    nome: `Teste Cypress ${papel} ${Date.now()}`,
    email: emailUnico(papel),
    senha: 'Senha123!',
    descricao: 'Conta criada automaticamente pelos testes Cypress.',
  }
  cy.preencherCadastro(papel, conta)
  cy.intercept('POST', '**/auth/register').as('register')
  cy.get(sel.cadastro.enviar).click()
  cy.wait('@register').its('response.statusCode').should('be.within', 200, 299)
  cy.clearAllLocalStorage()
  return cy.wrap(conta)
})
