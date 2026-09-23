# Balanceamento v0.2

## Demissão e recuperação de investimento

A aba Equipe separa funcionários atuais e contratação. Demitir exige confirmação e devolve `floor(investimento × 0,30)`. Investimento inclui o valor efetivamente pago na contratação e nos treinamentos; não inclui salários. A receita acumulada de contratos não aumenta com essa devolução.

O save v4 registra o investimento por identidade. Para saves anteriores, estima-se o custo original de contratar um júnior na posição correspondente e treiná-lo até o nível atual, sem prêmio de contratação direta. A confirmação informa que o valor é estimado. A demissão remove o registro; repetir a ação não paga novamente.

Contratos são reavaliados ao desligar um dev. Filas sem equipe suficiente são canceladas. Uma entrega já iniciada pode terminar uma vez; contratos ainda não iniciados voltam imediatamente ao melhor contrato disponível. Os requisitos precisam ser cumpridos para novas entregas. Contratar novamente ocupa uma identidade vaga, sem duplicar funcionários existentes.

## Missões curtas

Recompensas únicas, resgatadas manualmente na aba Missões: primeira entrega (R$ 50), primeiro dev (R$ 300), três lojas virtuais entregues (R$ 1.500), treinar um júnior até pleno (R$ 5.000) e atingir R$ 50/s de lucro estimado (R$ 2.500).

Lucro da missão usa receita estimada do contrato ativo menos salários e despesas da sede; o maior valor observado fica salvo. Gastos com compras não entram nessa taxa. Recompensas de missão aumentam o saldo, mas não a receita de contratos ou o progresso de lucro. Entregas offline contam. Promoção exige treinamento real de nível 9 para 10 a partir desta atualização; contratar plenos/seniores não satisfaz essa missão. Os objetivos são independentes e opcionais.

O save v3 registra resgates, promoções e pico de lucro. Migração preserva os ativos e o histórico de entregas conhecido, sem inventar promoções anteriores. Resgate exige gravação bem-sucedida: se houver falha, saldo e estado da missão são restaurados em memória. A simulação de ritmo descrita abaixo não resgata missões; as recompensas podem adiantar compras no playtest.

A fonte de verdade é `src/config/balance.ts`; os requisitos são avaliados por `src/core/progression.ts`. A v0.2 responde ao playtest: reputação sozinha permitia pular contratos e os projetos avançados terminavam rapidamente.

## Contratos e desbloqueios

Todos os requisitos de uma linha são obrigatórios. O nível é verificado em **cada dev**, sem usar média da equipe. Contratos repetem automaticamente; selecionar o próximo termina a entrega atual antes da troca. Entregas offline também contam para o histórico.

| Contrato            | Trabalho | Pagamento | XP / reputação | Requisitos                                                    |
| ------------------- | -------: | --------: | -------------- | ------------------------------------------------------------- |
| Landing page        |      100 |    R$ 100 | 10 / 1         | Disponível desde o início                                     |
| Site de restaurante |      800 |  R$ 1.000 | 35 / 3         | 3 landing pages; 1 dev nível 1; reputação 5                   |
| Loja virtual        |    4.000 |  R$ 6.500 | 110 / 8        | 3 sites de restaurante; 2 devs nível 2; estúdio; reputação 18 |
| Aplicativo mobile   |   22.000 | R$ 40.000 | 260 / 20       | 3 lojas virtuais; 3 devs nível 3; coworking; reputação 45     |

Os pagamentos por unidade de trabalho aumentam de 1 para 1,25, 1,625 e aproximadamente 1,818. O projeto mais complexo exige investimento e uma entrega mais longa, mas melhora o rendimento da equipe. O tamanho do app passou de 2.400 para 22.000 unidades; seu pagamento passou de R$ 6.000 para R$ 40.000.

## Custos e produção

| Sistema                       | Valor                                          |
| ----------------------------- | ---------------------------------------------- |
| Toque inicial                 | 1 trabalho; dinheiro apenas na entrega         |
| Focus                         | +4/toque; −7/s; multiplicador de 1 até 2       |
| Deep Work                     | 10 s em 2×; sem bônus offline                  |
| Café                          | R$ 100 inicial; +1 por toque/nível             |
| Teclado                       | R$ 350; +3 por toque/nível                     |
| Monitor / notebook / fibra    | R$ 850/1.700/2.400; +10%/+20%/+15% por nível   |
| Equipamentos                  | Até 5 níveis; custo base × 1,85^nível          |
| Dev                           | R$ 1.500 × 1,65^quantidade; 5 trabalho/s/nível |
| Salário                       | R$ 0,60/s/nível                                |
| Treinamento                   | R$ 700 × 1,65^(nível−1); até nível 20          |
| Garagem / estúdio / coworking | R$ 0 / 5.000 / 30.000; 1 / 3 / 6 vagas         |
| Infraestrutura                | R$ 0 / 0,30 / 1,50 por segundo                 |
| Offline                       | Até 28.800 segundos por ausência               |

