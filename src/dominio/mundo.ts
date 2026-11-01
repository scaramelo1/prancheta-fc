import { combinarSementes, criarRng, inteiro } from './aleatorio.ts';
import { nivelDoTime, repararEscalacao } from './escalacao.ts';
import { gerarJovem } from './geracao.ts';
import { criarLiga, tabelaGeral } from './liga.ts';
import { valorDe } from './transferencias.ts';
import type { Clube, Dificuldade, Liga, Titulo } from './tipos.ts';

/** Cada liga manda 4 clubes para baixo, e cada uma das duas ligas de baixo manda 2 para cima. */
export const QUEDAS_POR_LIGA_DE_BAIXO = 2;
export const SOBEM_POR_LIGA = 2;
const REFORCOS_POR_TEMPORADA = 3;
const FOLGA_DE_NIVEL = 5;
export const VAGAS_POR_LIGA = 20;

export interface PosicaoNoMundo {
  divisao: number;
  grupo: number;
}

export interface ResumoOficial extends PosicaoNoMundo {
  id: string;
  tecnicos: number;
}

export interface LigaRanqueada extends PosicaoNoMundo {
  id: string;
  /** Do primeiro ao último da classificação geral. */
  clubeIds: number[];
}

export interface Troca {
  /** Quem cai: liga de cima. */
  cai: { ligaId: string; clubeId: number };
  /** Quem sobe: liga de baixo. */
  sobe: { ligaId: string; clubeId: number };
}

export const numeroDaDivisao = (liga: Pick<Liga, 'divisao'>) => Number(liga.divisao ?? 0);

/** A pirâmide dobra a cada divisão: 1, 2, 4, 8... */
export const ligasNaDivisao = (divisao: number) => 2 ** (divisao - 1);

/** O grupo de cima que recebe os clubes deste grupo. */
export const grupoDeCima = (grupo: number) => Math.floor(grupo / 2);

/**
 * O técnico novo entra na divisão mais baixa que existe. Sem vaga nela, abre a próxima liga,
 * então quem chega depois começa embaixo e sobe por acesso.
 */
export function destinoDoTecnico(ligas: ResumoOficial[]): { id: string } | PosicaoNoMundo {
  if (ligas.length === 0) return { divisao: 1, grupo: 0 };
  const divisao = Math.max(...ligas.map((l) => l.divisao));
  const naDivisao = ligas.filter((l) => l.divisao === divisao).sort((a, b) => a.grupo - b.grupo);
  const comVaga = naDivisao.find((l) => l.tecnicos < VAGAS_POR_LIGA);
  if (comVaga) return { id: comVaga.id };
  return naDivisao.length < ligasNaDivisao(divisao)
    ? { divisao, grupo: naDivisao.length }
    : { divisao: divisao + 1, grupo: 0 };
}

/** Ninguém escolhe a dificuldade: as ligas abertas em temporadas mais avançadas nascem mais fortes. */
export function dificuldadeDaTemporada(temporada: number): Dificuldade {
  if (temporada <= 2) return 'facil';
  return temporada <= 4 ? 'normal' : 'dificil';
}

export function criarLigaOficial(id: string, { divisao, grupo }: PosicaoNoMundo, semente: number, temporada = 1): Liga {
  const dificuldade = dificuldadeDaTemporada(temporada);
  const liga = criarLiga(id, { nomeClube: '', donoId: null, dificuldade, duracao: 'temporada', semente });
  return { ...liga, tipo: 'oficial', divisao: String(divisao), grupo, descem: 0, temporada };
}

/** Pareia os primeiros de cada liga com os últimos da liga de cima. */
export function planejarAcessos(ligas: LigaRanqueada[]): Troca[] {
  const trocas: Troca[] = [];
  for (const de of ligas) {
    const filhas = ligas
      .filter((l) => l.divisao === de.divisao + 1 && grupoDeCima(l.grupo) === de.grupo)
      .sort((a, b) => a.grupo - b.grupo);
    const quedas = [...de.clubeIds].reverse();
    filhas.forEach((filha, f) => {
      for (let i = 0; i < SOBEM_POR_LIGA; i++) {
        trocas.push({
          cai: { ligaId: de.id, clubeId: quedas[f * SOBEM_POR_LIGA + i] },
          sobe: { ligaId: filha.id, clubeId: filha.clubeIds[i] },
        });
      }
    });
  }
  return trocas;
}

