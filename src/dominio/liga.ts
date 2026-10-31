import { combinarSementes, criarRng, embaralhar } from './aleatorio.ts';
import {
  DATAS_DA_TACA, DATAS_DOS_TORNEIOS, DATAS_POR_DIA, DATAS_POR_TORNEIO, TORNEIOS_NA_TEMPORADA,
  copaDaData, dataDaCopa, dataDaLiga, diaDaData, gerarCalendario, torneioDaData,
} from './calendario.ts';
import { escalacaoParaJogo, melhorEscalacao, vagasDaFormacao } from './escalacao.ts';
import {
  BILHETERIA, ENERGIA_GASTA_NO_JOGO, ENERGIA_RECUPERADA_POR_DATA, PREMIOS, evoluirClubes, fatorDaDivisao, folhaSalarial, premioDaLiga,
} from './evolucao.ts';
import { gerarClubes, gerarSigla } from './geracao.ts';
import type { OpcoesClubes } from './geracao.ts';
import { montarEquipe, simularPartida } from './simulacao.ts';
import { encerrarLeiloes } from './transferencias.ts';
import type { Clube, Competicao, DuracaoLiga, Escalacao, Estilo, Fase, Formacao, Liga, LinhaTabela, Partida, Resultado } from './tipos.ts';

/** Clubes de cada copa: os 8 primeiros seguem na principal, os outros 12 vão para a Copa Prata. */
const VAGAS_MATA_MATA = 8;
const RODADAS_FASE_DE_PONTOS = 13;
const RODADAS_PRATA = 6;
const DATAS_POR_SEMANA = DATAS_POR_DIA * 7;
const EVENTOS_ESSENCIAIS: Resultado['eventos'][number]['tipo'][] = ['gol', 'vermelho', 'lesao'];

interface NovaPartida {
  rodada: number;
  competicao: Competicao;
  torneio: number;
  fase: Fase;
  casaId: number;
  foraId: number;
  decisiva?: boolean;
  idaId?: number;
}

function agendar(liga: Liga, nova: NovaPartida): Partida {
  const partida: Partida = { decisiva: false, ...nova, id: liga.partidas.length + 1, resultado: null };
  liga.partidas.push(partida);
  return partida;
}

function gerarTorneio(liga: Liga, torneio: number) {
  const ids = liga.clubes.map((c) => c.id);
  const rng = criarRng(combinarSementes(liga.semente, liga.temporada, torneio));

  for (const { rodada, casaId, foraId } of gerarCalendario(embaralhar(rng, ids))) {
    agendar(liga, { rodada: dataDaLiga(torneio, rodada), competicao: 'liga', torneio, fase: 'pontos', casaId, foraId });
  }
  for (const { rodada, casaId, foraId } of gerarCalendario(embaralhar(rng, ids))) {
    if (rodada > RODADAS_FASE_DE_PONTOS) continue;
    agendar(liga, { rodada: dataDaCopa(torneio, rodada), competicao: 'copa', torneio, fase: 'pontos', casaId, foraId });
  }
}

export function criarLiga(id: string, opcoes: OpcoesClubes & { duracao: DuracaoLiga }): Liga {
  const clubes = gerarClubes(opcoes);
  if (opcoes.donoId) clubes[0].escalacao = melhorEscalacao(clubes[0], '4-4-2', 'equilibrado');
  const liga: Liga = {
    id,
    tipo: 'amigos',
    divisao: null,
    temporada: 1,
    dificuldade: opcoes.dificuldade,
    duracao: opcoes.duracao,
    semente: opcoes.semente,
    rodadaAtual: 1,
    totalRodadas: opcoes.duracao === 'torneio' ? DATAS_POR_TORNEIO : DATAS_DOS_TORNEIOS + DATAS_DA_TACA,
    clubes,
    partidas: [],
    titulos: [],
  };
  gerarTorneio(liga, 1);
  return liga;
}

const forcaDoElenco = (clube: Clube) => clube.elenco.reduce((soma, j) => soma + j.forca, 0);

