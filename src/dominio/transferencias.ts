import { combinarSementes, criarRng, inteiro } from './aleatorio.ts';
import { diaDaData } from './calendario.ts';
import { repararEscalacao } from './escalacao.ts';
import { revelarJovem } from './evolucao.ts';
import type { Clube, Jogador, Leilao, Liga, Transferencia } from './tipos.ts';

export const ELENCO_MINIMO = 16;
export const ELENCO_MAXIMO = 30;
/** Dois dias de jogos. */
export const DATAS_DE_LEILAO = 6;
const VALOR_BASE = 300_000;
const NIVEL_REFERENCIA = 38;
const IDADE_JOVEM = 23;
const IDADE_VETERANO = 31;
const DESCONTO_VETERANO = 0.6;
/** Comprar custa mais do que vender rende: revender o mesmo jogador sempre dá prejuízo. */
const AGIO_DE_COMPRA = 1.25;
const DESAGIO_DE_VENDA = 0.75;
const AUMENTO_DO_LANCE = 1.05;
const DEGRAU = 10_000;
const HISTORICO = 20;

/** A mensagem vai direto para o técnico. */
export class ErroTransferencia extends Error {}

export interface Oferta {
  jogador: Jogador;
  clubeId: number;
  clubeNome: string;
  preco: number;
}

const arredondar = (valor: number) => Math.max(DEGRAU, Math.round(valor / DEGRAU) * DEGRAU);

/** Cresce rápido com o nível. Jovem vale pelo que pode virar, e veterano vale menos. */
export function valorDe(j: Jogador) {
  const nivel = j.idade <= IDADE_JOVEM ? (j.forca + j.potencial) / 2 : j.forca;
  const idade = j.idade >= IDADE_VETERANO ? DESCONTO_VETERANO : 1;
  return arredondar(VALOR_BASE * (nivel / NIVEL_REFERENCIA) ** 4 * idade);
}

export const precoDeCompra = (j: Jogador) => arredondar(valorDe(j) * AGIO_DE_COMPRA);
export const precoDeVenda = (j: Jogador) => arredondar(valorDe(j) * DESAGIO_DE_VENDA);

export const proximoLance = (leilao: Leilao) => (leilao.lance
  ? Math.max(leilao.lance.valor + DEGRAU, Math.ceil((leilao.lance.valor * AUMENTO_DO_LANCE) / DEGRAU) * DEGRAU)
  : leilao.inicial);

const marcaDoDia = (liga: Liga) =>
  `${liga.temporada}:${diaDaData(Math.min(liga.rodadaAtual, liga.totalRodadas))}`;

/** Cada clube da máquina põe um jogador à venda por dia e vende no máximo esse. */
export function ofertasDoDia(liga: Liga): Oferta[] {
  const marca = marcaDoDia(liga);
  const dia = diaDaData(Math.min(liga.rodadaAtual, liga.totalRodadas));
  return liga.clubes
    .filter((c) => c.donoId === null && c.vendaNoDia !== marca)
    .map((c) => {
      const rng = criarRng(combinarSementes(liga.semente, liga.temporada, dia, c.id, 13));
      const jogador = c.elenco[inteiro(rng, 0, c.elenco.length - 1)];
      return { jogador, clubeId: c.id, clubeNome: c.nome, preco: precoDeCompra(jogador) };
    })
    .sort((a, b) => b.jogador.forca - a.jogador.forca || a.jogador.id - b.jogador.id);
}

export const leiloesDe = (liga: Liga): Leilao[] => liga.leiloes ?? [];

const lideradosPor = (liga: Liga, clubeId: number, exceto?: number) =>
  leiloesDe(liga).filter((l) => l.lance?.clubeId === clubeId && l.jogadorId !== exceto);

/** O maior lance fica reservado, para ninguém prometer o mesmo dinheiro duas vezes. */
export const saldoLivre = (liga: Liga, clube: Clube, exceto?: number) =>
  clube.saldo - lideradosPor(liga, clube.id, exceto).reduce((soma, l) => soma + (l.lance?.valor ?? 0), 0);

