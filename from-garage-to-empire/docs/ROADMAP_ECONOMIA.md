# Próximas etapas — economia e gestão empresarial

Referência principal: [ECONOMIA_E_FALENCIA.md](ECONOMIA_E_FALENCIA.md). Este roteiro traduz o conceito em entregas incrementais; exemplos de preços, salários, prazos e capacidades do documento ainda são propostas de balanceamento.

## Direção

Contratos financiam o crescimento da empresa; equipe, estrutura e produtos criam escolhas sobre capacidade, rentabilidade e risco. A primeira hora apresenta o jogo. As sessões seguintes devem permitir rever a estratégia, reinvestir e acompanhar clientes e produtos ao longo de dias.

Manter a experiência mobile: cenário legível, seis destinos de navegação, páginas e subabas em vez de rolagem ou redução global das fontes. Introduzir sistemas por fase da empresa, evitando apresentar todos na garagem.

## Base existente e diferenças para o conceito

- Há quatro tipos de contrato, requisitos de desbloqueio e fila. A equipe trabalha em um contrato ativo por vez; ainda não existe alocação entre projetos simultâneos.
- Há contratação, treinamento, promoção, salários, demissão e três escritórios. Especialidades, qualidade, motivação e departamentos ainda não existem.
- Há cinco operações independentes com níveis, marcos e automação. São uma base de receita recorrente; ainda não possuem desenvolvimento de produto, usuários ou churn.
- O save atual é v10, com operações, finanças, obrigações, falência, carreira, contratos com prazo e alocação da equipe; formatos v1–v9 são migrados.
- Custos sem saldo viram obrigações vencidas. Encerramentos arquivam um relatório antes de começar outra empresa.
- O offline está limitado a oito horas por ausência. A v0.4.1 intercala custos, entregas, ciclos de operação e parcelas por tempo empresarial; a validação numérica está em [VALIDACAO_CRISE.md](VALIDACAO_CRISE.md). Gatilhos irreversíveis ainda dependem de playtest.

## 1. Próxima entrega: financeiro compreensível

**Implementado na v0.3:** escala de 600 segundos por mês, projeção e realizado, registro agrupado e limitado de movimentações, subabas em Gestão e comparação antes de contratar ou expandir. Os cálculos e a migração v5→v6 têm testes automatizados. A conferência visual em celular ainda precisa ser feita; o balanceamento mensal continua ajustável após playtests.

**Resultado jogável:** antes de contratar, treinar ou expandir, o jogador consegue entender se terá caixa para sustentar a decisão.

- Definir uma escala única de tempo empresarial. Proposta inicial para simulação: um mês de jogo equivale a dez minutos reais, com trinta dias empresariais. Validar a cadência antes de fixar o balanceamento; não confundir esses meses com dias reais de retorno do jogador.
- Exibir caixa, receita mensal estimada, despesas mensais, resultado operacional e autonomia de caixa. Preservar a contagem em segundos no motor.
- Separar receita contratual estimada, receita recorrente automatizada e dinheiro efetivamente recebido. Uma operação manual parada não deve entrar na previsão contínua.
- Registrar entradas e saídas por categoria: entregas, operações, folha, sede, compras, treinamentos, resgates e devoluções. Comprar um equipamento reduz caixa, mas não deve parecer uma queda da receita operacional.
- Mostrar o resultado efetivo do período junto da projeção. Lucro estimado positivo não garante dinheiro antes da próxima entrega.
- Calcular consumo de caixa como `max(despesa mensal − receita mensal estimada, 0)`. Autonomia é caixa dividido por esse consumo; sem consumo, mostrar “sem queima de caixa”, evitando divisão por zero ou uma promessa de segurança absoluta.
- Adicionar comparação antes/depois nas decisões de equipe e escritório, incluindo saldo após o investimento e manutenção futura.
- Usar uma subaba Financeiro dentro de Mais/Gestão, com páginas de Resumo e Movimentações. Não adicionar uma sétima aba nem empilhar um painel na home.