/** Quem entra assume o clube mais fraco da máquina, para não herdar um time pronto. */
export function entrarNaLiga(liga: Liga, donoId: string, nomeClube: string): Liga {
  if (clubeDoDono(liga, donoId)) throw new Error('Este técnico já está na liga');
  const vagas = liga.clubes.filter((c) => c.donoId === null);
  if (vagas.length === 0) throw new Error('A liga está cheia');
  const vaga = vagas.reduce((fraco, c) => (forcaDoElenco(c) < forcaDoElenco(fraco) ? c : fraco));
  const nome = nomeClube.trim();
  return {
    ...liga,
    clubes: liga.clubes.map((c) => (c.id !== vaga.id ? c : {
      ...c,
      nome,
      sigla: gerarSigla(nome),
      donoId,
      personalidade: null,
      escalacao: melhorEscalacao(c, '4-4-2', 'equilibrado'),
    })),
  };
}

/** Confere a escalação que vem de fora: 11 jogadores do clube, sem repetir, nas vagas da formação. */
export function escalacaoValida(clube: Clube, escalacao: Escalacao): boolean {
  const { formacao, estilo, titulares } = escalacao ?? {};
  if (!(['4-4-2', '4-3-3', '3-5-2', '5-4-1'] as Formacao[]).includes(formacao)) return false;
  if (!(['defensivo', 'equilibrado', 'ofensivo'] as Estilo[]).includes(estilo)) return false;
  if (!Array.isArray(titulares) || titulares.length !== 11) return false;
  const ids = new Set(clube.elenco.map((j) => j.id));
  if (new Set(titulares.map((t) => t.jogadorId)).size !== 11) return false;
  if (!titulares.every((t) => ids.has(t.jogadorId))) return false;
  const vagas = vagasDaFormacao(formacao).sort();
  return titulares.map((t) => t.posicao).sort().every((p, i) => p === vagas[i]);
}

export const temporadaEncerrada = (liga: Liga) => liga.rodadaAtual > liga.totalRodadas;

export const clubeDoDono = (liga: Liga, donoId: string) => liga.clubes.find((c) => c.donoId === donoId);

export const clubePorId = (liga: Liga, id: number) => liga.clubes.find((c) => c.id === id) as Clube;

export const partidasDaRodada = (liga: Liga, rodada: number) => liga.partidas.filter((p) => p.rodada === rodada);

const joga = (p: Partida, clubeId: number) => p.casaId === clubeId || p.foraId === clubeId;

export const partidaDoClube = (liga: Liga, rodada: number, clubeId: number) =>
  partidasDaRodada(liga, rodada).find((p) => joga(p, clubeId));

/** Última partida jogada pelo clube, ainda que ele esteja sem jogo na data atual. */
export const ultimaPartidaDoClube = (liga: Liga, clubeId: number) =>
  liga.partidas.filter((p) => p.resultado && joga(p, clubeId)).sort((a, b) => b.rodada - a.rodada)[0];

/** Torneio em andamento; ao fim da temporada, o último disputado. */
export const torneioAtual = (liga: Liga) => torneioDaData(Math.min(liga.rodadaAtual, liga.totalRodadas));

/** Placar somado de um mata-mata, incluindo o jogo de ida. */
function placarAgregado(liga: Liga, partida: Partida, resultado: Resultado) {
  const ida = partida.idaId ? liga.partidas.find((p) => p.id === partida.idaId)?.resultado : null;
  return { casa: resultado.golsCasa + (ida?.golsFora ?? 0), fora: resultado.golsFora + (ida?.golsCasa ?? 0) };
}

export function vencedorDaPartida(liga: Liga, partida: Partida) {
  const resultado = partida.resultado as Resultado;
  const { casa, fora } = placarAgregado(liga, partida, resultado);
  if (casa === fora) return resultado.vencedorPenaltis as number;
  return casa > fora ? partida.casaId : partida.foraId;
}

const perdedorDaPartida = (liga: Liga, partida: Partida) =>
  (vencedorDaPartida(liga, partida) === partida.casaId ? partida.foraId : partida.casaId);

function somar(linha: LinhaTabela, pro: number, contra: number) {
  linha.jogos += 1;
  linha.golsPro += pro;
  linha.golsContra += contra;
  linha.saldo = linha.golsPro - linha.golsContra;
  if (pro > contra) {
    linha.vitorias += 1;
    linha.pontos += 3;
  } else if (pro === contra) {
    linha.empates += 1;
    linha.pontos += 1;
  } else {
    linha.derrotas += 1;
  }
}

