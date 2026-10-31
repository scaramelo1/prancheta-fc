import { combinarSementes, criarRng, inteiro } from './aleatorio.ts';
import type { Rng } from './aleatorio.ts';
import { melhorEscalacao } from './escalacao.ts';
import { gerarNome } from './geracao.ts';
import type { Clube, Jogador, Liga } from './tipos.ts';

export const ENERGIA_GASTA_NO_JOGO = 14;
export const ENERGIA_RECUPERADA_POR_DATA = 7;
export const BILHETERIA = 30_000;
const SALARIO_BASE = 10_000;
const FORCA_REFERENCIA = 60;
const IDADE_LIMITE = 38;
const IDADE_APOSENTADORIA = 34;
const PROB_APOSENTADORIA = 0.25;

/** O salário cresce mais rápido que a força: craque custa caro. */
export const salarioDe = (j: Jogador) =>
  Math.round((SALARIO_BASE * (j.forca / FORCA_REFERENCIA) ** 3) / 100) * 100;

export const folhaSalarial = (clube: Clube) => clube.elenco.reduce((soma, j) => soma + salarioDe(j), 0);

/** Prêmio de uma liga: do campeão ao último, com o mesmo degrau entre as posições. */
export const premioDaLiga = (posicao: number) => (21 - posicao) * 75_000;

export const PREMIOS = {
  copa: { campeao: 800_000, vice: 400_000 },
  prata: { campeao: 200_000 },
  taca: { campeao: 2_000_000, vice: 1_000_000 },
};

function evoluir(rng: Rng, j: Jogador): Jogador {
  const idade = j.idade + 1;
  let forca = j.forca;
  if (idade <= 24) forca = Math.min(j.potencial, forca + inteiro(rng, 1, 3));
  else if (idade >= 31) forca -= inteiro(rng, 1, 3);
  else forca += inteiro(rng, -1, 1);
  forca = Math.max(30, Math.min(95, forca));
  return { ...j, idade, forca, potencial: Math.max(forca, j.potencial), energia: 100, rodadasFora: 0 };
}

const seAposenta = (rng: Rng, j: Jogador) =>
  j.idade >= IDADE_LIMITE || (j.idade >= IDADE_APOSENTADORIA && rng() < PROB_APOSENTADORIA);

function revelarJovem(rng: Rng, id: number, antigo: Jogador): Jogador {
  const forca = Math.max(30, antigo.forca - inteiro(rng, 6, 14));
  return {
    id,
    nome: gerarNome(rng),
    posicao: antigo.posicao,
    idade: inteiro(rng, 17, 19),
    forca,
    potencial: Math.min(95, forca + inteiro(rng, 6, 20)),
    energia: 100,
    rodadasFora: 0,
  };
}

/** Cada temporada vale um ano: todos envelhecem, e quem se aposenta dá lugar a um jovem da mesma posição. */
export function evoluirClubes(liga: Liga): Clube[] {
  let ultimoId = Math.max(...liga.clubes.flatMap((c) => c.elenco.map((j) => j.id)));
  return liga.clubes.map((clube) => {
    const rng = criarRng(combinarSementes(liga.semente, liga.temporada, clube.id, 7));
    const elenco = clube.elenco.map((j) => {
      const evoluido = evoluir(rng, j);
      return seAposenta(rng, evoluido) ? revelarJovem(rng, ++ultimoId, evoluido) : evoluido;
    });
    // Quem se aposentou sai da escalação salva, mantendo a tática que o técnico escolheu.
    const ids = new Set(elenco.map((j) => j.id));
    const { escalacao } = clube;
    if (!escalacao || escalacao.titulares.every((t) => ids.has(t.jogadorId))) return { ...clube, elenco };
    return { ...clube, elenco, escalacao: melhorEscalacao({ ...clube, elenco }, escalacao.formacao, escalacao.estilo) };
  });
}
