const { defineConfig } = require('cypress')

// Cada execução ganha a própria pasta (ex.: cypress/reports/2026-11-13_08-30),
// assim uma rodada nova não apaga o relatório e os prints da anterior.
const execucao = new Date().toLocaleString('sv-SE').slice(0, 16).replace(' ', '_').replace(':', '-')

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: `cypress/reports/${execucao}`,
    reportPageTitle: 'caisUp - Relatório de Testes',
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
  },
  video: false,
  screenshotsFolder: `cypress/reports/${execucao}/screenshots`,
  trashAssetsBeforeRuns: false,
  e2e: {
    baseUrl: 'https://plataforma-matchmaking-frontend-dep.vercel.app',
    specPattern: 'cypress/e2e/caisup/**/*.cy.js',
    defaultCommandTimeout: 15000,
    responseTimeout: 120000, // backend no Render (plano grátis) pode levar ~60s para acordar
    expose: {
      apiUrl: 'https://plataforma-matchmaking-backend-banco.onrender.com/api',
      PERMITIR_ESCRITA: false, // true = testes que criam contas/matches/mensagens no banco
    },
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on)
      // Cliente Socket.io SEM login, usado no CT-47 para verificar se o chat vaza mensagens em tempo real
      const { io } = require('socket.io-client')
      let sock = null, recebidas = []
      on('task', {
        log(m) { console.log(m); return null },
        socketOuvir({ url, matchId }) {
          recebidas = []
          return new Promise((resolve) => {
            sock = io(url, { transports: ['websocket', 'polling'], reconnection: false, timeout: 60000 })
            sock.on('nova_mensagem', (m) => recebidas.push(m))
            sock.on('connect', () => { sock.emit('entrar_conversa', matchId); setTimeout(() => resolve('conectado'), 1500) })
            sock.on('connect_error', (e) => resolve('recusado: ' + e.message))
          })
        },
        socketLer() {
          const r = recebidas; if (sock) sock.close(); sock = null; return r
        },
      })
      return config
    },
  },
})
