# Status da implementação

## Revisão responsiva v0.6.3

- Layout de retrato, tablet e paisagem revisto; tamanho do escritório separado do painel de ações. Fontes não são reduzidas automaticamente para encaixar conteúdo.
- Cartões e diálogos longos usam páginas calculadas pelo espaço disponível. Subabas da gestão quebram em duas colunas no celular estreito.
- Entregas e missões atualizam valores sem reconstruir repetidamente a aba aberta; cliques fora dos controles não reiniciam a navegação.
- Verificação de navegador reproduzível em `scripts/check-responsive.cjs`, com save isolado e capturas. [Escopo e reprodução](docs/VALIDACAO_RESPONSIVA.md).
- O formato do save continua v10. Seções anteriores abaixo registram entregas históricas; o estado da evolução econômica está no [roadmap](docs/ROADMAP_ECONOMIA.md).

## Financeiro v0.3

- Gestão agora oferece Financeiro, Movimentações e Configurações em subabas. Projeção mensal com receita de contratos e operações automatizadas, custos de equipe e sede, resultado, autonomia e realizado do mês; compras e missões ficam fora do lucro operacional.
- Meses de jogo têm 600 segundos de produção. A simulação offline é segmentada por mês sem perder o limite anterior de oito horas. Caixa e registro financeiro são reconciliados antes de salvar.
- Contratação e expansão mostram saldo, despesas, resultado e autonomia após o investimento antes da confirmação.
- Save v6 migra v1–v5 preservando saldo, contratos, equipe e operações; histórico anterior não é inventado. Lint, 77 testes, TypeScript e build de produção aprovados; assets Android sincronizados.
- Obrigações, empréstimos, crise e falência seguem planejados no [roteiro](docs/ROADMAP_ECONOMIA.md). Conferência visual no navegador ou aparelho ainda é necessária.

## Legibilidade e enquadramento

- Removidas as chamadas de redução automática de escala de toda a interface, inclusive diálogos. A paginação dos menus permanece.
- Textos e controles maiores; cabeçalho decorativo e tutorial saem da tela principal para liberar espaço ao cenário. Em janelas baixas, cenário e ações ficam lado a lado.
- Câmera inicia em aproximação de 1,4× com foco nas estações. Botão Ver escritório / Aproximar alterna com o enquadramento completo.
- Lint, 56 testes, TypeScript e build aprovados. Conferência visual em execução continua pendente; os testes não demonstram legibilidade ou ausência de cortes em todos os tamanhos.

## Remoção da rolagem interna

- Painéis de gestão, missões e ações não usam mais overflow automático. Paginação permanece como navegação entre cards.
- `src/ui/fit.ts` mede o conteúdo completo e o espaço disponível, reacomoda a largura e aplica escala quando necessário, preservando ações e textos dentro do painel. O ajuste é refeito em mudanças de estado, página e tamanho da janela.
- Confirmações e recibos também se ajustam à altura disponível. Cards da equipe e configurações têm espaçamentos mais compactos.
- Lint, 54 testes, TypeScript e build aprovados. Validação visual/legibilidade em aparelhos e zoom continua pendente; não há navegador conectado nesta sessão.

## Gestão da equipe e acabamento dos menus

- Equipe separada em Equipe atual / Contratar, com paginação independente ao alternar entre as duas opções.
- Demissão com confirmação, cancelamento e devolução de 30% do investimento em contratação e treinamentos, arredondada para baixo. Salários não entram no retorno. O save v4 guarda o investimento individual; saves anteriores recebem estimativa conservadora identificada na confirmação.
- Demissões reavaliam os requisitos: filas incompatíveis são canceladas, contratos não iniciados voltam ao melhor permitido, e um contrato já em andamento pode terminar uma vez. Nova contratação reutiliza uma identidade vaga sem duplicar devs atuais.
- Cards de contratos, upgrades e equipe receberam agrupamento visual, destaques de disponibilidade e ações consistentes. Upgrades no limite não exibem produção fictícia de um nível extra.
- Lint, 54 testes, TypeScript e build aprovados. Conferência visual interativa continua pendente.

## Grade de missões pendentes

- Missões resgatadas deixam de aparecer; o histórico permanece salvo para impedir resgate duplicado.
- Duas missões por página em telas compactas e quatro em telas maiores. Ao resgatar, os próximos objetivos preenchem os espaços; a página é ajustada quando a última fica vazia.
- Paginação desaparece quando resta uma página. Ao concluir todas, uma mensagem substitui os cards.
- Lint, 49 testes, TypeScript e build aprovados; conferência visual interativa permanece pendente.

## Layout com altura da janela