/** Critérios de desempate: vitórias, saldo, gols feitos e, por fim, o id, para a ordem ser estável. */
export function calcularTabela(clubeIds: number[], partidas: Pick<Partida, 'casaId' | 'foraId' | 'resultado'>[]): LinhaTabela[] {
  const linhas = new Map<number, LinhaTabela>(clubeIds.map((clubeId) => [clubeId, {
    clubeId, jogos: 0, pontos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0,
  }]));
  for (const { casaId, foraId, resultado } of partidas) {
    if (!resultado) continue;
    somar(linhas.get(casaId) as LinhaTabela, resultado.golsCasa, resultado.golsFora);
    somar(linhas.get(foraId) as LinhaTabela, resultado.golsFora, resultado.golsCasa);
  }
  return [...linhas.values()].sort((a, b) =>
    b.pontos - a.pontos || b.vitorias - a.vitorias || b.saldo - a.saldo || b.golsPro - a.golsPro || a.clubeId - b.clubeId);
}

const idsDosClubes = (liga: Liga) => liga.clubes.map((c) => c.id);

/** Fase de pontos de uma competição; sem torneio, soma os três (a classificação geral). */
export function tabelaDaCompeticao(liga: Liga, competicao: Competicao, torneio?: number) {
  const partidas = liga.partidas.filter((p) =>
    p.competicao === competicao && p.fase === 'pontos' && (torneio === undefined || p.torneio === torneio));
  const ids = competicao === 'prata' ? [...new Set(partidas.flatMap((p) => [p.casaId, p.foraId]))] : idsDosClubes(liga);
  return calcularTabela(ids, partidas);
}

export const tabelaGeral = (liga: Liga) => tabelaDaCompeticao(liga, 'liga');

function premiar(liga: Liga, clubeId: number, valor: number) {
  clubePorId(liga, clubeId).saldo += Math.round(valor * fatorDaDivisao(liga.divisao));
}

function registrarTitulo(liga: Liga, competicao: Competicao, torneio: number, clubeId: number) {
  liga.titulos.push({
    temporada: liga.temporada, torneio, competicao, clubeId, nomeClube: clubePorId(liga, clubeId).nome,
  });
}

/** Confronto de ida e volta, com a decisão na casa do melhor colocado. */
function agendarIdaEVolta(
  liga: Liga, torneio: number, fase: Fase, rodadaCopa: number, melhorId: number, piorId: number,
) {
  const base = { competicao: 'copa' as const, torneio, fase };
  const ida = agendar(liga, { ...base, rodada: dataDaCopa(torneio, rodadaCopa), casaId: piorId, foraId: melhorId });
  agendar(liga, {
    ...base, rodada: dataDaCopa(torneio, rodadaCopa + 1), casaId: melhorId, foraId: piorId, decisiva: true, idaId: ida.id,
  });
}

function iniciarMataMata(liga: Liga, torneio: number) {
  const classificacao = tabelaDaCompeticao(liga, 'copa', torneio).map((l) => l.clubeId);
  for (const [a, b] of [[0, 7], [3, 4], [1, 6], [2, 5]]) {
    agendarIdaEVolta(liga, torneio, 'quartas', RODADAS_FASE_DE_PONTOS + 1, classificacao[a], classificacao[b]);
  }
  const prata = classificacao.slice(VAGAS_MATA_MATA);
  for (const { rodada, casaId, foraId } of gerarCalendario(prata)) {
    if (rodada > RODADAS_PRATA) continue;
    agendar(liga, {
      rodada: dataDaCopa(torneio, RODADAS_FASE_DE_PONTOS + rodada), competicao: 'prata', torneio, fase: 'pontos', casaId, foraId,
    });
  }
}

const decisivasDaFase = (liga: Liga, torneio: number, fase: Fase) =>
  liga.partidas.filter((p) => p.torneio === torneio && p.fase === fase && p.decisiva).sort((a, b) => a.id - b.id);

function proximaFase(liga: Liga, torneio: number, de: Fase, para: Fase, rodadaCopa: number) {
  const vencedores = decisivasDaFase(liga, torneio, de).map((p) => vencedorDaPartida(liga, p));
  for (let i = 0; i < vencedores.length; i += 2) {
    agendarIdaEVolta(liga, torneio, para, rodadaCopa, vencedores[i], vencedores[i + 1]);
  }
}