function buscarClube(liga: Liga, id: number) {
  const clube = liga.clubes.find((c) => c.id === id);
  if (!clube) throw new ErroTransferencia('Clube não encontrado');
  return clube;
}

function buscarJogador(clube: Clube, id: number) {
  const jogador = clube.elenco.find((j) => j.id === id);
  if (!jogador) throw new ErroTransferencia('Este jogador não é do seu elenco');
  return jogador;
}

function checarSaida(liga: Liga, clube: Clube, jogador: Jogador) {
  const emLeilao = new Set(leiloesDe(liga).filter((l) => l.vendedorId === clube.id).map((l) => l.jogadorId));
  if (emLeilao.has(jogador.id)) throw new ErroTransferencia('Este jogador já está em leilão');
  const ficam = clube.elenco.filter((j) => j.id !== jogador.id && !emLeilao.has(j.id));
  if (ficam.length < ELENCO_MINIMO) throw new ErroTransferencia(`O elenco precisa de pelo menos ${ELENCO_MINIMO} jogadores`);
  if (!ficam.some((j) => j.posicao === 'GOL')) throw new ErroTransferencia('O clube precisa de um goleiro');
}

function semOJogador(clube: Clube, jogadorId: number, saldo: number): Clube {
  const novo = { ...clube, saldo, elenco: clube.elenco.filter((j) => j.id !== jogadorId) };
  return { ...novo, escalacao: repararEscalacao(novo) };
}

const comHistorico = (liga: Liga, item: Omit<Transferencia, 'temporada'>) =>
  [{ ...item, temporada: liga.temporada }, ...(liga.transferencias ?? [])].slice(0, HISTORICO);

/** Compra direta: quem paga primeiro leva, e a máquina repõe a vaga com um jovem da mesma posição. */
export function comprarDaMaquina(liga: Liga, clubeId: number, jogadorId: number): Liga {
  const comprador = buscarClube(liga, clubeId);
  const oferta = ofertasDoDia(liga).find((o) => o.jogador.id === jogadorId);
  if (!oferta) throw new ErroTransferencia('Este jogador não está mais à venda');
  if (comprador.elenco.length >= ELENCO_MAXIMO) throw new ErroTransferencia(`O elenco já tem ${ELENCO_MAXIMO} jogadores`);
  if (saldoLivre(liga, comprador) < oferta.preco) throw new ErroTransferencia('Saldo insuficiente');

  const ultimoId = Math.max(...liga.clubes.flatMap((c) => c.elenco.map((j) => j.id)));
  const rng = criarRng(combinarSementes(liga.semente, liga.temporada, liga.rodadaAtual, oferta.clubeId, jogadorId));
  const jovem = revelarJovem(rng, ultimoId + 1, oferta.jogador);
  return {
    ...liga,
    clubes: liga.clubes.map((c) => {
      if (c.id === clubeId) return { ...c, saldo: c.saldo - oferta.preco, elenco: [...c.elenco, oferta.jogador] };
      if (c.id !== oferta.clubeId) return c;
      return {
        ...c,
        saldo: c.saldo + oferta.preco,
        vendaNoDia: marcaDoDia(liga),
        elenco: c.elenco.map((j) => (j.id === jogadorId ? jovem : j)),
      };
    }),
    transferencias: comHistorico(liga, {
      jogador: oferta.jogador.nome, deId: oferta.clubeId, paraId: clubeId, valor: oferta.preco,
    }),
  };
}

