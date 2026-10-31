import { combinarSementes, criarRng, escolherPonderado, inteiro } from './aleatorio.ts';
import type { Rng } from './aleatorio.ts';
import { ESTILOS, FORMACOES, PENALIDADE_FORA_DE_POSICAO, forcaEfetiva } from './escalacao.ts';
import type { Clube, Escalacao, Evento, Jogador, Posicao, Resultado } from './tipos.ts';

const MINUTOS = 90;
const PROB_CHANCE = 0.27;
const CONVERSAO_BASE = 0.082;
const ESCALA_CHANCE = 24;
const ESCALA_POSSE = 18;
const MANDO = 2.5;
const PENALIDADE_EXPULSAO = 6;
const PROB_AMARELO = 0.02;
const PROB_VERMELHO = 0.0012;
const PROB_LESAO = 0.0008;
const PROB_ASSISTENCIA = 0.7;
const PROB_NARRAR_CHANCE = 0.3;

const PESO_GOL: Record<Posicao, number> = { GOL: 0, DEF: 1, MEI: 3, ATA: 7 };
const PESO_ASSISTENCIA: Record<Posicao, number> = { GOL: 0.2, DEF: 2, MEI: 5, ATA: 3 };

interface EmCampo {
  jogador: Jogador;
  posicao: Posicao;
  forca: number;
}

export interface Equipe {
  clubeId: number;
  emCampo: EmCampo[];
  ataque: number;
  meio: number;
  defesa: number;
  expulsos: number;
}

const media = (valores: number[]) => valores.reduce((a, b) => a + b, 0) / (valores.length || 1);

export function montarEquipe(clube: Clube, escalacao: Escalacao): Equipe {
  const emCampo = escalacao.titulares.map(({ jogadorId, posicao }) => {
    const jogador = clube.elenco.find((j) => j.id === jogadorId) as Jogador;
    const forca = forcaEfetiva(jogador) * (jogador.posicao === posicao ? 1 : PENALIDADE_FORA_DE_POSICAO);
    return { jogador, posicao, forca };
  });
  const linha = (posicao: Posicao) => media(emCampo.filter((e) => e.posicao === posicao).map((e) => e.forca));
  const formacao = FORMACOES[escalacao.formacao];
  const estilo = ESTILOS[escalacao.estilo];
  return {
    clubeId: clube.id,
    emCampo,
    ataque: linha('ATA') * 0.7 + linha('MEI') * 0.3 + formacao.ataque + estilo.ataque,
    meio: linha('MEI') + formacao.meio,
    defesa: linha('DEF') * 0.75 + linha('GOL') * 0.25 + formacao.defesa + estilo.defesa,
    expulsos: 0,
  };
}

const logistica = (diferenca: number, escala: number) => 1 / (1 + Math.exp(-diferenca / escala));

function sortear(rng: Rng, equipe: Equipe, pesos: Record<Posicao, number>, excluir?: Jogador) {
  const candidatos = equipe.emCampo.filter((e) => e.jogador !== excluir);
  return escolherPonderado(rng, candidatos, (e) => pesos[e.posicao] * e.forca).jogador;
}

function jogarLance(rng: Rng, minuto: number, ataca: Equipe, defende: Equipe, bonus: number, eventos: Evento[]) {
  const diferenca = ataca.ataque - ataca.expulsos * PENALIDADE_EXPULSAO
    - (defende.defesa - defende.expulsos * PENALIDADE_EXPULSAO) + bonus;
  const conversao = Math.min(0.4, CONVERSAO_BASE * Math.exp(diferenca / ESCALA_CHANCE));
  const autor = sortear(rng, ataca, PESO_GOL);
  const base = { minuto, clubeId: ataca.clubeId, jogadorId: autor.id, jogador: autor.nome };

  if (rng() < conversao) {
    const assistencia = rng() < PROB_ASSISTENCIA ? sortear(rng, ataca, PESO_ASSISTENCIA, autor).nome : undefined;
    eventos.push({ ...base, tipo: 'gol', assistencia });
    return true;
  }
  if (rng() < PROB_NARRAR_CHANCE) eventos.push({ ...base, tipo: 'chance' });
  return false;
}

function incidente(rng: Rng, minuto: number, equipe: Equipe, eventos: Evento[]) {
  // Time cansado se machuca mais: sem energia, o risco de lesão triplica.
  const energia = media(equipe.emCampo.map((e) => e.jogador.energia));
  const probLesao = PROB_LESAO * (1 + (2 * (100 - energia)) / 100);
  const sorte = rng();
  if (sorte >= PROB_AMARELO + PROB_VERMELHO + probLesao) return;

  const naoGoleiros = equipe.emCampo.filter((e) => e.posicao !== 'GOL');
  const alvo = naoGoleiros[inteiro(rng, 0, naoGoleiros.length - 1)];
  const base = { minuto, clubeId: equipe.clubeId, jogadorId: alvo.jogador.id, jogador: alvo.jogador.nome };

  if (sorte < PROB_AMARELO) {
    eventos.push({ ...base, tipo: 'amarelo' });
    return;
  }
  // Quem sai não faz mais gol; na lesão entra um reserva, sem perda para o time.
  equipe.emCampo = equipe.emCampo.filter((e) => e !== alvo);
  if (sorte < PROB_AMARELO + PROB_VERMELHO) {
    equipe.expulsos += 1;
    eventos.push({ ...base, tipo: 'vermelho', rodadasFora: 1 });
  } else {
    eventos.push({ ...base, tipo: 'lesao', rodadasFora: inteiro(rng, 3, 12) });
  }
}

export function simularPartida(casa: Equipe, fora: Equipe, semente: number): Resultado {
  const rng = criarRng(combinarSementes(semente, casa.clubeId, fora.clubeId));
  const eventos: Evento[] = [];
  let golsCasa = 0;
  let golsFora = 0;
  let chancesCasa = 0;
  let chancesFora = 0;
  let somaPosse = 0;

  for (let minuto = 1; minuto <= MINUTOS; minuto++) {
    const posse = logistica(casa.meio + MANDO - fora.meio, ESCALA_POSSE);
    somaPosse += posse;

    if (rng() < PROB_CHANCE) {
      if (rng() < posse) {
        chancesCasa += 1;
        if (jogarLance(rng, minuto, casa, fora, MANDO, eventos)) golsCasa += 1;
      } else {
        chancesFora += 1;
        if (jogarLance(rng, minuto, fora, casa, 0, eventos)) golsFora += 1;
      }
    }
    incidente(rng, minuto, casa, eventos);
    incidente(rng, minuto, fora, eventos);
  }

  return {
    golsCasa,
    golsFora,
    posseCasa: Math.round((somaPosse / MINUTOS) * 100),
    chancesCasa,
    chancesFora,
    eventos,
  };
}
