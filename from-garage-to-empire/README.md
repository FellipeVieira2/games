# From Garage to Empire

Versão 0.6.3 de um idle/clicker sobre transformar uma garagem em uma empresa. Arte original desenhada com Phaser, UI em HTML/CSS e economia independente do motor. Português brasileiro e inglês.

Novidade: contratos com clientes, prazos e análise antes de aceitar. Saves anteriores preservam a entrega em andamento. [Regras e testes de contratos](docs/VALIDACAO_CONTRATOS.md).

Na v0.6.3, o layout foi revisto para retrato e paisagem: escritório com espaço próprio, cartões e diálogos paginados conforme a altura disponível, e navegação estável durante entregas automáticas. [Revisão e roteiro de verificação](docs/VALIDACAO_RESPONSIVA.md).

Na v0.6.2, a home mostra desenvolvimento, testes e entrega. Toque no nome da fase para ver a divisão do trabalho. Pagamento e avanço da fila acontecem ao concluir a entrega; a equipe continua trabalhando offline. [Regras das etapas](docs/VALIDACAO_ETAPAS.md).

Na v0.6.1, use **Equipe → Equipe Atual → Alterar** para alocar devs aos contratos ou à reserva. A comparação mostra o impacto antes de confirmar; reserva mantém salário e não renova o prazo. [Regras e testes de alocação](docs/VALIDACAO_ALOCACAO.md).

## Executar

Requer Node 22.12+ (recomendado Node 24 LTS) e npm. Execute os comandos **nesta pasta**, não na raiz do sistema de açougue.

```powershell
cd games/from-garage-to-empire
npm ci
npm run dev
```

Abra **http://127.0.0.1:5173**. Toque em Trabalhar, entregue o primeiro projeto, compre café e economize para o primeiro desenvolvedor. O pagamento acontece na entrega. A equipe repete contratos automaticamente, e o próximo contrato escolhido entra na fila sem perder progresso.

## SDK do jogo

O SDK headless fica em `src/sdk` e expõe as regras do jogo sem depender de Phaser, DOM ou Capacitor. Ele pode ser usado por uma UI alternativa, testes ou outro host TypeScript:

```ts
import { createGameSdk } from './src/sdk';

const game = createGameSdk({ now: Date.now() });
const unsubscribe = game.subscribe((state) => console.log(state.money));

game.tap();
game.tick(1);
const save = game.serialize();
game.restore(save);

unsubscribe();
```

Além de `tap` e `tick`, a API inclui contratação, treinamento, upgrades, expansão, contratos, demissão, retomada offline, snapshots isolados e persistência JSON validada pelo esquema do jogo.

No Windows desta sessão, o Node não estava no PATH. O atalho `./start-game.ps1` usa o Node instalado ou o runtime existente do Codex, sem download ou instalação global. `./start-game.ps1 -Preview` abre o servidor de produção já compilado.

```powershell
npm run check       # ESLint, Vitest, TypeScript strict, build Vite
npm run preview     # build de produção em http://127.0.0.1:4173
npm run format
npm run android:sync
npm run android:open
```

## O que já existe

- Três cenários com arquitetura e disposição de mesas próprias; fundador animado, personagens para cada contratação e gato interativo.
- Trabalho por toque, Focus/Deep Work e quatro contratos em sequência, com requisitos de entregas, nível dos devs, sede e reputação; fila entre contratos.
- Cinco equipamentos, cinco níveis cada; mudanças visíveis de café, teclado, monitor, notebook e roteador.
- Desenvolvedores com retratos individuais, salários e treinamento; júnior, pleno no nível 10 (+50% de produção) e sênior no nível 20 (+100%); capacidade de 1/3/6 funcionários.
- Garagem, estúdio renovado e coworking, com troca imediata do cenário e capacidade maior.
- Produção automática, obrigações em atraso quando o caixa acaba e progresso offline limitado a oito horas.
- Cinco operações independentes com investimento, marcos de nível e automação. Dez missões na aba Missões, com progresso e recompensas únicas em dinheiro.
- Financeiro em Gestão: projeção mensal, autonomia do caixa, realizado do mês e movimentações agrupadas. Contratação e expansão mostram o impacto antes da compra.
- Equipe atual e contratação em telas separadas; demissão com confirmação e recuperação de 30% do investimento no dev.
- Save local v8 com migração da v1–v7, validação de esquema e invariantes, backup e avisos de recuperação/falha.
- Configurações, som sintetizado original, trilha opcional, vibração, redução de movimento, estatísticas e tutorial contextual.
- Cache offline do build web e botão para salvar/aplicar novas versões; assets Android locais; interfaces para ads, compras, analytics e save.

