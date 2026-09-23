# Referências e direção visual — v0.2

Pesquisa de 21/09/2026, após o feedback de que a tela inicial parecia genérica e as mudanças de escritório eram pouco perceptíveis. As páginas oficiais abaixo orientaram decisões de produto; a arte, os personagens e o código de cenário deste projeto são próprios.

| Referência                                                                                                         | Evidência consultada                                                                                                                          | Aplicação neste jogo                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [AdVenture Capitalist — Hyper Hippo](https://hyperhippo.com/games/adventure-capitalist/)                           | A descrição oficial articula clicar, contratar funcionários, comprar upgrades e crescer o negócio.                                            | Tornar trabalho, produção automática e próximo investimento fáceis de distinguir; botão de trabalho âmbar e renda passiva verde. |
| [Game Design: Behind the Scenes — Kolibri Games](https://www.kolibrigames.com/blog/game-design-behind-the-scenes/) | O relato da equipe de Idle Miner Tycoon descreve a colaboração entre arte e design e o cuidado com personagens e ambientes com personalidade. | Cada sede ganha arquitetura e distribuição próprias; funcionários mantêm aparência e movimentos individuais.                     |
| [Catálogo oficial — Codigames](https://codigames.com/games/)                                                       | Jogos de negócios como Idle Supermarket Tycoon apresentam expansão de instalações e gerenciamento como parte da fantasia.                     | A expansão compra espaço visível: garagem industrial, estúdio reformado e coworking envidraçado, além das vagas novas.           |
| [Kittens Game — repositório público](https://github.com/nuclear-unicorn/kittensgame)                               | Projeto incremental aberto consultado como referência complementar do gênero.                                                                 | A direção adotada mantém números e requisitos explícitos na interface. Não foi reutilizado código ou balanceamento do projeto.   |

As aplicações são interpretações para este jogo; não são conclusões de pesquisa com usuários nem medições das interfaces dessas referências.

## Identidade adotada

Um pequeno estúdio de software em funcionamento: superfícies sólidas azul-escuras, controles âmbar, rótulos curtos em monoespaçada e ilustração de escritório com materiais reconhecíveis. Nomes de contratos descrevem entregas reais, como landing page, loja virtual e aplicativo. O indicador da sede mostra apenas o estágio atual, sem sugerir cenários ainda indisponíveis.

- **Garagem:** portão metálico, concreto, paredes de tijolo, ferramentas, peças guardadas e mesas improvisadas.
- **Estúdio:** piso de madeira, parede azul, janela de oficina, quadro de projetos, armário e estação de café; três vagas.
- **Coworking:** fachada de vidro com prédios, área de reunião, rack e estações em outra disposição; seis vagas.
- **Contratos:** rota numerada, checklist, contadores de entregas e bloqueios explícitos. Selecionar um projeto exige concluir o anterior e preparar a equipe.

Os personagens vetoriais existentes continuam com sete aparências, digitação, piscadas, respiração e reação a entregas. O novo layout reposiciona as estações e os efeitos junto com a sede. Redução de movimento desativa as transições e animações cosméticas.

## Conferência visual pendente

TypeScript e build validam a integração do desenho, mas não demonstram composição, sobreposição ou legibilidade em execução. O navegador conectado desta sessão não está disponível. Conferir no playtest: início em 320/390 px, todas as vagas ocupadas em cada sede, transição ao expandir, textos de requisitos e redução de movimento. O preview local serve a versão 0.2.
