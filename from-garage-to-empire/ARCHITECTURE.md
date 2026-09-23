# Arquitetura

## Decisões

TypeScript strict + Phaser 3.90 + Vite + Capacitor 8. A pasta já abrigava outro produto Next.js. O jogo tem package.json, lockfile, build e documentação próprios, sem modificar o produto existente. A documentação local de TypeScript do Next foi consultada antes da implementação; o include do produto existente não engloba `games/`.

O palco é 720×525 unidades lógicas, ajustado com `Phaser.Scale.FIT` dentro de um painel responsivo. A referência vertical 1080×1920 orienta proporções e ergonomia; não fixa o tamanho físico do canvas nem escala texto HTML como imagem. O layout se reorganiza em uma coluna abaixo de 700 px. Safe areas usam `env(safe-area-inset-*)`.

## Camadas

| Caminho                           | Responsabilidade                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `src/config/balance.ts`           | Custos, progressão, upgrades, contratos, capacidade e limites                       |
| `src/core/state.ts`               | GameState, fábrica e esquemas Zod v1/v2                                             |
| `src/core/progression.ts`         | Requisitos de entregas, equipe, sede e reputação compartilhados entre economia e UI |
| `src/scenes/OfficeEnvironment.ts` | Arquitetura e distribuição de estações específicas por sede                         |
| `src/services/web-update.ts`      | Descoberta de atualização web e aplicação após salvar                               |
| `src/core/economy.ts`             | Ações e simulação determinística por tempo injetado                                 |
| `src/scenes/OfficeScene.ts`       | Ambiente, profundidade, efeitos e pools de textos/confetes                          |
| `src/scenes/OfficeCharacter.ts`   | Aparência e rig vetorial dos personagens; digitação, respiração e piscadas          |
| `src/ui/`                         | Navegação acessível, HUD, cards, diálogos, callbacks de intenção                    |
| `src/storage/save.ts`             | Migração/validação, save primário, backup e falhas                                  |
| `src/services/contracts.ts`       | AdService, PurchaseService, AnalyticsService, SaveService, AudioService             |
| `src/services/mocks.ts`           | Analytics de console em dev e integrações comerciais desabilitadas                  |
| `src/services/platform.ts`        | Pause/resume e haptics via Capacitor ou APIs web                                    |
| `src/audio/audio.ts`              | AudioManager web, notas e efeitos sintetizados sem assets externos                  |
| `src/i18n/`                       | Catálogos completos pt-BR/en-US e interpolação                                      |
| `src/main.ts`                     | Composição, timer, autosave, lifecycle e coordenação de efeitos                     |
| `src/tests/`                      | Economia, persistência, relógio, formatação e paridade dos idiomas                  |

A UI emite intenções; a composição chama as funções de economia, salva, publica feedback e pede atualização visual. A cena recebe apenas leitura do estado e um callback cosmético. Regras não importam Phaser, DOM, Capacitor, anúncios ou compras. As funções alteram um único GameState de forma síncrona, validado na fronteira de persistência. Não há necessidade de ECS, event bus global ou framework de UI para esta fatia.

## Tempo e persistência

Missões são definidas em `src/config/missions.ts`, avaliadas/resgatadas em `src/core/missions.ts` e renderizadas em `src/ui/missions.ts`. O esquema atual é v3: acrescenta resgates, promoções e maior lucro estimado observado. A migração v2 preserva ativos/histórico e inicia os campos novos; v1 também chega à v3 pela transformação descrita abaixo. A composição salva cada resgate e desfaz a alteração em memória quando a gravação falha.

O foreground usa `performance.now()` em intervalos de 100 ms, calculando o delta real. Phaser renderiza independentemente, com alvo de 60 FPS. No background, o loop visual dorme e o áudio suspende. Resume calcula a ausência a partir do watermark salvo, sem retrocedê-lo em mudanças negativas do relógio. Deltas são limitados a oito horas. Cliques não se repetem automaticamente por tecla pressionada; ativação de botão segue eventos padrão do navegador.

Autosave a cada dez segundos, além de entregas, compras, contratação, treinamento, expansão, mudança de contrato/configurações e background. `pendingOffline` representa um recibo de valores já creditados, persistido antes de abrir o diálogo. Fechar/recarregar não duplica o prêmio. Sem mutex multiaba nativo, ambientes sem Web Locks não têm garantia de exclusividade; validar WebView alvo antes do release.

`migrate` transforma a v1 em v2 preservando ativos e percentual do contrato em andamento. Histórico por tipo começa em zero porque a v1 só guardava o total. `legacyContract` permite concluir uma entrega herdada sem os novos requisitos; a economia remove essa exceção na conclusão. Filas incompatíveis são removidas. A chave principal continua a mesma, e `.pre-v2` arquiva o original antes da gravação, inclusive ao recuperar um backup antigo. Saves futuros bloqueiam downgrade. Dados corrompidos nunca são sobrescritos silenciosamente. Falha de quota mostra aviso persistente no rodapé.

## Performance, números e ativos

Arte original feita com Graphics: sem downloads de imagens/fontes, sem marcas reais, sem licença externa para arte/sons. Lucide usa ISC; Phaser usa MIT. A cena só é reconstruída ao mudar escritório, equipamentos, equipe ou redução de movimento. Textos flutuantes usam pool e tweens são limpos ao destruir a cena. Listeners são removidos em dispose/HMR.

Dinheiro do simulador usa `number` (não é sistema financeiro real). O esquema rejeita NaN, infinito e valores fora do limite; o formatador Intl compacta números. O conteúdo desta fase fica confortavelmente dentro da precisão de double. **Notação logarítmica/decimal para magnitudes do endgame ainda é pendente** e exigirá migração antes de conteúdo dessa escala.

## Offline e distribuição

O build produz um service worker com lista explícita dos assets locais e cache versionado. Instalação deve terminar completamente para garantir offline. A UI avisa sobre um worker em espera; o jogador aplica a atualização, e a página só solicita sua ativação depois de salvar com sucesso. Android carrega `dist` empacotado. Nenhum backend, tracker, ad SDK ou billing SDK é incluído nesta fase.

Referências consultadas: [escala do Phaser](https://docs.phaser.io/phaser/concepts/scale-manager), [Capacitor 8 / Android API 36](https://capacitorjs.com/docs/updating/8-0).
