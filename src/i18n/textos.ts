import type { TipoDecisao } from '../dominio/decisoes';
import type { Motivo } from '../dominio/resumo';
import type { Competicao, Dificuldade, DuracaoLiga, Estilo, Fase, Posicao } from '../dominio/tipos';

export type IdiomaApp = 'pt' | 'en' | 'es';

export interface Textos {
  abaClube: string;
  abaElenco: string;
  abaTabela: string;
  novaLigaTitulo: string;
  novaLigaTexto: string;
  nomeClube: string;
  nomeClubeExemplo: string;
  duracaoLiga: string;
  duracoes: Record<DuracaoLiga, string>;
  dificuldade: string;
  dificuldades: Record<Dificuldade, string>;
  iniciarLiga: string;
  erroNome: string;
  diaHora: (dia: number, hora: string) => string;
  torneios: Record<number, string>;
  competicoes: Record<Competicao, string>;
  fases: Record<Fase, string>;
  semJogo: string;
  simularDia: string;
  verJogo: string;
  soGols: string;
  decisaoDoDia: string;
  aceitar: string;
  recusar: string;
  decisoes: Record<TipoDecisao, (jogador: string) => string>;
  motivos: Record<Motivo, string>;
  avancarData: string;
  saldo: (valor: string) => string;
  temporadaNumero: (n: number) => string;
  titulosClube: string;
  novaTemporada: string;
  assistente: string;
  assistenteTexto: string;
  penaltis: (clube: string) => string;
  energia: (n: number) => string;
  geral: string;
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
  data: (dia: number, hora: string) => string;
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
  duracaoLiga: 'Duração',
  duracoes: { torneio: '1 torneio (19 dias)', temporada: 'Temporada (60 dias)' },
  dificuldade: 'Dificuldade',
  dificuldades: { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' },
  iniciarLiga: 'Começar temporada',
  erroNome: 'Use de 3 a 24 letras no nome do clube.',
  diaHora: (dia, hora) => `Dia ${dia} · ${hora}`,
  torneios: { 0: 'Finais', 1: 'Torneio de Abertura', 2: 'Torneio Intermediário', 3: 'Torneio de Encerramento' },
  competicoes: { liga: 'Liga', copa: 'Copa', prata: 'Copa Prata', taca: 'Taça dos Campeões' },
  fases: { pontos: '', quartas: 'Quartas de final', semifinal: 'Semifinal', terceiro: 'Terceiro lugar', final: 'Final' },
  semJogo: 'Seu clube não joga nesta data.',
  simularDia: 'Simular o dia inteiro',
  verJogo: 'Ver o jogo',
  soGols: 'Só os gols',
  decisaoDoDia: 'Decisão do dia',
  aceitar: 'Aceitar',
  recusar: 'Agora não',
  decisoes: {
    folga: () => 'Dar folga ao elenco por R$ 50 mil? Todos ganham 15 de energia.',
    amistoso: () => 'Amistoso pago: recebe R$ 150 mil, mas todos perdem 10 de energia.',
    jovem: (jogador) => `Treino extra para ${jogador} por R$ 100 mil? Ganha 1 ponto de força.`,
  },
  motivos: {
    expulsao: 'A expulsão pesou: com um a menos, o time perdeu força.',
    cansaco: 'O time entrou mais cansado que o rival. Vale poupar titulares.',
    meioDominado: 'O domínio do meio-campo decidiu o jogo.',
    meioPerdido: 'O rival dominou o meio-campo. Tente reforçar esse setor.',
    faltouPontaria: 'O time criou mais, mas faltou pontaria.',
    aproveitou: 'O time criou menos, mas aproveitou as chances.',
    equilibrado: 'Jogo equilibrado, decidido nos detalhes.',
  },
  avancarData: 'Avançar',
  saldo: (valor) => `Saldo: R$ ${valor}`,
  temporadaNumero: (n) => `Temporada ${n}`,
  titulosClube: 'Títulos do clube',
  novaTemporada: 'Próxima temporada',
  assistente: 'Assistente ligado',
  assistenteTexto: 'Ele poupa cansados e repõe desfalques a cada jogo. Trocar um titular desliga o assistente.',
  penaltis: (clube) => `${clube} venceu nos pênaltis`,
  energia: (n) => `${n}% de energia`,
  geral: 'Geral',
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
  rodadasFora: (n) => (n === 1 ? 'Fora por 1 jogo' : `Fora por ${n} jogos`),
  classificacao: 'Classificação',
  rodadas: 'Rodadas',
  colunas: { pontos: 'P', jogos: 'J', vitorias: 'V', saldo: 'SG' },
  data: (dia, hora) => `Dia ${dia}, ${hora}`,
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
  narracaoLesao: (jogador, rodadas) => `${jogador} se lesionou e fica fora por ${rodadas} jogos.`,
};

const en: Textos = {
  abaClube: 'Club',
  abaElenco: 'Squad',
  abaTabela: 'Table',
  novaLigaTitulo: 'Set up your league',
  novaLigaTexto: 'Name your club. The other places go to computer clubs.',
  nomeClube: 'Club name',
  nomeClubeExemplo: 'E.g. Riverside United',
  duracaoLiga: 'Length',
  duracoes: { torneio: '1 tournament (19 days)', temporada: 'Season (60 days)' },
  dificuldade: 'Difficulty',
  dificuldades: { facil: 'Easy', normal: 'Normal', dificil: 'Hard' },
  iniciarLiga: 'Start season',
  erroNome: 'Use 3 to 24 characters for the club name.',
  diaHora: (dia, hora) => `Day ${dia} · ${hora}`,
  torneios: { 0: 'Finals', 1: 'Opening Tournament', 2: 'Middle Tournament', 3: 'Closing Tournament' },
  competicoes: { liga: 'League', copa: 'Cup', prata: 'Silver Cup', taca: 'Champions Trophy' },
  fases: { pontos: '', quartas: 'Quarter-final', semifinal: 'Semi-final', terceiro: 'Third place', final: 'Final' },
  semJogo: 'Your club has no match on this date.',
  simularDia: 'Simulate the whole day',
  verJogo: 'View match',
  soGols: 'Goals only',
  decisaoDoDia: 'Decision of the day',
  aceitar: 'Accept',
  recusar: 'Not now',
  decisoes: {
    folga: () => 'Give the squad a day off for 50,000? Everyone gains 15 energy.',
    amistoso: () => 'Paid friendly: earn 150,000, but everyone loses 10 energy.',
    jovem: (jogador) => `Extra training for ${jogador} for 100,000? Gains 1 strength point.`,
  },
  motivos: {
    expulsao: 'The red card hurt: a player down, the team lost strength.',
    cansaco: 'The team started more tired than the opponent. Consider resting starters.',
    meioDominado: 'Control of midfield decided the match.',
    meioPerdido: 'The opponent controlled midfield. Try strengthening that area.',
    faltouPontaria: 'The team created more but lacked finishing.',
    aproveitou: 'The team created less but took its chances.',
    equilibrado: 'A close match, decided by the details.',
  },
  avancarData: 'Continue',
  saldo: (valor) => `Balance: ${valor}`,
  temporadaNumero: (n) => `Season ${n}`,
  titulosClube: 'Club honours',
  novaTemporada: 'Next season',
  assistente: 'Assistant on',
  assistenteTexto: 'Rests tired players and covers absences every match. Swapping a starter turns it off.',
  penaltis: (clube) => `${clube} won on penalties`,
  energia: (n) => `${n}% energy`,
  geral: 'Overall',
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
  rodadasFora: (n) => (n === 1 ? 'Out for 1 match' : `Out for ${n} matches`),
  classificacao: 'Standings',
  rodadas: 'Rounds',
  colunas: { pontos: 'Pts', jogos: 'P', vitorias: 'W', saldo: 'GD' },
  data: (dia, hora) => `Day ${dia}, ${hora}`,
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
  narracaoLesao: (jogador, rodadas) => `${jogador} is injured and out for ${rodadas} matches.`,
};

const es: Textos = {
  abaClube: 'Club',
  abaElenco: 'Plantilla',
  abaTabela: 'Tabla',
  novaLigaTitulo: 'Arma tu liga',
  novaLigaTexto: 'Ponle nombre a tu club. Las demás plazas son para clubes de la máquina.',
  nomeClube: 'Nombre del club',
  nomeClubeExemplo: 'Ej.: Unidos del Barrio',
  duracaoLiga: 'Duración',
  duracoes: { torneio: '1 torneo (19 días)', temporada: 'Temporada (60 días)' },
  dificuldade: 'Dificultad',
  dificuldades: { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' },
  iniciarLiga: 'Empezar temporada',
  erroNome: 'Usa de 3 a 24 letras en el nombre del club.',
  diaHora: (dia, hora) => `Día ${dia} · ${hora}`,
  torneios: { 0: 'Finales', 1: 'Torneo Apertura', 2: 'Torneo Intermedio', 3: 'Torneo Clausura' },
  competicoes: { liga: 'Liga', copa: 'Copa', prata: 'Copa Plata', taca: 'Copa de Campeones' },
  fases: { pontos: '', quartas: 'Cuartos de final', semifinal: 'Semifinal', terceiro: 'Tercer puesto', final: 'Final' },
  semJogo: 'Tu club no juega en esta fecha.',
  simularDia: 'Simular todo el día',
  verJogo: 'Ver el partido',
  soGols: 'Solo goles',
  decisaoDoDia: 'Decisión del día',
  aceitar: 'Aceptar',
  recusar: 'Ahora no',
  decisoes: {
    folga: () => '¿Dar descanso a la plantilla por 50.000? Todos ganan 15 de energía.',
    amistoso: () => 'Amistoso pagado: recibes 150.000, pero todos pierden 10 de energía.',
    jovem: (jogador) => `¿Entrenamiento extra para ${jogador} por 100.000? Gana 1 punto de fuerza.`,
  },
  motivos: {
    expulsao: 'La expulsión pesó: con uno menos, el equipo perdió fuerza.',
    cansaco: 'El equipo llegó más cansado que el rival. Conviene reservar titulares.',
    meioDominado: 'El dominio del mediocampo decidió el partido.',
    meioPerdido: 'El rival dominó el mediocampo. Intenta reforzar esa zona.',
    faltouPontaria: 'El equipo creó más, pero le faltó puntería.',
    aproveitou: 'El equipo creó menos, pero aprovechó sus ocasiones.',
    equilibrado: 'Partido parejo, decidido en los detalles.',
  },
  avancarData: 'Avanzar',
  saldo: (valor) => `Saldo: ${valor}`,
  temporadaNumero: (n) => `Temporada ${n}`,
  titulosClube: 'Títulos del club',
  novaTemporada: 'Próxima temporada',
  assistente: 'Asistente activado',
  assistenteTexto: 'Reserva a los cansados y cubre las bajas en cada partido. Cambiar un titular lo desactiva.',
  penaltis: (clube) => `${clube} ganó en los penales`,
  energia: (n) => `${n}% de energía`,
  geral: 'General',
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
  rodadasFora: (n) => (n === 1 ? 'Fuera 1 partido' : `Fuera ${n} partidos`),
  classificacao: 'Clasificación',
  rodadas: 'Jornadas',
  colunas: { pontos: 'P', jogos: 'J', vitorias: 'G', saldo: 'DG' },
  data: (dia, hora) => `Día ${dia}, ${hora}`,
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
  narracaoLesao: (jogador, rodadas) => `${jogador} se lesionó y estará fuera ${rodadas} partidos.`,
};

/** Idiomas sem tradução caem no inglês. */
export function textosPara(idioma: string | null): Textos {
  if (idioma === 'pt') return pt;
  if (idioma === 'es') return es;
  return en;
}