**Critérios de conclusão:** projeções coerentes com o motor; registros conciliam com o caixa; investimentos e resgates não inflam lucro; cenários lucrativo, deficitário e sem receita são testados; save antigo mantém seus recursos; interface conferida no celular.

## 2. Obrigações, crise e recuperação

**Implementado na v0.4:** salários e sede não pagos persistem como obrigações; estado de crise e recuperação no Financeiro; venda de equipamentos, redução de sede, renegociação de aluguel e empréstimo único de 12 parcelas a 18%; retorno offline com aviso e acesso à recuperação; migração v6→v7 e testes do motor. A v0.4.1 passou a intercalar eventos em ordem temporal e ajustou a manutenção das sedes para tornar uma expansão prematura arriscada. [Cenários reproduzíveis e limites](VALIDACAO_CRISE.md). A conferência visual no celular e o balanceamento com jogadores ainda faltam antes de ativar falência.

**Resultado jogável:** crescer sem capital de giro passa a ter consequências previsíveis, com opções reais de recuperação.

- Registrar o custo devido integralmente. A parcela não paga vira obrigação em atraso, separada do caixa e de eventuais empréstimos.
- Definir vencimentos e ordem de liquidação. Receitas, vencimentos e pagamentos devem ser processados cronologicamente, tanto online quanto offline, sem simular horas por um laço de renderização.
- Estados explícitos: normal, alerta de caixa, crise e recuperação. Prejuízo ou caixa zero isoladamente não significam falência: considerar obrigações vencidas e a possibilidade de recuperação.
- Introduzir venda de equipamentos, redução de escritório e renegociação. A redução de sede precisa respeitar a capacidade da equipe; nenhuma demissão automática escondida.
- Reavaliar a atual devolução de 30% ao demitir: hoje é uma regra de jogo autorizada e implementada. O novo conceito pode justificar substituí-la por custos de desligamento, mas isso será uma mudança de balanceamento explícita, com aviso e migração quando necessária.
- Empréstimos só entram com principal, juros, parcelas, prazo, custo total e limite claros. Não permitir crédito infinito ou contratação automática de dívida.
- Ao voltar de uma ausência, apresentar a situação e uma janela de decisão antes de um encerramento irreversível. Definir e persistir essa proteção para que recarregar não renove o prazo nem gere dinheiro.

**Critérios de conclusão:** despesas não desaparecem; uma empresa pode entrar em crise e se recuperar; empréstimo não conta como faturamento; offline e online chegam ao mesmo estado para os mesmos eventos; regras de retorno não podem ser renovadas por reload.

## 3. Falência, relatório e nova empresa

**Implementado na v0.5:** gatilho com idade da crise, limite de dívida e prazo de recuperação; pausa persistida ao voltar offline; relatório baseado em dados registrados; carreira separada da empresa atual no save v8; recomeço confirmado com gravação única e backup. [Regras, cenários e limites](VALIDACAO_FALENCIA.md). A legibilidade no celular e o balanceamento com jogadores ainda precisam de validação.

**Resultado jogável:** uma empresa inviável encerra seu ciclo, mas o jogador conserva sua história e pode recomeçar conscientemente.

- Definir o gatilho após validar a crise: obrigações vencidas, limite de endividamento e prazo de recuperação. Valores precisam sair de simulações, não dos exemplos ilustrativos do conceito.
- Salvar um relatório da empresa: duração, receitas, caixa máximo, equipe máxima, contratos, produtos e evolução da dívida.
- Explicar a falência a partir de eventos registrados. Não inventar uma causa ou “decisão crítica” que o histórico não comprova.
- Separar dados da empresa atual de recordes e histórico da carreira. Arquivar o relatório antes de iniciar a nova empresa, com confirmação explícita do jogador e recuperação em caso de falha ao salvar.
- Manter informações financeiras básicas disponíveis desde o início. Metaprogressão pode desbloquear análises mais detalhadas e novas possibilidades, sem esconder informação essencial para evitar uma crise.

