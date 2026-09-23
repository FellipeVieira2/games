# Ativos e dependências

Arte da garagem e ícone web: formas vetoriais originais criadas neste projeto. Efeitos e trilha: síntese original via Web Audio. Não há imagens, músicas ou fontes baixadas de terceiros. Os ícones de plataforma Android e a splash gerados pelo template Capacitor ainda devem ser substituídos por arte final antes do lançamento.

Dependências principais: Phaser (MIT), Lucide (ISC), Capacitor (MIT), Zod (MIT), Vite/Vitest (MIT), TypeScript (Apache-2.0). Licenças completas acompanham os pacotes em `node_modules`; antes da distribuição, gerar inventário completo a partir do lockfile, incluindo dependências transitivas e plugins novos.

Override de desenvolvimento: `xcode > uuid` usa a linha 11 corrigida, compatível com o uso de `v4` no parser Xcode. O CLI do Capacitor traz o parser mesmo em projetos Android. Este override deve ser removido quando o upstream atualizar a dependência; conferir `npm audit` ao atualizar o lockfile. Vitest usa versão a partir de 4.1.11 para incluir a correção do mocker.
