import type { Clube, Liga } from './tipos.ts';

/** Maior que qualquer id de jogador de uma liga: separa os elencos que vêm de fora. */
const FAIXA_DE_IDS = 1_000_000;

/**
 * O time de verdade mora no Mundo Oficial. A liga de amigos recebe uma cópia antes de cada rodada e
 * nada volta: por isso esses jogos não tiram energia, não machucam e não mudam o saldo do time.
 * Ids só valem dentro de uma liga, então a cópia ganha uma faixa própria.
 */
export function levarTime(liga: Liga, donoId: string, time: Clube): Liga {
  return {
    ...liga,
    clubes: liga.clubes.map((clube) => {
      if (clube.donoId !== donoId) return clube;
      const novoId = (id: number) => (clube.id + 1) * FAIXA_DE_IDS + id;
      return {
        ...clube,
        nome: time.nome,
        sigla: time.sigla,
        cor: time.cor,
        assistente: time.assistente,
        elenco: time.elenco.map((j) => ({ ...j, id: novoId(j.id) })),
        escalacao: time.escalacao && {
          ...time.escalacao,
          titulares: time.escalacao.titulares.map((e) => ({ ...e, jogadorId: novoId(e.jogadorId) })),
        },
      };
    }),
  };
}
