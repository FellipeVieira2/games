# Contratos com cliente e prazo — v0.6

Primeira entrega da etapa 4. Há um cliente recorrente por especialidade, com histórico persistido de entregas, atrasos e receita. A complexidade de 1 a 4 descreve os tipos existentes; não adiciona outro multiplicador ao trabalho necessário.

| Tipo | Cliente | Prazo por entrega | Pagamento normal / atrasado |
| --- | --- | --- | --- |
| Landing page | Ateliê Aurora | Sem prazo | R$ 100 |
| Restaurante | Bistrô da Praça | 240 segundos | R$ 1.000 / R$ 900 |
| Loja | Mercado Horizonte | 360 segundos | R$ 6.500 / R$ 5.850 |
| Aplicativo | Conecta Mobilidade | 480 segundos | R$ 40.000 / R$ 36.000 |

## Regras implementadas

- Os prazos usam o relógio empresarial. A fila começa a contar somente ao entrar em produção. Ao entregar, o contrato se renova automaticamente e recebe novo prazo.
- O pagamento ocorre na entrega. Atraso reduz apenas o pagamento em 10%, uma vez por entrega; não acumula multas nem reduz XP ou reputação nesta versão. Entrega exatamente no limite não é atrasada.
- Cliques aceleram a produção. A análise mostra uma entrega completa com a equipe atual, sem prever cliques ou foco: duração, prazo, recebimento e resultado depois de folha e sede. O resultado não inclui receitas de produtos, empréstimos ou investimentos. Sem equipe, a duração depende dos cliques e o resultado fica indeterminado.
- A previsão recorrente do Financeiro considera a redução de pagamento quando a equipe atual não consegue cumprir o prazo. É uma projeção de renovação, não uma garantia de caixa para o contrato em andamento.
- Offline conta até o limite existente de oito horas. Pausas de revisão/falência congelam o relógio como antes. Recarregar não reinicia o prazo nem duplica a entrega.
- O save v9 migra v1–v8. A entrega ativa migrada fica sem prazo; a seguinte usa as regras novas. O histórico de clientes começa vazio, sem atribuir entregas antigas a clientes que ainda não eram registrados.
- A home mostra cliente, prazo restante ou atraso e pagamento atual. A lista mantém paginação; condições e histórico ficam em uma consulta separada da proposta.

## Evidência automatizada

`src/tests/contract-management.test.ts` cobre orçamento com equipe mínima e treinada, início de prazo após fila, desconto e conciliação financeira, entrega no limite, paridade online/offline, persistência, migração v8, bloqueios de progressão e rejeição de histórico inválido. A suíte completa tem 102 testes.

Exemplo de decisão: três devs de nível 3 produzem 45 unidades/s. O app exige cerca de 489 segundos e ultrapassa o prazo de 480; o recebimento estimado é R$ 36 mil. Treinar um deles para nível 4 eleva a produção a 50 unidades/s e reduz a duração a 440 segundos, recuperando o pagamento de R$ 40 mil. O treinamento e a folha maior continuam sendo custos do jogador.

## Pendências

Validar a proposta, consulta de condições e texto da home em celular real, inclusive paisagem. Os testes não comprovam legibilidade nem retenção. Prazos e desconto são parâmetros iniciais para playtest.

A etapa 4 ainda não está concluída: faltam alocação de equipe, fases de desenvolvimento/testes/entrega, qualidade, mudanças de escopo, satisfação e geração de ofertas baseada no relacionamento. Nesta entrega o histórico é informativo; não concede bônus ocultos.