Multiplicadores de equipamento são aditivos antes de multiplicar a produção base. Custos de compra são arredondados para cima. O fundador não ocupa vaga de funcionário. Equipe continua trabalhando sem capital de giro, sem dívida. Offline liquida despesas sobre o saldo disponível ao fim do período, o que pode favorecer ligeiramente esse modo em relação à liquidação por segundo.

O nível geral exibido (`1 + floor(sqrt(XP / 20))`) resume o progresso. Os desbloqueios usam o nível individual dos devs, entregas, sede e reputação. Não há moeda premium nesta versão.

## Simulação reproduzível

`src/tests/progression.test.ts` simula dois toques por segundo: compra um café e um teclado, contrata o primeiro dev, expande, mantém dois devs no nível 2, compra o coworking e chega a três devs no nível 3. Seleciona sempre o contrato mais avançado permitido. Não compra outros equipamentos nem usa renda offline.

| Marco                                 | Tempo desde o início |
| ------------------------------------- | -------------------: |
| Primeiro café / primeira entrega      |              00:40,5 |
| Primeiro dev / seleção do restaurante |              03:05,5 |
| Primeira entrega de restaurante       |                03:49 |
| Estúdio                               |                06:09 |
| Seleção da loja virtual               |                08:05 |
| Primeira loja entregue                |              10:09,5 |
| Coworking                             |              16:51,5 |
| Seleção do aplicativo                 |                18:16 |
| Primeiro aplicativo entregue          |                24:38 |

Entre selecionar e entregar o primeiro app passam 6min22, incluindo eventual conclusão do contrato anterior. Estes são resultados automatizados de uma estratégia, não tempos garantidos de jogadores. Mais upgrades, outra cadência ou um save antigo alteram o ritmo. O teste verifica também que é possível alcançar todos os projetos sem ignorar requisitos.

## Carreira dos desenvolvedores

O cargo é derivado do nível: júnior de 1 a 9 (×1), pleno de 10 a 19 (×1,5) e sênior no nível 20 (×2). A promoção acontece automaticamente ao treinar e não tem cobrança adicional. O limite atual continua sendo nível 20.

Produção individual = 5 × nível × multiplicador do cargo × multiplicador dos equipamentos. Sem equipamentos, passar de nível 9 para 10 aumenta a produção de 45 para 75 trabalho/s; de 19 para 20, de 142,5 para 200. Salários: R$ 0,60 × nível × multiplicador do cargo por segundo. Júnior usa ×1; pleno ×1,3; sênior ×1,69 (mais 30% sobre o multiplicador de pleno). O adicional de promoção se soma ao crescimento normal por nível: nível 9 paga R$ 5,40/s; nível 10 paga R$ 7,80/s; nível 20 paga R$ 20,28/s. O bônus funciona também offline e afeta apenas o profissional promovido.

Cards exibem retrato, cargo, bônus, próxima promoção e previsão do treinamento. Saves existentes já no nível 10 ou 20 recebem o cargo correspondente ao carregar; não há novo campo persistido nem necessidade de migração. A simulação inicial acima permanece válida, pois usa devs até o nível 3.

## Saves antigos

Dinheiro, funcionários, upgrades, XP e total de entregas são preservados. O percentual do contrato em curso é adaptado ao trabalho novo. Se o jogador não cumpre os novos requisitos, essa entrega tem uma exceção única; ao terminar, o jogo volta ao melhor contrato permitido ou ao contrato elegível já escolhido. Não é permitido repetir indefinidamente o contrato herdado.

Histórico por tipo começa em zero porque a v1 não o armazenava. O aviso de migração explica isso. A cópia `.pre-v2` conserva o save original, inclusive quando recuperado do backup.

## Contratação por cargo

É possível contratar júnior no nível 1, pleno no nível 10 ou sênior no nível 20. O custo dos experientes é (custo base do júnior + soma dos treinamentos até o nível inicial) × 1,25 × 1,65^quantidade de funcionários, arredondado para cima. Isso cobra um prêmio de 25% pela contratação imediata e preserva o incentivo a treinar a equipe. Os três cargos usam as mesmas vagas e exigem saldo suficiente; não dispensam as entregas e demais requisitos dos contratos. Cards mostram produção, salário e preço antes da compra.
