import { combinarSementes, criarRng, escolher } from './aleatorio.ts';
import { diaDaData } from './calendario.ts';
import type { Clube, Jogador, Liga } from './tipos.ts';

export type TipoDecisao = 'folga' | 'amistoso' | 'jovem';

export interface Decisao {
  tipo: TipoDecisao;
  dia: number;
  jogadorId?: number;
  jogador?: string;
}

export const CUSTO_FOLGA = 50_000;
export const CACHE_AMISTOSO = 150_000;
export const CUSTO_TREINO_JOVEM = 100_000;
const ENERGIA_DA_FOLGA = 15;
const ENERGIA_DO_AMISTOSO = 10;
const TIPOS: TipoDecisao[] = ['folga', 'amistoso', 'jovem'];

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

  const tipo = escolher(criarRng(combinarSementes(liga.semente, liga.temporada, dia, clube.id)), TIPOS);
  const jovem = jovemPromissor(clube);
  if (tipo === 'jovem' && jovem && clube.saldo >= CUSTO_TREINO_JOVEM) {
    return { tipo, dia, jogadorId: jovem.id, jogador: jovem.nome };
  }
  return { tipo: tipo === 'jovem' ? 'amistoso' : tipo, dia };
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