## Finanças nesta versão

Um mês de jogo equivale a 600 segundos de produção; isso não altera os ganhos por segundo do motor. O Financeiro separa receita estimada de contratos e operações automatizadas, despesas com salários e sede, resultado previsto e autonomia do caixa. O resultado realizado mostra apenas entradas e custos operacionais efetivamente pagos no mês corrente. Compras, missões e devoluções aparecem nas movimentações e na variação do caixa, mas não como lucro operacional.

O histórico financeiro começa ao migrar um save antigo, preservando seu saldo como ponto de partida. O registro guarda categorias agregadas por mês e os 256 grupos mais recentes, com saldo anterior consolidado. Ausências são divididas por mês de jogo e continuam limitadas a oito horas por retorno. Despesas sem saldo viram obrigações em atraso. A subaba Recuperação permite vender equipamentos, reduzir a sede, renegociar aluguel vencido ou tomar um empréstimo de emergência com 12 parcelas e custo total de 18%. Novas receitas liquidam primeiro salários, sede e parcelas vencidas. Ao retornar offline com dívida grave, a produção pausa para o jogador escolher como reagir.

Na v0.5, uma crise prolongada pode encerrar a empresa após um prazo de recuperação. O relatório arquivado guarda receitas, contratos, operações e trajetória da dívida. Confirmar o recomeço cria uma empresa com caixa zero, preservando relatórios, recordes e configurações. Veja as [regras e cenários](docs/VALIDACAO_FALENCIA.md).

Na v0.4.1, custos, entregas, ciclos e parcelas são processados na ordem temporal, tanto online quanto offline. A manutenção do estúdio passou de $180 para $720 por mês empresarial; a do coworking, de $900 para $3.000. Essas novas taxas também valem para saves existentes ao retomá-los. Veja os [cenários de validação](docs/VALIDACAO_CRISE.md).

## Mudanças da v0.2

Landing page → site de restaurante → loja virtual → aplicativo. Restaurante exige três entregas de landing page, um dev e reputação 5. Loja exige três sites de restaurante, dois devs no nível 2, estúdio e reputação 18. App exige três lojas, três devs no nível 3, coworking e reputação 45. Cada card mostra os requisitos cumpridos e o que falta. O trabalho dos contratos passou para 100 / 800 / 4.000 / 22.000 unidades.

A interface usa painéis azul-escuros, controles âmbar, títulos curtos e um cenário com mudanças estruturais em cada sede. As referências e decisões estão em [docs/VISUAL_REFERENCES.md](docs/VISUAL_REFERENCES.md).

Ao abrir um save antigo, dinheiro, equipe, equipamentos e percentual do projeto são preservados. O contrato antigo em andamento pode terminar uma vez; depois, os novos requisitos se aplicam. O histórico por tipo de projeto começa nesta versão porque a v1 só registrava o total geral. Uma cópia original é arquivada antes da gravação da v2.

Se o preview ainda mostrar a aparência antiga, feche as abas do jogo e reabra **http://127.0.0.1:4173/?v=0.6.3**. Use a mesma origem para manter seu save. Em atualizações seguintes, a interface avisa quando uma nova versão está pronta e salva antes de aplicá-la.

## Dados e limites

O save pertence à origem do navegador. **Dev (5173), preview (4173) e Android têm saves separados.** Limpar os dados do navegador remove esse progresso. Não há login nem cloud save. Uma trava Web Locks evita duas abas escrevendo simultaneamente onde a API estiver disponível.

Em caso de save inválido, o backup válido é recuperado com aviso. Se ambos estiverem inválidos, ou se o save pertencer a uma versão futura, a escrita é bloqueada e os dados originais são preservados. A sessão temporária não corrige nem substitui esses dados.

O relógio local serve apenas para o jogo offline; não é uma proteção competitiva. A renda offline é creditada e salva ao voltar; o botão da janela apenas fecha o recibo, impedindo coleta duplicada. O service worker é gerado no build e guarda assets após uma primeira carga completa; o servidor de desenvolvimento não promete funcionamento sem rede.

## Organização deste repositório

Este projeto é independente, dentro de `games/from-garage-to-empire`. Não altera o aplicativo Next.js, o banco, as dependências ou os documentos do açougue. Seu lockfile e seus comandos são locais. Não foi adicionado ao workspace pnpm do produto existente para evitar acoplar releases distintos.

Consulte [GAME_DESIGN.md](GAME_DESIGN.md), [ARCHITECTURE.md](ARCHITECTURE.md), [BALANCE.md](BALANCE.md), [ANDROID_RELEASE.md](ANDROID_RELEASE.md), [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) e [referências visuais](docs/VISUAL_REFERENCES.md).
