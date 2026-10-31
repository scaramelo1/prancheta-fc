export type Posicao = 'GOL' | 'DEF' | 'MEI' | 'ATA';
export type Formacao = '4-4-2' | '4-3-3' | '3-5-2' | '5-4-1';
export type Estilo = 'defensivo' | 'equilibrado' | 'ofensivo';
export type Personalidade = 'retranqueiro' | 'equilibrado' | 'ofensivo' | 'formador';
export type Dificuldade = 'facil' | 'normal' | 'dificil';
export type TipoCampeonato = 'amigos' | 'oficial';

export interface Jogador {
  id: number;
  nome: string;
  posicao: Posicao;
  idade: number;
  forca: number;
  /** Rodadas que ainda vai perder por lesão ou suspensão. */
  rodadasFora: number;
}

/** A posição é a da vaga, que pode ser diferente da do jogador quando faltam opções. */
export interface Escalado {
  jogadorId: number;
  posicao: Posicao;
}

export interface Escalacao {
  formacao: Formacao;
  estilo: Estilo;
  titulares: Escalado[];
}

export interface Clube {
  id: number;
  nome: string;
  sigla: string;
  cor: string;
  /** null = clube da máquina. */
  donoId: string | null;
  personalidade: Personalidade | null;
  elenco: Jogador[];
  escalacao: Escalacao | null;
}

export type TipoEvento = 'gol' | 'chance' | 'amarelo' | 'vermelho' | 'lesao';

export interface Evento {
  minuto: number;
  tipo: TipoEvento;
  clubeId: number;
  jogadorId: number;
  jogador: string;
  assistencia?: string;
  rodadasFora?: number;
}

export interface Resultado {
  golsCasa: number;
  golsFora: number;
  posseCasa: number;
  chancesCasa: number;
  chancesFora: number;
  eventos: Evento[];
}

export interface Partida {
  id: number;
  rodada: number;
  casaId: number;
  foraId: number;
  resultado: Resultado | null;
}

export interface Liga {
  id: string;
  tipo: TipoCampeonato;
  /** Preenchida só no Mundo Oficial. */
  divisao: string | null;
  temporada: number;
  dificuldade: Dificuldade;
  semente: number;
  /** Próxima rodada a jogar; passa do total quando a temporada acaba. */
  rodadaAtual: number;
  totalRodadas: number;
  clubes: Clube[];
  partidas: Partida[];
}

export interface LinhaTabela {
  clubeId: number;
  jogos: number;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
}
