import type { Dificuldade, Estilo, Posicao } from '../dominio/tipos';

export type IdiomaApp = 'pt' | 'en' | 'es';

export interface Textos {
  abaClube: string;
  abaElenco: string;
  abaTabela: string;
  novaLigaTitulo: string;
  novaLigaTexto: string;
  nomeClube: string;
  nomeClubeExemplo: string;
  tamanhoLiga: string;
  clubes: (n: number) => string;
  dificuldade: string;
  dificuldades: Record<Dificuldade, string>;
  iniciarLiga: string;
  erroNome: string;
  rodadaDe: (rodada: number, total: number) => string;
  emCasa: string;
  foraDeCasa: string;
  jogarRodada: string;
  simulando: string;
  ultimoJogo: string;
  posicaoAtual: (posicao: number, pontos: number) => string;
  desfalques: (n: number) => string;
  temporadaFim: string;
  campeao: (clube: string) => string;
  suaPosicao: (posicao: number) => string;
  novaLiga: string;
  apagarTitulo: string;
  apagarTexto: string;
  apagar: string;
  cancelar: string;
  formacao: string;
  estilo: string;
  estilos: Record<Estilo, string>;
  titulares: string;
  reservas: string;
  ajudaEscalacao: string;
  ajudaTroca: (jogador: string) => string;
  posicoes: Record<Posicao, string>;
  idadeAnos: (idade: number) => string;
  rodadasFora: (n: number) => string;
  classificacao: string;
  rodadas: string;
  colunas: { pontos: string; jogos: string; vitorias: string; saldo: string };
  rodada: (n: number) => string;
  aguardando: string;
  partidaNaoEncontrada: string;
  pularNarracao: string;
  fimDeJogo: string;
  semLances: string;
  posse: string;
  chances: string;
  narracaoGol: (jogador: string, assistencia?: string) => string;
  narracaoChance: (jogador: string) => string;
  narracaoAmarelo: (jogador: string) => string;
  narracaoVermelho: (jogador: string) => string;
  narracaoLesao: (jogador: string, rodadas: number) => string;
}