function encerrarCopa(liga: Liga, torneio: number) {
  const [final] = decisivasDaFase(liga, torneio, 'final');
  const campeao = vencedorDaPartida(liga, final);
  registrarTitulo(liga, 'copa', torneio, campeao);
  premiar(liga, campeao, PREMIOS.copa.campeao);
  premiar(liga, perdedorDaPartida(liga, final), PREMIOS.copa.vice);

  const [prata] = tabelaDaCompeticao(liga, 'prata', torneio);
  registrarTitulo(liga, 'prata', torneio, prata.clubeId);
  premiar(liga, prata.clubeId, PREMIOS.prata.campeao);
}

/** Campeões das três ligas; títulos repetidos abrem vaga para os melhores da classificação geral. */
function classificadosDaTaca(liga: Liga) {
  const campeoes = liga.titulos.filter((t) => t.temporada === liga.temporada && t.competicao === 'liga').map((t) => t.clubeId);
  const geral = tabelaGeral(liga).map((l) => l.clubeId);
  return geral
    .filter((id) => campeoes.includes(id))
    .concat(geral.filter((id) => !campeoes.includes(id)))
    .slice(0, 4);
}

function agendarJogoUnico(liga: Liga, rodada: number, fase: Fase, casaId: number, foraId: number) {
  agendar(liga, { rodada, competicao: 'taca', torneio: 0, fase, casaId, foraId, decisiva: true });
}

function encerrarTorneio(liga: Liga, torneio: number) {
  const tabela = tabelaDaCompeticao(liga, 'liga', torneio);
  tabela.forEach((linha, i) => premiar(liga, linha.clubeId, premioDaLiga(i + 1)));
  registrarTitulo(liga, 'liga', torneio, tabela[0].clubeId);

  if (liga.duracao === 'torneio') return;
  if (torneio < TORNEIOS_NA_TEMPORADA) {
    gerarTorneio(liga, torneio + 1);
    return;
  }
  const [a, b, c, d] = classificadosDaTaca(liga);
  agendarJogoUnico(liga, DATAS_DOS_TORNEIOS + 1, 'semifinal', a, d);
  agendarJogoUnico(liga, DATAS_DOS_TORNEIOS + 1, 'semifinal', b, c);
}

function fecharData(liga: Liga, data: number) {
  const copa = copaDaData(data);
  if (copa?.rodada === RODADAS_FASE_DE_PONTOS) iniciarMataMata(liga, copa.torneio);
  if (copa?.rodada === RODADAS_FASE_DE_PONTOS + 2) proximaFase(liga, copa.torneio, 'quartas', 'semifinal', RODADAS_FASE_DE_PONTOS + 3);
  if (copa?.rodada === RODADAS_FASE_DE_PONTOS + 4) proximaFase(liga, copa.torneio, 'semifinal', 'final', RODADAS_FASE_DE_PONTOS + 5);
  if (copa?.rodada === RODADAS_FASE_DE_PONTOS + 6) encerrarCopa(liga, copa.torneio);

  if (data <= DATAS_DOS_TORNEIOS && data % DATAS_POR_TORNEIO === 0) encerrarTorneio(liga, data / DATAS_POR_TORNEIO);

  if (data === DATAS_DOS_TORNEIOS + 1) {
    const semis = partidasDaRodada(liga, data);
    agendarJogoUnico(liga, data + 1, 'terceiro', perdedorDaPartida(liga, semis[0]), perdedorDaPartida(liga, semis[1]));
    agendarJogoUnico(liga, data + 2, 'final', vencedorDaPartida(liga, semis[0]), vencedorDaPartida(liga, semis[1]));
  }
  if (data === DATAS_DOS_TORNEIOS + DATAS_DA_TACA) {
    const [final] = partidasDaRodada(liga, data);
    const campeao = vencedorDaPartida(liga, final);
    registrarTitulo(liga, 'taca', 0, campeao);
    premiar(liga, campeao, PREMIOS.taca.campeao);
    premiar(liga, perdedorDaPartida(liga, final), PREMIOS.taca.vice);
  }
}

function energiaMedia(escalacao: Escalacao, clube: Clube) {
  const ids = new Set(escalacao.titulares.map((t) => t.jogadorId));
  const titulares = clube.elenco.filter((j) => ids.has(j.id));
  return Math.round(titulares.reduce((soma, j) => soma + j.energia, 0) / titulares.length);
}

