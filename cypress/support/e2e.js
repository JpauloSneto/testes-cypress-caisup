import 'cypress-mochawesome-reporter/register'
import 'cypress-axe'
import './commands'

// O app tem service worker (PWA) e socket.io: erros de conexão em segundo plano
// não devem derrubar testes de interface.
Cypress.on('uncaught:exception', (err) => {
  if (/socket|websocket|xhr poll|ServiceWorker|Failed to fetch/i.test(err.message)) return false
  // BUG-04: o app não trata 401 ("Token inválido"/"Token não fornecido") e lança erro não capturado.
  // Ignoramos aqui para não derrubar testes não relacionados; o CT-08b cobre esse defeito.
  if (/Token (inválido|não fornecido)/i.test(err.message)) return false
})