- Missões movidas para uma sexta aba na navegação. A tela principal mantém cenário, contrato e expansão compacta.
- `viewport.css` limita o jogo a 100dvh, distribui a altura disponível e mantém a navegação visível. ResizeObserver atualiza a escala do cenário quando o painel muda de tamanho.
- Equipe, upgrades, contratos, missões e gestão têm paginação (um card em telas estreitas/baixas; dois em telas maiores). Conteúdos excepcionalmente altos mantêm rolagem interna para não cortar controles, sem alongar a página inteira.
- Lint, 49 testes, TypeScript e build aprovados. Inspeção visual ainda indisponível: inventário do provedor sem navegadores conectados.

## Missões curtas

- Cinco objetivos independentes na tela principal, com progresso, recompensa, botão de resgate e estado concluído.
- Metas de entregas, primeira contratação, promoção real para pleno e pico de lucro estimado líquido de despesas operacionais.
- Save v3 migra v1/v2, persiste resgates e permite contabilizar entregas offline. Resgate inválido ou repetido não paga; falha de gravação restaura o estado anterior em memória.
- Lint, 49 testes, TypeScript e build aprovados. Inspeção visual interativa permanece pendente nesta sessão.

## Salários e contratação por cargo

- Salário por nível recebe ×1,3 para pleno e ×1,69 para sênior; folha e cálculo offline usam a mesma regra. Cards mostram salário antes/depois do treinamento.
- Contratação direta de júnior (nível 1), pleno (10) e sênior (20). Experientes custam o investimento de formação acrescido de 25%, com aumento pelo tamanho da equipe.
- Saldo e vagas são validados pela economia; contratação experiente preserva os requisitos dos contratos. Compatível com saves existentes.
- Validação: lint, 44 testes, TypeScript e build aprovados. Conferência visual interativa permanece pendente.

## Retratos e carreira da equipe

- Retratos SVG individuais para os seis devs, compartilhando paleta, cabelo e acessórios com os personagens do cenário.
- Cargo derivado do nível: júnior (1–9), pleno (10–19, +50% de produção), sênior (20, +100%). Promoção automática ao treinar; bônus também vale offline.
- Card mostra próxima promoção, produção antes/depois e botão destacado no nível anterior à promoção. Aviso identifica a pessoa promovida.
- Saves atuais preservados, sem novo campo ou alteração do limite de treinamento (20). Inspeção visual em navegador continua pendente.
- Validação: lint, 40 testes, TypeScript e build aprovados.

## v0.2 — progressão e identidade visual

Novo feedback do playtest: era possível pular projetos, a dificuldade era baixa e a expansão pouco alterava o ambiente. Esta revisão substitui o balanceamento e a direção visual anteriores.

- Sequência de contratos com entregas anteriores, nível individual dos devs, sede e reputação; checklist na interface.
- Trabalho dos projetos: 100 / 800 / 4.000 / 22.000; pagamentos ajustados. Simulação a dois toques/s entrega o primeiro app em 24min38. Estratégia e limites em `BALANCE.md`.
- Garagem industrial, estúdio renovado e coworking com arquitetura e disposição próprias; reconstrução explícita do cenário ao expandir.
- Interface azul-escura e âmbar, textos mais diretos e rota numerada de contratos. Pesquisa e fontes em `docs/VISUAL_REFERENCES.md`.
- Save v2 preserva ativos e percentual do contrato anterior, com exceção para uma entrega herdada e arquivo original `.pre-v2`. Histórico por tipo começa nesta versão.
- Atualização web descoberta pela interface e aplicada após salvar. Versão do pacote e Android: 0.2.0 / versionCode 2.
- Validação final: lint, 36 testes, TypeScript e build aprovados; assets sincronizados com Android. Preview, bundles e service worker responderam HTTP 200. Build nativo ainda depende de JDK/SDK, conforme limites abaixo.
- Inspeção visual interativa continua pendente: não há navegador conectado nesta sessão. A simulação automatizada não substitui playtest.

As seções abaixo registram as entregas anteriores; seus números de testes e descrições visuais são históricos.

## Acabamento do cenário e personagens

Após o teste manual, o usuário considerou a progressão inicial boa e priorizou o cenário e os personagens. As regras, os preços, o ritmo e o esquema de save foram mantidos.

