# Revisão responsiva — v0.6.3

O layout usa uma altura de viewport definida, com navegação e cabeçalhos reservando seu espaço. O escritório ocupa o espaço restante; o painel de trabalho tem tamanho determinado pelo conteúdo, sem crescer até consumir a cena.

## Mudanças

- Retrato em celular e tablet usa composição vertical. Paisagem tem escritório e ações lado a lado quando há largura suficiente.
- Regras finais de geometria ficam em `src/ui/responsive.css`, carregado depois dos estilos visuais anteriores. Evitam as combinações conflitantes de altura, colunas e posicionamento absoluto.
- A paginação externa considera a largura e a altura disponíveis. Cartões e diálogos que excedem o espaço são divididos em páginas de conteúdo, preservando os controles e o tamanho das fontes.
- Indicadores financeiros, extratos, configurações e requisitos podem ser separados em blocos menores sem perder seus valores ou ações. Gestão usa duas colunas de subabas em telas estreitas.
- A equipe em paisagem usa um cartão por vez, com retrato e ações organizados horizontalmente quando couberem.
- A navegação responde a mudanças na janela e no viewport visual. O conteúdo oculto por paginação não ocupa espaço nem recebe foco.
- Entregas automáticas deixaram de reconstruir a aba aberta. Missões atualizam progresso e disponibilidade sem recriar seus botões. Cliques no conteúdo não são interpretados como seleção da aba raiz.

## Verificação reproduzível

`scripts/check-responsive.cjs` usa Edge headless via Playwright, em contexto isolado com save de teste. O save real do jogador não é acessado. O roteiro confere limites dos elementos visíveis, erros JavaScript e navegação por páginas internas, além de salvar capturas.

Tamanhos da matriz: 320×568, 360×640, 667×375, 844×390, 768×1024 e 1280×720. Inclui as seis abas principais, contratos, subabas da gestão, treinamento, contratação, etapas e diálogo de alocação.

Resultado da execução desta versão: **142 estados verificados, sem cortes detectados nos elementos inspecionados e sem erros JavaScript**. Capturas de celular, equipe em paisagem e tablet também foram inspecionadas visualmente. O roteiro percorre as páginas internas; não comprova todos os estados possíveis de uma partida.

Para repetir, execute o servidor Vite em `127.0.0.1:4180`, defina `PLAYWRIGHT_PATH` para uma instalação disponível de Playwright e rode `node scripts/check-responsive.cjs` na pasta do jogo. `LAYOUT_SIZES` pode selecionar tamanhos como `[[320,568],[667,375]]`. Capturas e resultados ficam em `.layout-check/`, ignorada pelo Git. Playwright não foi adicionado às dependências do jogo.

Essa verificação usa viewport de navegador; não substitui teste em aparelho Android, teclado virtual ou configurações extremas de fonte do sistema. O balanceamento, os contratos e o formato do save permanecem os mesmos.