export const ranquear = (liga: Liga): LigaRanqueada => ({
  id: liga.id,
  divisao: numeroDaDivisao(liga),
  grupo: liga.grupo ?? 0,
  clubeIds: tabelaGeral(liga).map((l) => l.clubeId),
});

export interface ClubeEmTransito {
  clube: Clube;
  titulos: Titulo[];
}

export function retirarClube(liga: Liga, clubeId: number): ClubeEmTransito {
  return {
    clube: liga.clubes.find((c) => c.id === clubeId) as Clube,
    titulos: liga.titulos.filter((x) => x.clubeId === clubeId),
  };
}

/**
 * O clube assume a vaga de quem saiu. Ids de clube e de jogador só valem dentro de uma liga,
 * então ele recebe a vaga e o elenco ganha ids novos.
 */
export function receberClube(liga: Liga, vagaId: number, { clube, titulos }: ClubeEmTransito): Liga {
  let ultimoId = Math.max(...liga.clubes.flatMap((c) => c.elenco.map((j) => j.id)));
  const novosIds = new Map(clube.elenco.map((j) => [j.id, ++ultimoId]));
  const novo: Clube = {
    ...clube,
    id: vagaId,
    elenco: clube.elenco.map((j) => ({ ...j, id: novosIds.get(j.id) as number })),
    escalacao: clube.escalacao && {
      ...clube.escalacao,
      titulares: clube.escalacao.titulares.map((e) => ({ ...e, jogadorId: novosIds.get(e.jogadorId) as number })),
    },
    decididoNoDia: undefined,
    vendaNoDia: undefined,
  };
  return {
    ...liga,
    clubes: liga.clubes.map((c) => (c.id === vagaId ? novo : c)),
    titulos: [
      ...liga.titulos.filter((x) => x.clubeId !== vagaId),
      ...titulos.map((x) => ({ ...x, clubeId: vagaId })),
    ],
  };
}

/** Técnico que sumiu devolve o clube à máquina, e a vaga pode receber outro. */
export function devolverAMaquina(liga: Liga, clubeId: number): Liga {
  return {
    ...liga,
    clubes: liga.clubes.map((c) => (
      c.id === clubeId ? { ...c, donoId: null, personalidade: 'equilibrado', escalacao: null, assistente: true } : c
    )),
  };
}

/**
 * A máquina acompanha os técnicos da liga pelo mercado: paga pelos reforços com o próprio saldo,
 * sem bônus escondido. Em liga sem técnicos, nada muda.
 */
export function reforcarMaquina(liga: Liga): Liga {
  const humanos = liga.clubes.filter((c) => c.donoId !== null);
  if (humanos.length === 0) return liga;
  const alvo = humanos.reduce((soma, c) => soma + nivelDoTime(c), 0) / humanos.length;
  let ultimoId = Math.max(...liga.clubes.flatMap((c) => c.elenco.map((j) => j.id)));

  const clubes = liga.clubes.map((clube) => {
    if (clube.donoId !== null || nivelDoTime(clube) >= alvo - FOLGA_DE_NIVEL) return clube;
    const rng = criarRng(combinarSementes(liga.semente, liga.temporada, clube.id, 17));
    const atual = { ...clube, elenco: [...clube.elenco] };
    const fracos = atual.elenco
      .map((j, i) => ({ j, i }))
      .filter(({ j }) => j.posicao !== 'GOL')
      .sort((a, b) => a.j.forca - b.j.forca || a.j.id - b.j.id)
      .slice(0, REFORCOS_POR_TEMPORADA);
    for (const { j, i } of fracos) {
      const forca = Math.round(alvo) + inteiro(rng, -3, 3);
      const base = gerarJovem(rng, ++ultimoId, j.posicao);
      const reforco = { ...base, idade: inteiro(rng, 23, 28), forca, potencial: Math.max(base.potencial, forca) };
      const preco = valorDe(reforco);
      if (atual.saldo < preco) continue;
      atual.saldo -= preco;
      atual.elenco[i] = reforco;
    }
    return { ...atual, escalacao: repararEscalacao(atual) };
  });
  return { ...liga, clubes };
}