/** Venda imediata para fora da liga: o jogador sai do jogo. */
export function venderParaFora(liga: Liga, clubeId: number, jogadorId: number): Liga {
  const clube = buscarClube(liga, clubeId);
  const jogador = buscarJogador(clube, jogadorId);
  checarSaida(liga, clube, jogador);
  const valor = precoDeVenda(jogador);
  return {
    ...liga,
    clubes: liga.clubes.map((c) => (c.id === clubeId ? semOJogador(c, jogadorId, c.saldo + valor) : c)),
    transferencias: comHistorico(liga, { jogador: jogador.nome, deId: clubeId, paraId: null, valor }),
  };
}

/** O lance inicial é fixo para amigos não passarem craques de graça entre si. */
export function criarLeilao(liga: Liga, clubeId: number, jogadorId: number): Liga {
  const clube = buscarClube(liga, clubeId);
  const jogador = buscarJogador(clube, jogadorId);
  checarSaida(liga, clube, jogador);
  if (!liga.clubes.some((c) => c.donoId !== null && c.id !== clubeId)) {
    throw new ErroTransferencia('O leilão precisa de outro técnico na liga');
  }
  const leilao: Leilao = {
    jogadorId,
    vendedorId: clubeId,
    inicial: precoDeVenda(jogador),
    encerraNaData: liga.rodadaAtual + DATAS_DE_LEILAO,
    lance: null,
  };
  return { ...liga, leiloes: [...leiloesDe(liga), leilao] };
}

export function darLance(liga: Liga, clubeId: number, jogadorId: number, valor: number): Liga {
  const clube = buscarClube(liga, clubeId);
  const leilao = leiloesDe(liga).find((l) => l.jogadorId === jogadorId);
  if (!leilao) throw new ErroTransferencia('Este leilão já terminou');
  if (leilao.vendedorId === clubeId) throw new ErroTransferencia('Você não pode dar lance no seu próprio jogador');
  if (leilao.lance?.clubeId === clubeId) throw new ErroTransferencia('Seu lance já é o maior');
  if (!Number.isInteger(valor) || valor < proximoLance(leilao)) throw new ErroTransferencia('Outro técnico deu um lance maior');
  if (saldoLivre(liga, clube, jogadorId) < valor) throw new ErroTransferencia('Saldo insuficiente');
  if (clube.elenco.length + lideradosPor(liga, clubeId).length >= ELENCO_MAXIMO) {
    throw new ErroTransferencia(`O elenco já tem ${ELENCO_MAXIMO} jogadores`);
  }
  return {
    ...liga,
    leiloes: leiloesDe(liga).map((l) => (l === leilao ? { ...l, lance: { clubeId, valor } } : l)),
  };
}

function concluir(liga: Liga, leilao: Leilao): Liga {
  const semLeilao = { ...liga, leiloes: leiloesDe(liga).filter((l) => l !== leilao) };
  if (!leilao.lance) return semLeilao;
  const { clubeId, valor } = leilao.lance;
  const comprador = buscarClube(liga, clubeId);
  const vendedor = buscarClube(liga, leilao.vendedorId);
  const jogador = vendedor.elenco.find((j) => j.id === leilao.jogadorId);
  // Os salários podem ter consumido o saldo: sem dinheiro, o jogador fica onde está.
  if (!jogador || comprador.saldo < valor || comprador.elenco.length >= ELENCO_MAXIMO) return semLeilao;
  return {
    ...semLeilao,
    clubes: liga.clubes.map((c) => {
      if (c.id === clubeId) return { ...c, saldo: c.saldo - valor, elenco: [...c.elenco, jogador] };
      return c.id === leilao.vendedorId ? semOJogador(c, jogador.id, c.saldo + valor) : c;
    }),
    transferencias: comHistorico(liga, { jogador: jogador.nome, deId: vendedor.id, paraId: clubeId, valor }),
  };
}

/** Com `todos`, fecha o que estiver aberto: nenhum leilão atravessa a virada da temporada. */
export function encerrarLeiloes(liga: Liga, todos = false): Liga {
  return leiloesDe(liga)
    .filter((l) => todos || liga.rodadaAtual >= l.encerraNaData)
    .reduce(concluir, liga);
}
