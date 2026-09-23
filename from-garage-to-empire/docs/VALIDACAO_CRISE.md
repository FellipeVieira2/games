# Validação da crise — v0.4.1

Esta etapa testa as contas antes de definir qualquer encerramento de empresa. Um mês empresarial tem 600 segundos. A garagem não cobra manutenção; estúdio e coworking custam, respectivamente, $720 e $3.000 por mês. Um dev júnior trabalhando em landing pages entrega cerca de $3.000 por mês e custa $360 em salários. Os valores são parâmetros de jogo, não salários ou aluguel reais.

| Situação                 | Receita/mês | Salários + sede/mês | Resultado/mês | Após 1 mês sem caixa inicial |
| ------------------------ | ----------: | ------------------: | ------------: | ---------------------------: |
| Garagem com 1 júnior     |      $3.000 |                $360 |       +$2.640 |              $2.640 em caixa |
| Coworking com 1 júnior   |      $3.000 |              $3.360 |         −$360 |               $360 em atraso |
| Coworking com 3 juniores |      $9.000 |              $4.080 |       +$4.920 |              $4.920 em caixa |

Reduzir o coworking com um júnior para o estúdio troca a manutenção mensal de $3.000 por $720. No teste, a empresa quita os $360 vencidos e termina o mês seguinte com $1.560 em caixa. Isso cria uma saída sem empréstimo ou demissão automática. Expandir com equipe suficiente continua vantajoso; expandir cedo demais exige caixa de reserva ou uma correção de rumo.

O motor agora intercala vencimentos, entregas, ciclos de operação e parcelas na ordem do tempo empresarial, inclusive num retorno offline. Os testes comparam passos ativos de 0,1 ou 1 segundo com um único retorno para confirmar caixa, componentes da dívida, contratos e parcelas. Salários e aluguel vencidos são liquidados antes de novas despesas quando entra receita. As movimentações continuam agrupadas por categoria e mês.

Um retorno após 24 horas reais simula no máximo oito horas de produção. No cenário deficitário acima, isso equivale a 48 meses empresariais e $17.280 em atraso; sete retornos diários sem corrigir a estratégia acumulam $120.960. Recarregar no mesmo instante não repete a cobrança. Esses números são um alerta para a futura falência: um retorno longo não deve encerrar a empresa antes de o jogador ler as contas e escolher uma ação. O prazo de proteção e o limite de endividamento ainda precisam de simulações e partidas reais antes de serem fixados.

Falta conferir legibilidade e navegação da subaba Recuperação em celulares reais, medir decisões durante a primeira hora e observar retenção após vários dias. A devolução de 30% ao demitir continua como regra de jogo existente; qualquer mudança deve aparecer claramente ao jogador.
