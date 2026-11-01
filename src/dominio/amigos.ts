import { combinarSementes, criarRng, embaralhar } from './aleatorio.ts';
import { agendar, jogarPartida, partidasDaRodada, registrarTitulo, temporadaEncerrada, vencedorDaPartida } from './liga.ts';
import type { Clube, Fase, Liga } from './tipos.ts';

export const MIN_TECNICOS = 2;
export const MAX_TECNICOS = 16;
export type SituacaoNoMataMata = 'aguardando' | 'vivo' | 'eliminado' | 'campeao';

const FASES: Record<number, Fase> = { 16: 'oitavas', 8: 'quartas', 4: 'semifinal', 2: 'final' };

/** Maior que qualquer id de jogador de uma liga: separa os elencos que vêm de fora. */
const FAIXA_DE_IDS = 1_000_000;

/**
 * O time de verdade mora no Mundo Oficial. O mata-mata de amigos recebe uma cópia antes de cada fase e
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

/** Só técnicos jogam: sem clubes da máquina, sem pontos e sem calendário até o sorteio. */
export function criarMataMata(id: string, semente: number): Liga {
  return {
    id,
    tipo: 'amigos',
    divisao: null,
    temporada: 1,
    dificuldade: 'normal',
    duracao: 'torneio',
    semente,
    rodadaAtual: 1,
    totalRodadas: 1,
    clubes: [],
    partidas: [],
    titulos: [],
  };
}

export function adicionarTecnico(liga: Liga, donoId: string, time: Clube): Liga {
  const vaga: Clube = {
    ...time, id: liga.clubes.length, donoId, personalidade: null, saldo: 0, decididoNoDia: undefined, vendaNoDia: undefined,
  };
  return levarTime({ ...liga, clubes: [...liga.clubes, vaga] }, donoId, time);
}

function agendarFase(liga: Liga, rodada: number, ids: number[], vagas: number) {
  for (let i = 0; i + 1 < ids.length; i += 2) {
    agendar(liga, {
      rodada, competicao: 'copa', torneio: 0, fase: FASES[vagas], casaId: ids[i], foraId: ids[i + 1], decisiva: true,
    });
  }
}

/** Com número ímpar ou fora das potências de 2, os primeiros do sorteio passam direto para a 2ª fase. */
export function sortearChave(liga: Liga): Liga {
  const rng = criarRng(combinarSementes(liga.semente, 1));
  const ids = embaralhar(rng, liga.clubes.map((c) => c.id));
  const totalRodadas = Math.ceil(Math.log2(ids.length));
  const vagas = 2 ** totalRodadas;
  const diretos = vagas - ids.length;
  const nova: Liga = { ...liga, totalRodadas, partidas: [], avancam: ids.slice(0, diretos) };
  agendarFase(nova, 1, ids.slice(diretos), vagas);
  return nova;
}

/** Empate vai para os pênaltis. Quem vence espera a próxima fase; a final define o campeão. */
export function jogarFaseDoMataMata(liga: Liga): Liga {
  if (temporadaEncerrada(liga)) return liga;
  const nova: Liga = JSON.parse(JSON.stringify(liga));
  const rodada = nova.rodadaAtual;
  const partidas = partidasDaRodada(nova, rodada);
  for (const partida of partidas) jogarPartida(nova, partida);
  const seguem = [...(nova.avancam ?? []), ...partidas.map((p) => vencedorDaPartida(nova, p))];

  if (rodada === nova.totalRodadas) {
    registrarTitulo(nova, 'copa', 0, seguem[0]);
  } else {
    agendarFase(nova, rodada + 1, seguem, seguem.length);
  }
  nova.avancam = [];
  nova.rodadaAtual = rodada + 1;
  return nova;
}

export function situacaoNoMataMata(liga: Liga, clubeId: number, iniciada: boolean): SituacaoNoMataMata {
  if (!iniciada) return 'aguardando';
  if (liga.titulos[0]?.clubeId === clubeId) return 'campeao';
  if (temporadaEncerrada(liga)) return 'eliminado';
  const perdeu = liga.partidas.some((p) => (
    p.resultado && (p.casaId === clubeId || p.foraId === clubeId) && vencedorDaPartida(liga, p) !== clubeId
  ));
  return perdeu ? 'eliminado' : 'vivo';
}
