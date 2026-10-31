import { combinarSementes, criarRng, escolher } from './aleatorio.ts';
import { diaDaData } from './calendario.ts';
import { gerarJovem } from './geracao.ts';
import { ELENCO_MAXIMO, valorDe } from './transferencias.ts';
import type { Clube, Jogador, Liga, Posicao } from './tipos.ts';

export type TipoDecisao = 'folga' | 'amistoso' | 'jovem' | 'peneira';

export interface Decisao {
  tipo: TipoDecisao;
  dia: number;
  jogadorId?: number;
  jogador?: string;
  /** Na peneira, o técnico vê o jovem e o preço antes de decidir. */
  prospecto?: Jogador;
  custo?: number;
}

export const CUSTO_FOLGA = 50_000;
export const CACHE_AMISTOSO = 150_000;
export const CUSTO_TREINO_JOVEM = 100_000;
const ENERGIA_DA_FOLGA = 15;
const ENERGIA_DO_AMISTOSO = 10;
const TIPOS: TipoDecisao[] = ['folga', 'amistoso', 'jovem', 'peneira'];
const POSICOES: Posicao[] = ['GOL', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'];

const limitar = (energia: number) => Math.max(0, Math.min(100, energia));

function jovemPromissor(clube: Clube): Jogador | undefined {
  return clube.elenco
    .filter((j) => j.potencial > j.forca)
    .sort((a, b) => b.potencial - b.forca - (a.potencial - a.forca) || a.id - b.id)[0];
}

/** Uma escolha por dia; ignorar não tem punição, ela só some no dia seguinte. */
export function decisaoDoDia(liga: Liga, clube: Clube): Decisao | null {
  if (liga.rodadaAtual > liga.totalRodadas) return null;
  const dia = diaDaData(liga.rodadaAtual);
  if (clube.decididoNoDia === dia) return null;

  const rng = criarRng(combinarSementes(liga.semente, liga.temporada, dia, clube.id));
  const tipo = escolher(rng, TIPOS);
  const jovem = jovemPromissor(clube);
  if (tipo === 'jovem' && jovem && clube.saldo >= CUSTO_TREINO_JOVEM) {
    return { tipo, dia, jogadorId: jovem.id, jogador: jovem.nome };
  }
  if (tipo === 'peneira') {
    const prospecto = gerarJovem(rng, 0, escolher(rng, POSICOES));
    const custo = valorDe(prospecto);
    if (clube.saldo >= custo && clube.elenco.length < ELENCO_MAXIMO) {
      return { tipo, dia, jogador: prospecto.nome, prospecto, custo };
    }
  }
  return { tipo: tipo === 'jovem' || tipo === 'peneira' ? 'amistoso' : tipo, dia };
}

export function aplicarDecisao(liga: Liga, clubeId: number, decisao: Decisao, aceitar: boolean): Liga {
  const clubes = liga.clubes.map((clube) => {
    if (clube.id !== clubeId) return clube;
    const novo: Clube = { ...clube, decididoNoDia: decisao.dia };
    if (!aceitar) return novo;

    if (decisao.tipo === 'folga') {
      novo.saldo -= CUSTO_FOLGA;
      novo.elenco = clube.elenco.map((j) => ({ ...j, energia: limitar(j.energia + ENERGIA_DA_FOLGA) }));
    } else if (decisao.tipo === 'amistoso') {
      novo.saldo += CACHE_AMISTOSO;
      novo.elenco = clube.elenco.map((j) => ({ ...j, energia: limitar(j.energia - ENERGIA_DO_AMISTOSO) }));
    } else if (decisao.tipo === 'peneira' && decisao.prospecto) {
      const ultimoId = Math.max(...liga.clubes.flatMap((c) => c.elenco.map((j) => j.id)));
      novo.saldo -= decisao.custo ?? 0;
      novo.elenco = [...clube.elenco, { ...decisao.prospecto, id: ultimoId + 1 }];
    } else {
      novo.saldo -= CUSTO_TREINO_JOVEM;
      novo.elenco = clube.elenco.map((j) => (
        j.id === decisao.jogadorId ? { ...j, forca: Math.min(j.potencial, j.forca + 1) } : j
      ));
    }
    return novo;
  });
  return { ...liga, clubes };
}
