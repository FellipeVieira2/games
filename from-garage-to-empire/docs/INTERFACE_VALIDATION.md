# Validação da interface

## Verificado nesta revisão

- ESLint, 56 testes Vitest, TypeScript e build Vite aprovados.
- Build inclui os últimos ajustes de legibilidade da equipe, antes pendentes de compilação.
- Assets sincronizados com o projeto Android local; isso não equivale a build ou teste nativo.
- Preview reiniciado em http://127.0.0.1:4173/; HTML, CSS, JavaScript e service worker responderam HTTP 200.

## Bloqueio da conferência visual

O provedor de interface retornou inventário vazio e recusou criar uma aba com “Browser is not available: iab”. Não foi possível confirmar visualmente legibilidade, ausência de cortes, tamanho de toque ou ausência de rolagem. O item de finalização visual permanece aberto.

## Critérios para fechar o item

Testar 320×568, 390×844, 412×915 e uma janela desktop, também alternando a orientação e pt-BR/en-US. Usar um save inicial e outro com equipe completa.

| Tela | Conferência necessária |
| --- | --- |
| Empresa | Cenário visível; trabalho, saldo e expansão acessíveis sem rolar; fila e contrato herdado não escondem ações. |
| Equipe atual | Nome, cargo, produtividade e salário legíveis; alternância Visão geral/Evolução; treinamento e demissão acessíveis. |
| Contratar | Os três cargos, salário e preço visíveis; limites de vagas e saldo claros. |
| Upgrades | Efeito e custo legíveis; nível máximo sem promessa de melhoria adicional; páginas acessíveis. |
| Contratos | Pagamento, trabalho e requisitos legíveis; estado ativo/fila/bloqueado claro. |
| Missões | Vários objetivos visíveis; resgate repõe o espaço com a próxima missão; última página e estado vazio corretos. |
| Mais | Estatísticas e todas as configurações acessíveis por paginação. |
| Diálogos | Confirmar e cancelar sem cortes; recibos offline e alertas de save completamente legíveis. |

As telas de equipe não usam escala automática. Outras telas ainda usam ajuste de escala; conferir se isso prejudica leitura antes de considerar a interface finalizada. Não basta ocultar barras de rolagem: todo controle precisa permanecer visível e utilizável.
