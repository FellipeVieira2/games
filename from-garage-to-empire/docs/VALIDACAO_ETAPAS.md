# Etapas de produção — v0.6.2

Cada contrato percorre desenvolvimento (70% do trabalho), testes (25%) e entrega (5%). A equipe alocada e os cliques avançam a fase atual; excesso de trabalho passa para a próxima. Pagamento, XP, reputação, histórico e avanço da fila acontecem somente ao terminar a entrega.

## Interface

A barra da home mostra o progresso da fase, identificada como 1/3, 2/3 ou 3/3. O botão muda para Desenvolver, Testar ou Entregar. Toque no nome da fase para consultar o trabalho de cada etapa. A informação substitui o contador anterior; não acrescenta um painel nem reduz as fontes. A barra também informa o progresso total do contrato para leitores de tela.

## Economia e persistência

- A soma das etapas mantém o trabalho anterior. Preços, duração total estimada, produtividade, folha e prazos continuam usando os mesmos valores.
- O prazo cobre as três fases. Mudar de fase, treinar ou realocar não renova o prazo.
- A equipe avança automaticamente, inclusive na entrega e offline; não é necessário voltar ao jogo para confirmar cada pagamento. O botão permite acelerar manualmente a fase atual.
- As fases são derivadas do progresso já persistido. O save permanece v10, sem duplicar contadores nem exigir migração adicional. Um contrato antigo em 80% aparece na fase de testes, conservando trabalho, dinheiro e proteção de prazo.
- Reservar toda a equipe paralisa a produção automática em qualquer fase, mas salários e relógio continuam. Cliques ainda funcionam.
- O motor atravessa cada limite de fase sem descartar trabalho excedente. Os eventos financeiros continuam nos mesmos instantes de recebimento e vencimento; as fases intermediárias não criam entradas de caixa.

## Validação e limites

Seis testes em `src/tests/project-stages.test.ts` cobrem limites de fase, pagamento e fila somente após entrega, cliques atravessando fases/renovações, persistência durante testes, paridade online/offline e reserva com atraso. A suíte completa tem 116 testes.

Esta entrega organiza o fluxo de produção. Ainda não há bugs, retrabalho, escolha de intensidade de testes, qualidade ou satisfação. As fases usam a mesma produtividade; não existe bônus escondido por simplesmente chegar aos testes. A próxima etapa deve introduzir escolhas e consequências de qualidade, com estimativa antes de aceitar.

A conferência visual em celular, inclusive paisagem, continua pendente. Testes do motor não comprovam legibilidade ou diversão.
