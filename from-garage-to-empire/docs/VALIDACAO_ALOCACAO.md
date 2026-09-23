# Alocação da equipe — v0.6.1

Segunda entrega da etapa 4: capacidade explícita para a fila de contratos da agência. Ainda existe apenas um contrato em produção. Esta versão prepara a capacidade antes de introduzir projetos simultâneos; não acrescenta outra fonte de produção para funcionários em reserva.

## Como usar

Em **Equipe → Equipe Atual → Visão geral**, cada profissional mostra **Nos contratos** ou **Em reserva**. O botão **Alterar** apresenta produtividade total, tempo restante da entrega atual e pagamento previsto antes/depois. Confirmar aplica e salva a mudança; falha de gravação restaura a alocação anterior.

O resumo mostra a contribuição atual do profissional: zero quando está em reserva. A aba Evolução conserva as informações de carreira e produtividade potencial. A animação do escritório também respeita a alocação.

## Regras

- Apenas devs alocados aos contratos contribuem para a produção automática. Cada profissional contribui uma única vez. A alocação acompanha renovações e mudanças na fila.
- Reserva continua ocupando vaga e recebendo salário integral. Não concede bônus de descanso, qualidade ou produtividade; esses sistemas ainda não existem.
- Retirar ou devolver um dev não reinicia progresso nem prazo. Cliques do fundador continuam funcionando, inclusive sem equipe alocada.
- A comparação considera trabalho restante, prazo persistido, equipe atual e ausência de cliques/foco. Sem produção automática, a duração depende dos cliques e o pagamento previsto fica indeterminado.
- As previsões de receita e contratação consideram capacidade alocada e desconto por atraso. Contratar um dev que permita cumprir o prazo recupera o pagamento integral na projeção.
- Contratações entram na produção por padrão. Treinar alguém em reserva aumenta sua capacidade potencial; demitir remove sua reserva para não afetar uma contratação posterior que reutilize a vaga.
- Desbloqueios ainda dependem da equipe contratada, experiência e sede; a capacidade alocada determina a duração. Operações continuam independentes, sem consumir nem duplicar produção dos devs.
- Save v10: migração v1–v9 mantém todos alocados, preservando a produtividade anterior. IDs reservados duplicados ou inexistentes são rejeitados. Nova empresa começa sem reservas herdadas.

## Validação

Oito testes em `src/tests/allocation.test.ts` verificam orçamento sem mutação, prazo fixo, salários, trabalho manual, fila, paridade online/offline, treinamento, demissão/recontratação, migração, persistência via SDK e previsão de contratação. A suíte completa tem 110 testes.

Pendente: conferir visualmente a equipe e o diálogo em celular, incluindo paisagem. A mudança reutiliza a área do resumo, sem reduzir fontes globalmente; isso não substitui verificação no aparelho.

## Continuação do roadmap

Faltam fases de desenvolvimento, testes e entrega, qualidade e alocação entre projetos simultâneos. A reserva é uma base de capacidade, não uma nova estratégia lucrativa por si só. Satisfação, alterações de escopo e ofertas por relacionamento continuam pendentes.
