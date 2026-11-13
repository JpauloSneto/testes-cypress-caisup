# Execução completa – 13/11/2026, 10:35 (ciclo 1, com os testes da revisão de código)

Comando: `npm run test:completo`. Duração: 4 min 58 s. Ambiente: produção. Navegador: Electron.
Relatório: `index.html` (baixe e abra no navegador). Prints das falhas: pasta `screenshots/`.

| Total | Passou | Falhou | Pendente | Aprovação |
|---|---|---|---|---|
| 78 | 67 | 11 | 0 | **85,9%** |

## Testes novos (criados depois da revisão do backend)

| Teste | Resultado | Confirma |
|---|---|---|
| CT-46 Terceiro não envia mensagem | Falhou: API respondeu **201** (mensagem criada) | BUG-07 (envio) |
| CT-47 Socket.io sem login não recebe mensagens | Falhou: socket sem login **recebeu** a mensagem | BUG-07 (tempo real) |
| CT-48 Estágio MVP preservado | Falhou: login devolveu `validacao` | BUG-08 |

## Falhas (11)

| Bug | Testes |
|---|---|
| BUG-07 (Alta) | CT-21, CT-46, CT-47 |
| BUG-01 (Média) | CT-41 |
| BUG-02 (Média) | CT-05 |
| BUG-04 (Média) | CT-08b |
| BUG-05 (Média) | CT-11 |
| BUG-03 (Baixa) | CT-26 ×3 |
| BUG-08 (Baixa) | CT-48 |

O BUG-06 (CT-24 mobile) **passou** nesta execução. Ele já falhou em 2 de 4 execuções, então continua classificado como intermitente.
