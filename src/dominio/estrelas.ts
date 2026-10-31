import { inteiro } from './aleatorio.ts';
import type { Rng } from './aleatorio.ts';
import { NIVEL_MAXIMO } from './escalacao.ts';

export type Raridade = 'normal' | 'intermediario' | 'raro' | 'lendario';

/** Maior potencial de cada meia estrela, de 1 a 5. */
const TETOS: [number, number][] = [
  [45, 1], [50, 1.5], [55, 2], [63, 2.5], [72, 3], [80, 3.5], [88, 4], [94, 4.5], [NIVEL_MAXIMO, 5],
];

/** Chance de cada raridade ao surgir um jogador. A soma dá 100. */
const FAIXAS: { raridade: Raridade; chance: number; minimo: number; maximo: number }[] = [
  { raridade: 'lendario', chance: 0.5, minimo: 89, maximo: NIVEL_MAXIMO },
  { raridade: 'raro', chance: 6.5, minimo: 73, maximo: 88 },
  { raridade: 'intermediario', chance: 23, minimo: 56, maximo: 72 },
  { raridade: 'normal', chance: 70, minimo: 40, maximo: 55 },
];

/** Mostram o auge da carreira: não mudam com a idade nem com o nível atual. */
export const estrelasDe = (potencial: number) =>
  (TETOS.find(([teto]) => potencial <= teto) ?? TETOS[TETOS.length - 1])[1];

export function raridadeDe(potencial: number): Raridade {
  const estrelas = estrelasDe(potencial);
  if (estrelas >= 4.5) return 'lendario';
  if (estrelas >= 3.5) return 'raro';
  return estrelas >= 2.5 ? 'intermediario' : 'normal';
}

/** Vale para todo jogador que surge, na geração do elenco, na base e na peneira. */
export function sortearPotencial(rng: Rng, forca: number) {
  let sorte = rng() * 100;
  const faixa = FAIXAS.find(({ chance }) => (sorte -= chance) < 0) ?? FAIXAS[FAIXAS.length - 1];
  return Math.max(forca, inteiro(rng, faixa.minimo, faixa.maximo));
}
