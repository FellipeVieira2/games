# From Garage to Empire — Game Design v0.2

> Direção de evolução atual: [Economia e falência](docs/ECONOMIA_E_FALENCIA.md), organizada em entregas no [roteiro de economia e gestão](docs/ROADMAP_ECONOMIA.md). Dívida e recuperação entraram na v0.4; falência e carreira, na v0.5.

## v0.6 — Clientes e prazos

Na v0.6.2, contratos percorrem desenvolvimento, testes e entrega (70%/25%/5% do trabalho). A home mostra a fase e seu progresso, com detalhamento ao tocar no nome. Recebimento e fila só avançam após a entrega; a duração total foi preservada. Qualidade e retrabalho ainda estão pendentes. [Regras das etapas](docs/VALIDACAO_ETAPAS.md).

Na v0.6.1, cada dev pode ser alocado aos contratos ou à reserva remunerada, com comparação de capacidade, prazo restante e pagamento antes de confirmar. A equipe acompanha a fila sem duplicar produção. Save v10 migra todos como alocados. [Regras da alocação](docs/VALIDACAO_ALOCACAO.md).

Contratos agora têm cliente, prazo e consulta de duração e resultado antes de aceitar. Atrasos reduzem o pagamento em 10%; landing pages permanecem sem prazo. O histórico de clientes e os prazos ficam no save v9, preservando a entrega ativa de saves anteriores. Esta é a primeira parte da etapa 4; alocação, fases, qualidade e satisfação ainda estão no roadmap. [Regras e validação](docs/VALIDACAO_CONTRATOS.md).

## v0.5 — Falência e carreira

A empresa só encerra após crise prolongada, obrigações acima de um limite visível e prazo de recuperação esgotado. No retorno offline, a produção pausa para permitir decisões antes de qualquer encerramento. O relatório explica o resultado com valores registrados e guarda contratos, operações e trajetória da dívida. Confirmar o recomeço arquiva esse relatório no mesmo save que cria a nova empresa; recordes e configurações continuam. Veja a [validação da falência](docs/VALIDACAO_FALENCIA.md).

## v0.4 — Obrigações e recuperação

Salários e sede vencidos continuam devidos quando o caixa acaba. Novas receitas pagam automaticamente salários, sede e parcelas vencidas, nessa ordem. O Financeiro mostra obrigações e dívida total; a subaba Recuperação apresenta venda de equipamento, redução de sede sujeita à capacidade da equipe, renegociação do aluguel vencido e crédito com 18% de custo total em 12 parcelas. O retorno offline mostra atrasos e leva à recuperação. A demissão ainda devolve 30% do investimento, como regra existente. Não há encerramento automático da empresa nesta etapa.

## v0.3 — Primeira etapa financeira

A aba Gestão traz Financeiro, Movimentações e Configurações. O Financeiro converte as taxas do motor em um mês empresarial de dez minutos, apresenta receita contratual estimada, renda automatizada, salários, sede, resultado e autonomia do caixa. Também compara o realizado no mês com a projeção. Um registro limitado agrupa movimentos por categoria e mês; saves anteriores entram com o caixa preservado como saldo inicial. Antes de contratar ou expandir, o jogador vê o caixa e o resultado estimados após a decisão.

O resultado realizado usa custos efetivamente pagos; a v0.4 mostra separadamente as obrigações ainda não quitadas.

## Promessa

Uma ideia começa em uma garagem. O jogador deve **ver** a empresa crescer: pessoas ocupam mesas, hardware aparece e o escritório ganha luz, móveis e espaço. A v0.2 adota uma interface de estúdio independente: painéis azul-escuros, controles âmbar, rótulos curtos e ambientes com materiais reconhecíveis. Veja [referências e decisões](docs/VISUAL_REFERENCES.md).

## Fatia entregue

Trabalhar gera unidades de trabalho; entregar contratos gera dinheiro, XP e reputação. Café e teclado aumentam trabalho por toque. Monitor, notebook e fibra multiplicam produção. O primeiro dev trabalha automaticamente, com salário em dinheiro por segundo. A equipe repete o contrato ativo; escolher outro coloca uma próxima entrega na fila.

Focus cresce a cada toque e decai com tempo. Aos 100 pontos começa Deep Work por dez segundos, dobrando trabalho manual e da equipe. O botão comprime, o fundador reage, textos flutuam, há som e haptic opcionais. O primeiro projeto leva aproximadamente 50–65 toques com cadência contínua; essa estimativa depende da cadência.

O jogador tem seis destinos: Empresa, Equipe, Upgrades, Contratos, Missões e Mais. A home preserva o cenário como principal elemento visual; a navegação fica na base no celular. Menus mostram ações reais e explicam bloqueios por dinheiro, reputação ou capacidade. A UI não vende moedas nem promete recompensas publicitárias inexistentes.

## Crescimento visual

1. Garagem: fundador, notebook, caixas, quadro, janela, planta, gato dormindo.
2. Estúdio renovado: piso de madeira, janela de oficina, quadro de projetos, café e três vagas de funcionários.
3. Coworking: fachada de vidro, área de reunião, rack, outra distribuição de mesas e seis vagas. O indicador da sede mostra o estágio atual entre os três implementados.

Comprar café adiciona caneca; teclado aparece na mesa; segundo monitor adiciona tela; notebook novo troca o computador; fibra adiciona roteador. Contratar acrescenta uma estação e um personagem com retrato individual no card. Treinamento promove a pleno no nível 10 e sênior no nível 20, com bônus de produtividade e aviso de promoção. Animações de caminhada/conversa estão planejadas.

Os personagens do cenário têm aparência individual, braços articulados, piscadas e respiração. O fundador digita em resposta aos toques; funcionários alternam trabalho e pequenas pausas cosméticas. Entregas geram uma celebração breve e confetes discretos. Vapor do café, luzes quentes e o gato reagindo ao toque dão vida à garagem. Os efeitos respeitam redução de movimento e não modificam a economia.

## Economia simples

Contratos seguem uma sequência obrigatória: landing page, restaurante, loja virtual e app. Avançar exige entregas anteriores, devs treinados individualmente, sede e reputação. O checklist de cada contrato mostra o que falta. Os projetos avançados exigem mais trabalho, com pagamento por unidade maior; custos e tempos simulados estão em [BALANCE.md](BALANCE.md).

Receita chega por entrega. Salários e infraestrutura consomem dinheiro, com piso de saldo zero; nesta fase não há dívida, demissão automática ou bloqueio do trabalho. O lucro/s é uma estimativa do contrato ativo, distinguida do pagamento efetivo. Receita offline paga despesas e rende até oito horas. Tutorial em quatro passos permanece contextual; só recibos de retorno, expansão e problemas de save usam diálogo.

## Próximas fatias

- Completar a segunda fase: variedade de cargos, missões, achievements, pequenos eventos visuais, animação de caminhada, mais escritórios e testes de cadência em aparelhos reais.
- Terceira fase: produtos/MRR, departamentos, eventos com escolhas, investidores, prestige/Founder Tree e economia de longo prazo, cada sistema acompanhado por testes e migração quando alterar o save.
- Release candidate: arte final, ícone/splash próprios, Android validado, assinatura, AAB, anúncios recompensados voluntários, billing oficial, consentimento e declarações de dados dos SDKs efetivamente adotados.

Sem loot boxes, energia, banners sobre a área de trabalho, pagamento externo por bem digital ou coleta desnecessária de informações pessoais.