const pt: Textos = {
  abaClube: 'Clube',
  abaElenco: 'Elenco',
  abaTabela: 'Tabela',
  novaLigaTitulo: 'Monte sua liga',
  novaLigaTexto: 'Dê um nome ao seu clube. As outras vagas ficam com clubes da máquina.',
  nomeClube: 'Nome do clube',
  nomeClubeExemplo: 'Ex.: Unidos da Vila',
  tamanhoLiga: 'Tamanho da liga',
  clubes: (n) => `${n} clubes`,
  dificuldade: 'Dificuldade',
  dificuldades: { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' },
  iniciarLiga: 'Começar temporada',
  erroNome: 'Use de 3 a 24 letras no nome do clube.',
  rodadaDe: (rodada, total) => `Rodada ${rodada} de ${total}`,
  emCasa: 'Em casa',
  foraDeCasa: 'Fora de casa',
  jogarRodada: 'Jogar rodada',
  simulando: 'Simulando...',
  ultimoJogo: 'Último jogo',
  posicaoAtual: (posicao, pontos) => `${posicao}º lugar · ${pontos} pts`,
  desfalques: (n) => (n === 1 ? '1 titular fora: o reserva entra sozinho.' : `${n} titulares fora: os reservas entram sozinhos.`),
  temporadaFim: 'Fim da temporada',
  campeao: (clube) => `${clube} é o campeão!`,
  suaPosicao: (posicao) => `Seu clube terminou em ${posicao}º lugar.`,
  novaLiga: 'Nova liga',
  apagarTitulo: 'Começar outra liga?',
  apagarTexto: 'A liga atual será apagada.',
  apagar: 'Apagar',
  cancelar: 'Cancelar',
  formacao: 'Formação',
  estilo: 'Estilo de jogo',
  estilos: { defensivo: 'Defensivo', equilibrado: 'Equilibrado', ofensivo: 'Ofensivo' },
  titulares: 'Titulares',
  reservas: 'Reservas',
  ajudaEscalacao: 'Toque em um titular para trocá-lo por um reserva da mesma posição.',
  ajudaTroca: (jogador) => `Escolha quem entra no lugar de ${jogador}.`,
  posicoes: { GOL: 'GOL', DEF: 'DEF', MEI: 'MEI', ATA: 'ATA' },
  idadeAnos: (idade) => `${idade} anos`,
  rodadasFora: (n) => (n === 1 ? 'Fora por 1 rodada' : `Fora por ${n} rodadas`),
  classificacao: 'Classificação',
  rodadas: 'Rodadas',
  colunas: { pontos: 'P', jogos: 'J', vitorias: 'V', saldo: 'SG' },
  rodada: (n) => `Rodada ${n}`,
  aguardando: 'x',
  partidaNaoEncontrada: 'Partida não encontrada.',
  pularNarracao: 'Pular para o fim',
  fimDeJogo: 'Fim de jogo',
  semLances: 'A bola vai rolar...',
  posse: 'Posse de bola',
  chances: 'Finalizações',
  narracaoGol: (jogador, assistencia) => `GOL de ${jogador}!${assistencia ? ` Passe de ${assistencia}.` : ''}`,
  narracaoChance: (jogador) => `${jogador} finaliza e quase marca.`,
  narracaoAmarelo: (jogador) => `Cartão amarelo para ${jogador}.`,
  narracaoVermelho: (jogador) => `Cartão vermelho! ${jogador} foi expulso e perde o próximo jogo.`,
  narracaoLesao: (jogador, rodadas) => `${jogador} se lesionou e fica fora por ${rodadas} ${rodadas === 1 ? 'rodada' : 'rodadas'}.`,
};

const en: Textos = {
  abaClube: 'Club',
  abaElenco: 'Squad',
  abaTabela: 'Table',
  novaLigaTitulo: 'Set up your league',
  novaLigaTexto: 'Name your club. The other places go to computer clubs.',
  nomeClube: 'Club name',
  nomeClubeExemplo: 'E.g. Riverside United',
  tamanhoLiga: 'League size',
  clubes: (n) => `${n} clubs`,
  dificuldade: 'Difficulty',
  dificuldades: { facil: 'Easy', normal: 'Normal', dificil: 'Hard' },
  iniciarLiga: 'Start season',
  erroNome: 'Use 3 to 24 characters for the club name.',
  rodadaDe: (rodada, total) => `Round ${rodada} of ${total}`,
  emCasa: 'Home',
  foraDeCasa: 'Away',
  jogarRodada: 'Play round',
  simulando: 'Simulating...',
  ultimoJogo: 'Last match',
  posicaoAtual: (posicao, pontos) => `Position ${posicao} · ${pontos} pts`,
  desfalques: (n) => (n === 1 ? '1 starter out: a substitute steps in automatically.' : `${n} starters out: substitutes step in automatically.`),
  temporadaFim: 'End of season',
  campeao: (clube) => `${clube} are the champions!`,
  suaPosicao: (posicao) => `Your club finished in position ${posicao}.`,
  novaLiga: 'New league',
  apagarTitulo: 'Start another league?',
  apagarTexto: 'The current league will be deleted.',
  apagar: 'Delete',
  cancelar: 'Cancel',
  formacao: 'Formation',
  estilo: 'Playing style',
  estilos: { defensivo: 'Defensive', equilibrado: 'Balanced', ofensivo: 'Attacking' },
  titulares: 'Starters',
  reservas: 'Substitutes',
  ajudaEscalacao: 'Tap a starter to swap them with a substitute in the same position.',
  ajudaTroca: (jogador) => `Choose who replaces ${jogador}.`,
  posicoes: { GOL: 'GK', DEF: 'DEF', MEI: 'MID', ATA: 'FWD' },
  idadeAnos: (idade) => `Age ${idade}`,
  rodadasFora: (n) => (n === 1 ? 'Out for 1 round' : `Out for ${n} rounds`),
  classificacao: 'Standings',
  rodadas: 'Rounds',
  colunas: { pontos: 'Pts', jogos: 'P', vitorias: 'W', saldo: 'GD' },
  rodada: (n) => `Round ${n}`,
  aguardando: 'v',
  partidaNaoEncontrada: 'Match not found.',
  pularNarracao: 'Skip to the end',
  fimDeJogo: 'Full time',
  semLances: 'Kick-off coming up...',
  posse: 'Possession',
  chances: 'Shots',
  narracaoGol: (jogador, assistencia) => `GOAL by ${jogador}!${assistencia ? ` Assist from ${assistencia}.` : ''}`,
  narracaoChance: (jogador) => `${jogador} shoots and nearly scores.`,
  narracaoAmarelo: (jogador) => `Yellow card for ${jogador}.`,
  narracaoVermelho: (jogador) => `Red card! ${jogador} is sent off and misses the next match.`,
  narracaoLesao: (jogador, rodadas) => `${jogador} is injured and out for ${rodadas} ${rodadas === 1 ? 'round' : 'rounds'}.`,
};

const es: Textos = {
  abaClube: 'Club',
  abaElenco: 'Plantilla',
  abaTabela: 'Tabla',
  novaLigaTitulo: 'Arma tu liga',
  novaLigaTexto: 'Ponle nombre a tu club. Las demás plazas son para clubes de la máquina.',
  nomeClube: 'Nombre del club',
  nomeClubeExemplo: 'Ej.: Unidos del Barrio',
  tamanhoLiga: 'Tamaño de la liga',
  clubes: (n) => `${n} clubes`,
  dificuldade: 'Dificultad',
  dificuldades: { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' },
  iniciarLiga: 'Empezar temporada',
  erroNome: 'Usa de 3 a 24 letras en el nombre del club.',
  rodadaDe: (rodada, total) => `Jornada ${rodada} de ${total}`,
  emCasa: 'En casa',
  foraDeCasa: 'Fuera de casa',
  jogarRodada: 'Jugar jornada',
  simulando: 'Simulando...',
  ultimoJogo: 'Último partido',
  posicaoAtual: (posicao, pontos) => `Puesto ${posicao} · ${pontos} pts`,
  desfalques: (n) => (n === 1 ? '1 titular fuera: el suplente entra solo.' : `${n} titulares fuera: los suplentes entran solos.`),
  temporadaFim: 'Fin de la temporada',
  campeao: (clube) => `¡${clube} es el campeón!`,
  suaPosicao: (posicao) => `Tu club terminó en el puesto ${posicao}.`,
  novaLiga: 'Nueva liga',
  apagarTitulo: '¿Empezar otra liga?',
  apagarTexto: 'La liga actual se borrará.',
  apagar: 'Borrar',
  cancelar: 'Cancelar',
  formacao: 'Formación',
  estilo: 'Estilo de juego',
  estilos: { defensivo: 'Defensivo', equilibrado: 'Equilibrado', ofensivo: 'Ofensivo' },
  titulares: 'Titulares',
  reservas: 'Suplentes',
  ajudaEscalacao: 'Toca a un titular para cambiarlo por un suplente de la misma posición.',
  ajudaTroca: (jogador) => `Elige quién entra por ${jogador}.`,
  posicoes: { GOL: 'POR', DEF: 'DEF', MEI: 'MED', ATA: 'DEL' },
  idadeAnos: (idade) => `${idade} años`,
  rodadasFora: (n) => (n === 1 ? 'Fuera 1 jornada' : `Fuera ${n} jornadas`),
  classificacao: 'Clasificación',
  rodadas: 'Jornadas',
  colunas: { pontos: 'P', jogos: 'J', vitorias: 'G', saldo: 'DG' },
  rodada: (n) => `Jornada ${n}`,
  aguardando: 'x',
  partidaNaoEncontrada: 'Partido no encontrado.',
  pularNarracao: 'Saltar al final',
  fimDeJogo: 'Final del partido',
  semLances: 'Va a rodar el balón...',
  posse: 'Posesión',
  chances: 'Remates',
  narracaoGol: (jogador, assistencia) => `¡GOL de ${jogador}!${assistencia ? ` Pase de ${assistencia}.` : ''}`,
  narracaoChance: (jogador) => `${jogador} remata y casi marca.`,
  narracaoAmarelo: (jogador) => `Tarjeta amarilla para ${jogador}.`,
  narracaoVermelho: (jogador) => `¡Tarjeta roja! ${jogador} es expulsado y se pierde el próximo partido.`,
  narracaoLesao: (jogador, rodadas) => `${jogador} se lesionó y estará fuera ${rodadas} ${rodadas === 1 ? 'jornada' : 'jornadas'}.`,
};

/** Idiomas sem tradução caem no inglês. */
export function textosPara(idioma: string | null): Textos {
  if (idioma === 'pt') return pt;
  if (idioma === 'es') return es;
  return en;
}
