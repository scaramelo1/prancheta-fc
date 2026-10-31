import { combinarSementes } from './aleatorio.ts';
import { gerarCalendario } from './calendario.ts';
import { escalacaoParaJogo, melhorEscalacao } from './escalacao.ts';
import { gerarClubes } from './geracao.ts';
import type { OpcoesClubes } from './geracao.ts';
import { montarEquipe, simularPartida } from './simulacao.ts';
import type { Clube, Liga, LinhaTabela, Partida } from './tipos.ts';

export function criarLiga(id: string, opcoes: OpcoesClubes): Liga {
  const clubes = gerarClubes(opcoes);
  clubes[0].escalacao = melhorEscalacao(clubes[0], '4-4-2', 'equilibrado');
  return {
    id,
    tipo: 'amigos',
    divisao: null,
    temporada: 1,
    dificuldade: opcoes.dificuldade,
    semente: opcoes.semente,
    rodadaAtual: 1,
    totalRodadas: (opcoes.tamanho - 1) * 2,
    clubes,
    partidas: gerarCalendario(clubes.map((c) => c.id)),
  };
}

export const temporadaEncerrada = (liga: Liga) => liga.rodadaAtual > liga.totalRodadas;

export const clubeDoDono = (liga: Liga, donoId: string) => liga.clubes.find((c) => c.donoId === donoId);

export const clubePorId = (liga: Liga, id: number) => liga.clubes.find((c) => c.id === id) as Clube;

export const partidasDaRodada = (liga: Liga, rodada: number) => liga.partidas.filter((p) => p.rodada === rodada);

export const partidaDoClube = (liga: Liga, rodada: number, clubeId: number) =>
  partidasDaRodada(liga, rodada).find((p) => p.casaId === clubeId || p.foraId === clubeId);

/** Devolve uma liga nova com a rodada simulada; a mesma semente dá sempre o mesmo resultado. */
export function jogarRodada(liga: Liga): Liga {
  if (temporadaEncerrada(liga)) return liga;
  const nova: Liga = structuredClone(liga);
  const rodada = nova.rodadaAtual;

  const foraNaRodada = new Set(
    nova.clubes.flatMap((c) => c.elenco.filter((j) => j.rodadasFora > 0).map((j) => j.id)),
  );

  for (const partida of partidasDaRodada(nova, rodada)) {
    const casa = clubePorId(nova, partida.casaId);
    const fora = clubePorId(nova, partida.foraId);
    const semente = combinarSementes(nova.semente, nova.temporada, partida.id);
    partida.resultado = simularPartida(
      montarEquipe(casa, escalacaoParaJogo(casa)),
      montarEquipe(fora, escalacaoParaJogo(fora)),
      semente,
    );
    for (const evento of partida.resultado.eventos) {
      if (!evento.rodadasFora) continue;
      const jogador = clubePorId(nova, evento.clubeId).elenco.find((j) => j.id === evento.jogadorId);
      if (jogador) jogador.rodadasFora = evento.rodadasFora;
    }
  }

  // Só desconta de quem já estava fora: quem se machucou agora ainda vai perder a próxima.
  for (const clube of nova.clubes) {
    for (const jogador of clube.elenco) {
      if (foraNaRodada.has(jogador.id)) jogador.rodadasFora -= 1;
    }
  }
  nova.rodadaAtual = rodada + 1;
  return nova;
}

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
export function calcularTabela(clubeIds: number[], partidas: Partida[]): LinhaTabela[] {
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

export const tabelaDaLiga = (liga: Liga) => calcularTabela(liga.clubes.map((c) => c.id), liga.partidas);
