export type Posicao = 'GOL' | 'DEF' | 'MEI' | 'ATA';
export type Formacao = '4-4-2' | '4-3-3' | '3-5-2' | '5-4-1';
export type Estilo = 'defensivo' | 'equilibrado' | 'ofensivo';
export type Personalidade = 'retranqueiro' | 'equilibrado' | 'ofensivo' | 'formador';
export type Dificuldade = 'facil' | 'normal' | 'dificil';
export type TipoCampeonato = 'amigos' | 'oficial';
export type DuracaoLiga = 'torneio' | 'temporada';
export type Competicao = 'liga' | 'copa' | 'prata' | 'taca';
export type Fase = 'pontos' | 'quartas' | 'semifinal' | 'terceiro' | 'final';

export interface Jogador {
  id: number;
  nome: string;
  posicao: Posicao;
  idade: number;
  /** Nível de 30 a 100, mostrado ao técnico como "Nível". */
  forca: number;
  /** Teto da evolução; só os jovens têm potencial acima da força atual. */
  potencial: number;
  /** De 0 a 100: cai ao jogar e recupera a cada data do calendário. */
  energia: number;
  /** Datas que ainda vai perder por lesão ou suspensão. */
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
  /** Ligado, o assistente poupa cansados e repõe desfalques a cada jogo. */
  assistente: boolean;
  saldo: number;
  /** Dia em que o técnico respondeu à decisão diária. */
  decididoNoDia?: number;
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
  /** Energia média dos titulares ao começar o jogo. */
  energiaCasa?: number;
  energiaFora?: number;
  eventos: Evento[];
  /** Preenchido quando um mata-mata empata e vai para os pênaltis. */
  vencedorPenaltis?: number;
}

export interface Partida {
  id: number;
  /** Data do calendário da temporada, de 1 até o total: três por dia. */
  rodada: number;
  competicao: Competicao;
  /** De 1 a 3; 0 na Taça dos Campeões. */
  torneio: number;
  fase: Fase;
  /** Jogo que define quem avança; em confronto de ida e volta, é o de volta. */
  decisiva: boolean;
  idaId?: number;
  casaId: number;
  foraId: number;
  resultado: Resultado | null;
}

export interface Titulo {
  temporada: number;
  torneio: number;
  competicao: Competicao;
  clubeId: number;
  nomeClube: string;
}

export interface Liga {
  id: string;
  tipo: TipoCampeonato;
  /** Preenchida só no Mundo Oficial. */
  divisao: string | null;
  temporada: number;
  dificuldade: Dificuldade;
  duracao: DuracaoLiga;
  semente: number;
  /** Próxima data a jogar; passa do total quando a temporada acaba. */
  rodadaAtual: number;
  totalRodadas: number;
  clubes: Clube[];
  /** Os mata-matas entram aqui quando a fase anterior termina. */
  partidas: Partida[];
  titulos: Titulo[];
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