function jogarPartida(liga: Liga, partida: Partida) {
  const casa = clubePorId(liga, partida.casaId);
  const fora = clubePorId(liga, partida.foraId);
  const semente = combinarSementes(liga.semente, liga.temporada, partida.id);
  const escalacaoCasa = escalacaoParaJogo(casa);
  const escalacaoFora = escalacaoParaJogo(fora);
  const equipeCasa = montarEquipe(casa, escalacaoCasa);
  const equipeFora = montarEquipe(fora, escalacaoFora);
  const resultado: Resultado = {
    ...simularPartida(equipeCasa, equipeFora, semente),
    energiaCasa: energiaMedia(escalacaoCasa, casa),
    energiaFora: energiaMedia(escalacaoFora, fora),
  };

  if (partida.decisiva) {
    const placar = placarAgregado(liga, partida, resultado);
    if (placar.casa === placar.fora) {
      resultado.vencedorPenaltis = criarRng(semente)() < 0.5 ? partida.casaId : partida.foraId;
    }
  }

  for (const evento of resultado.eventos) {
    if (!evento.rodadasFora) continue;
    const jogador = clubePorId(liga, evento.clubeId).elenco.find((j) => j.id === evento.jogadorId);
    if (jogador) jogador.rodadasFora = evento.rodadasFora;
  }
  for (const [clube, escalacao] of [[casa, escalacaoCasa], [fora, escalacaoFora]] as const) {
    const titulares = new Set(escalacao.titulares.map((t) => t.jogadorId));
    for (const j of clube.elenco) {
      if (titulares.has(j.id)) j.energia = Math.max(0, j.energia - ENERGIA_GASTA_NO_JOGO);
    }
  }
  casa.saldo += Math.round(BILHETERIA * fatorDaDivisao(liga.divisao));

  // São quase 1.700 jogos por temporada: entre clubes da máquina, guarda só o essencial.
  const temHumano = casa.donoId !== null || fora.donoId !== null;
  partida.resultado = temHumano
    ? resultado
    : { ...resultado, eventos: resultado.eventos.filter((e) => EVENTOS_ESSENCIAIS.includes(e.tipo)) };
}

/** Devolve uma liga nova com a data simulada; a mesma semente dá sempre o mesmo resultado. */
export function jogarRodada(liga: Liga): Liga {
  if (temporadaEncerrada(liga)) return liga;
  // Fecha antes do jogo: quem comprou já pode escalar o reforço.
  const nova: Liga = JSON.parse(JSON.stringify(encerrarLeiloes(liga)));
  const data = nova.rodadaAtual;

  const foraNaData = new Set(
    nova.clubes.flatMap((c) => c.elenco.filter((j) => j.rodadasFora > 0).map((j) => j.id)),
  );

  for (const partida of partidasDaRodada(nova, data)) jogarPartida(nova, partida);

  for (const clube of nova.clubes) {
    for (const jogador of clube.elenco) {
      // Só desconta de quem já estava fora: quem se machucou agora ainda vai perder a próxima.
      if (foraNaData.has(jogador.id)) jogador.rodadasFora -= 1;
      jogador.energia = Math.min(100, jogador.energia + ENERGIA_RECUPERADA_POR_DATA);
    }
    if (data % DATAS_POR_SEMANA === 0) clube.saldo -= folhaSalarial(clube);
  }

  fecharData(nova, data);
  nova.rodadaAtual = data + 1;
  return nova;
}

/** Joga as datas que faltam no dia, para quem quer ver só o resumo. */
export function jogarDia(liga: Liga): Liga {
  if (temporadaEncerrada(liga)) return liga;
  const dia = diaDaData(liga.rodadaAtual);
  let atual = liga;
  while (!temporadaEncerrada(atual) && diaDaData(atual.rodadaAtual) === dia) atual = jogarRodada(atual);
  return atual;
}

/** Mantém clubes, saldo e títulos; o elenco envelhece e o calendário recomeça. */
export function novaTemporada(liga: Liga): Liga {
  if (!temporadaEncerrada(liga)) return liga;
  const fechada = encerrarLeiloes(liga, true);
  const nova: Liga = {
    ...fechada,
    clubes: evoluirClubes(fechada),
    temporada: liga.temporada + 1,
    rodadaAtual: 1,
    partidas: [],
  };
  gerarTorneio(nova, 1);
  return nova;
}