**Critérios de conclusão:** encerramento acontece uma única vez; reiniciar preserva recordes e configurações; não há mistura de caixa entre empresas; falha de armazenamento não apaga a empresa anterior.

## 4. Contratos como decisões de gestão

**Fases implementadas na v0.6.2:** desenvolvimento, testes e entrega, com progresso por fase e pagamento somente após a última. Trabalho total, prazos e saves são preservados; equipe e cliques percorrem as três fases. [Regras e testes](VALIDACAO_ETAPAS.md). Qualidade, bugs e retrabalho ainda não foram implementados.

**Capacidade implementada na v0.6.1:** cada dev pode trabalhar na fila de contratos ou ficar em reserva remunerada. A mudança exibe impacto em produtividade, tempo restante e pagamento antes de confirmar, sem reiniciar prazos. Save v10 preserva todos alocados ao migrar. [Regras e testes de alocação](VALIDACAO_ALOCACAO.md). Ainda há um único contrato ativo; projetos simultâneos e fases de produção continuam pendentes.

**Primeira entrega implementada na v0.6:** cliente por especialidade, complexidade descritiva, prazo por entrega, desconto único de 10% por atraso, análise antes de aceitar e histórico persistido de clientes. A fila inicia prazo ao entrar em produção; saves anteriores preservam a entrega em andamento sem penalidade. [Regras e testes](VALIDACAO_CONTRATOS.md). A etapa continua aberta para capacidade, fases, qualidade e relacionamento; conferência visual no celular e playtest ainda pendentes.

- Evoluir de tipos repetidos para contratos com cliente, pagamento, prazo e complexidade.
- Introduzir alocação da equipe e capacidade antes de permitir vários projetos simultâneos. Um funcionário não pode produzir integralmente em dois projetos ao mesmo tempo.
- Desenvolvimento, testes e entrega implementados; estimativa de duração já disponível. Falta qualidade antes de aceitar e consequências de bugs/retrabalho.
- Adicionar alterações de escopo com escolhas de preço, prazo e satisfação.
- Persistir clientes e histórico para gerar novos trabalhos coerentes com relações anteriores.

**Critérios de conclusão:** capacidade não é duplicada; atrasos e retrabalho têm causas visíveis; cliente e eventos sobrevivem ao reload; projetos antigos em andamento recebem tratamento de migração.

## 5. Pessoas, estrutura e produtos

- Acrescentar especialidades e atributos individuais persistidos: primeiro dev, designer e QA; gestão e departamentos quando houver escala suficiente para justificá-los.
- Introduzir motivação e sobrecarga com efeitos legíveis e meios de intervenção.
- Expandir escritórios com capacidade e manutenção compatíveis com a economia validada.
- Evoluir as operações atuais para produtos com investimento em desenvolvimento, lançamento, usuários, assinaturas e churn. Preservar investimentos anteriores ao migrar.
- Introduzir posicionamento da empresa e demanda; depois concorrentes, contratos enterprise, filiais e aquisições.
- Adicionar notícias e recordes ligados a acontecimentos reais. Paginar o histórico para manter a interface compacta.

## Validação da progressão de longo prazo

Simular e comparar uma agência enxuta, uma expansão agressiva e uma empresa híbrida de contratos e produtos. Medir primeira hora, retorno após oito horas e visitas ao longo de sete dias. Incluir crise recuperável, insolvência, troca de contrato, aumento de folha e saves antigos.

Os testes devem demonstrar consequências diferentes entre estratégias e oportunidades de recuperação. A atratividade por semanas e a legibilidade dependem também de partidas reais; uma simulação que acumula dinheiro não comprova retenção.

## Ordem de execução

Financeiro e registros → obrigações e recuperação → falência e histórico → contratos/capacidade → pessoas e departamentos → produtos e mercado.

As operações já implementadas permanecem como base. A prioridade seguinte é tornar seus resultados e os custos da empresa compreensíveis antes de adicionar mais multiplicadores ou penalidades.