- Personagens redesenhados com sete combinações de aparência, cabelos, roupas, óculos e fones; braços articulados, piscadas, respiração, digitação e celebração.
- Fundador reage ao trabalho manual; equipe alterna a digitação com pausas cosméticas, sem afetar a produção.
- Garagem com luzes quentes, relógio, acabamento de madeira, detalhes no tapete e caixa de pizza; estação de café nos escritórios evoluídos e prédios na janela do coworking.
- Monitores com código colorido e cursor, vapor na caneca, poeira sutil na luz e gato com respiração, cauda e reação ao toque.
- Ordem de profundidade por estação para melhorar a sobreposição de mesas e pessoas; confetes em pool substituem o flash de tela inteira nas entregas.
- Redução de movimento desliga efeitos ambientais e movimentos dos personagens. Todos os efeitos ficam na camada visual.
- Validação: TypeScript, lint, 23 testes e build aprovados. A nova aparência ainda precisa de conferência visual no navegador do usuário; o provedor desta sessão continua sem navegador conectado.

## Primeira fatia vertical — 21/09/2026

### Feito

- Projeto Vite/Phaser/TypeScript strict isolado do aplicativo de açougue.
- GameState e economia centralizada; contratos/reputação/XP, fila entre contratos, Focus/Deep Work.
- Garagem original em perspectiva, fundador animado, pool de textos, reação ao trabalho e personagens interativos.
- Interface responsiva com cinco abas, acessibilidade básica, contraste, foco por teclado e redução de movimento.
- Cinco upgrades visíveis, contratação e treinamento, trabalho passivo e salários.
- Garagem melhorada e coworking, capacidade por estágio e diálogo de expansão.
- Save local versionado com esquema, invariantes, backup, aviso de corrupção/quota e bloqueio de downgrade.
- Offline de até oito horas com recibo persistido sem coleta duplicada; relógio negativo não gera renda.
- Autosave e lifecycle web/Capacitor; trava multiaba quando Web Locks está disponível.
- Efeitos sintetizados, trilha opcional e haptics; configurações persistidas.
- Catálogos pt-BR/en-US, estatísticas e tutorial contextual.
- Interfaces de ads, compras, analytics, áudio e save; mocks comerciais sem conceder compras/recompensas falsas.
- Service worker de produção com assets locais versionados.
- Projeto Android gerado pelo Capacitor e sincronizado; API 36, portrait, variantes debug/release, assinatura via variáveis e proteção contra release sem chave.
- README, arquitetura, design, balanceamento e guia de release Android.

### Verificação

- ESLint aprovado.
- 23 testes Vitest aprovados: economia, compra/capacidade, salários, fila, Focus, offline, relógio, save/backup/corrupção/quota, números, paridade dos idiomas e simulação da progressão inicial a dois toques por segundo.
- TypeScript strict e build Vite aprovados.
- Preview local em `http://127.0.0.1:4173`: HTML, CSS, bundles JavaScript e service worker responderam HTTP 200. Essa checagem confirma entrega dos arquivos, sem substituir inspeção visual ou execução de gameplay no navegador.
- Auditoria npm após correção das dependências: zero vulnerabilidades reportadas.
- Sincronização final `cap sync android` aprovada. Manifest XML válido; API 36 e portrait configurados. Java disponível: 8; Android SDK ausente no caminho padrão e sem ANDROID_HOME/ANDROID_SDK_ROOT. Build nativo exige JDK 21 e SDK Android antes de poder ser verificado.
- Build inicial: aproximadamente 1,21 MB de Phaser (332 KB gzip) e 118 KB de aplicação (38 KB gzip), sem arte/fontes remotas.
- Inspeção visual pelo navegador conectado indisponível nesta sessão: inventário sem navegadores e criação da aba recusada pelo provedor. Não afirmar validação visual em aparelho, 60 FPS ou ergonomia final.

### Em andamento / próxima validação

- Conferência visual interativa a 320/390/768/1440 px, tocar/comprar/contratar, recarregar e retornar offline.
- Playtest dos primeiros cinco minutos para ajustar as metas de progressão.
- Android: build e execução nativos dependem de SDK/JDK apropriados; APK/AAB ainda não gerados.

### Pendente por fase

Segunda fase: cargos adicionais, pequeno escritório, missões/achievements, caminhada/conversa, celebrações mais elaboradas e indicadores de acessibilidade auditados em dispositivos.

Terceira fase: departamentos, produtos/MRR, eventos, investidores, aquisições, mapa, prestige/Founder Points/Founder Tree. Sem funcionalidades vazias ou telas anunciando sistemas falsamente disponíveis. Testes de prestige entram com a implementação desse sistema.

Release candidate: SDKs reais de anúncios/billing, consentimento, política pública, crash reporting se adotado, arte final Android, assinatura e AAB validado em Play Console. **Esta entrega é uma primeira versão jogável; não é release comercial nem promessa de publicação concluída.**
