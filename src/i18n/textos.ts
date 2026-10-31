import type { TipoDecisao } from '../dominio/decisoes';
import type { Motivo } from '../dominio/resumo';
import type { Competicao, Dificuldade, DuracaoLiga, Estilo, Fase, Posicao } from '../dominio/tipos';

export type IdiomaApp = 'pt' | 'en' | 'es';

export interface Textos {
  abaClube: string;
  abaElenco: string;
  abaMercado: string;
  abasMercado: { comprar: string; leiloes: string; vender: string };
  saldoLivre: (valor: number) => string;
  elencoTotal: (n: number) => string;
  ofertaDe: (clube: string) => string;
  dadosJogador: (idade: number, potencial: number) => string;
  mercadoAjuda: string;
  semOfertas: string;
  comprarPor: (valor: string) => string;
  confirmarCompra: (jogador: string, valor: string) => string;
  venderAjuda: string;
  venderPor: (valor: string) => string;
  leiloar: string;
  confirmarVenda: (jogador: string, valor: string) => string;
  confirmarLeilao: (jogador: string, valor: string) => string;
  leiloesAjuda: string;
  semLeiloes: string;
  lanceInicial: (valor: string) => string;
  maiorLance: (valor: string, clube: string) => string;
  encerraEm: (jogos: number) => string;
  lanceDe: (valor: string) => string;
  seuLanceLidera: string;
  seuLeilao: string;
  emLeilao: string;
  ultimasNegociacoes: string;
  negociacao: (jogador: string, de: string, para: string, valor: string) => string;
  foraDaLiga: string;
  confirmar: string;
  abaTabela: string;
  novaLigaTitulo: string;
  novaLigaTexto: string;
  nomeClube: string;
  nomeClubeExemplo: string;
  duracaoLiga: string;
  duracoes: Record<DuracaoLiga, string>;
  dificuldade: string;
  dificuldades: Record<Dificuldade, string>;
  erroNome: string;
  diaHora: (dia: number, hora: string) => string;
  torneios: Record<number, string>;
  competicoes: Record<Competicao, string>;
  fases: Record<Fase, string>;
  semJogo: string;
  criarLiga: string;
  loginTitulo: string;
  loginTexto: string;
  entrarGoogle: string;
  loginPrivacidade: string;
  erroLogin: string;
  sair: string;
  sairTitulo: string;
  sairTexto: string;
  cancelar: string;
  semLiga: string;
  entrarTitulo: string;
  entrarTexto: string;
  codigoConvite: string;
  entrarLiga: string;
  erroCodigo: string;
  outraLiga: string;
  voltar: string;
  conviteTitulo: string;
  conviteTexto: (codigo: string) => string;
  compartilhar: string;
  mensagemConvite: (codigo: string) => string;
  tecnicos: (n: number) => string;
  iniciarLiga: string;
  iniciarAviso: string;
  aguardandoDono: string;
  comecaAoMeioDia: string;
  proximoJogoEm: string;
  proximaTemporadaAviso: string;
  erroConexao: string;
  tentarDeNovo: string;
  verJogo: string;
  soGols: string;
  decisaoDoDia: string;
  aceitar: string;
  recusar: string;
  decisoes: Record<TipoDecisao, (jogador: string) => string>;
  motivos: Record<Motivo, string>;
  saldo: (valor: string) => string;
  temporadaNumero: (n: number) => string;
  titulosClube: string;
  assistente: string;
  assistenteTexto: string;
  penaltis: (clube: string) => string;
  energia: (n: number) => string;
  nivelTime: string;
  nivelTimeAjuda: string;
  nivelCurto: (n: number) => string;
  nivelJogador: (n: number) => string;
  geral: string;
  emCasa: string;
  foraDeCasa: string;
  ultimoJogo: string;
  posicaoAtual: (posicao: number, pontos: number) => string;
  desfalques: (n: number) => string;
  temporadaFim: string;
  campeao: (clube: string) => string;
  suaPosicao: (posicao: number) => string;
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
  abaMercado: 'Mercado',
  abasMercado: { comprar: 'Comprar', leiloes: 'Leilões', vender: 'Vender' },
  saldoLivre: (valor) => `Disponível: R$ ${valor.toLocaleString()}`,
  elencoTotal: (n) => `${n} jogadores no elenco`,
  ofertaDe: (clube) => `Vendido por ${clube}`,
  dadosJogador: (idade, potencial) => `${idade} anos · potencial ${potencial}`,
  mercadoAjuda: 'A lista muda todo dia. Cada clube da máquina vende um jogador por dia.',
  semOfertas: 'Nenhum jogador à venda hoje.',
  comprarPor: (valor) => `Comprar por R$ ${valor}`,
  confirmarCompra: (jogador, valor) => `Comprar ${jogador} por R$ ${valor}?`,
  venderAjuda: 'Venda rápida: o jogador deixa a liga. No leilão, os outros técnicos disputam e o valor pode subir.',
  venderPor: (valor) => `Vender por R$ ${valor}`,
  leiloar: 'Leiloar',
  confirmarVenda: (jogador, valor) => `Vender ${jogador} por R$ ${valor}? Ele deixa a liga.`,
  confirmarLeilao: (jogador, valor) => `Leiloar ${jogador} com lance inicial de R$ ${valor}? Não dá para cancelar.`,
  leiloesAjuda: 'Leilões entre técnicos duram 2 dias. Seu maior lance fica reservado até o fim.',
  semLeiloes: 'Nenhum leilão aberto.',
  lanceInicial: (valor) => `Lance inicial: R$ ${valor}`,
  maiorLance: (valor, clube) => `Maior lance: R$ ${valor} (${clube})`,
  encerraEm: (jogos) => `Termina em ${jogos} ${jogos === 1 ? 'jogo' : 'jogos'}`,
  lanceDe: (valor) => `Dar lance de R$ ${valor}`,
  seuLanceLidera: 'Seu lance é o maior',
  seuLeilao: 'Seu jogador',
  emLeilao: 'Em leilão',
  ultimasNegociacoes: 'Últimas negociações',
  negociacao: (jogador, de, para, valor) => `${jogador}: ${de} → ${para} · R$ ${valor}`,
  foraDaLiga: 'fora da liga',
  confirmar: 'Confirmar',
  abaTabela: 'Tabela',
  novaLigaTitulo: 'Monte sua liga',
  novaLigaTexto: 'Dê um nome ao seu clube. As vagas sem amigos ficam com clubes da máquina.',
  nomeClube: 'Nome do clube',
  nomeClubeExemplo: 'Ex.: Unidos da Vila',
  duracaoLiga: 'Duração',
  duracoes: { torneio: '1 torneio (19 dias)', temporada: 'Temporada (60 dias)' },
  dificuldade: 'Dificuldade',
  dificuldades: { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' },
  erroNome: 'Use de 3 a 24 letras no nome do clube.',
  diaHora: (dia, hora) => `Dia ${dia} · ${hora}`,
  torneios: { 0: 'Finais', 1: 'Torneio de Abertura', 2: 'Torneio Intermediário', 3: 'Torneio de Encerramento' },
  competicoes: { liga: 'Liga', copa: 'Copa', prata: 'Copa Prata', taca: 'Taça dos Campeões' },
  fases: { pontos: '', quartas: 'Quartas de final', semifinal: 'Semifinal', terceiro: 'Terceiro lugar', final: 'Final' },
  semJogo: 'Seu clube não joga nesta data.',
  criarLiga: 'Criar liga',
  loginTitulo: 'Monte seu time e dispute a liga',
  loginTexto: 'Entre para jogar com seus amigos e levar seu clube para qualquer celular.',
  entrarGoogle: 'Entrar com o Google',
  loginPrivacidade: 'Guardamos só o seu nome e um identificador da conta Google.',
  erroLogin: 'Não foi possível entrar. Tente de novo.',
  sair: 'Sair da conta',
  sairTitulo: 'Sair da conta?',
  sairTexto: 'Seu clube continua salvo. É só entrar de novo com o Google.',
  cancelar: 'Cancelar',
  semLiga: 'Crie uma liga ou entre com um convite na aba Clube.',
  entrarTitulo: 'Tem um convite?',
  entrarTexto: 'Digite o código que seu amigo enviou. Você assume um clube da liga.',
  codigoConvite: 'Código do convite',
  entrarLiga: 'Entrar na liga',
  erroCodigo: 'Digite o código de 6 letras.',
  outraLiga: 'Criar ou entrar em outra liga',
  voltar: 'Voltar',
  conviteTitulo: 'Convide seus amigos',
  conviteTexto: (codigo) => `Código da liga: ${codigo}. Cada amigo assume um clube da máquina.`,
  compartilhar: 'Enviar convite',
  mensagemConvite: (codigo) => `Entra na minha liga no Prancheta FC! Código: ${codigo}`,
  tecnicos: (n) => (n === 1 ? '1 técnico na liga' : `${n} técnicos na liga`),
  iniciarLiga: 'Iniciar a liga',
  iniciarAviso: 'A primeira rodada será ao meio-dia. Amigos ainda podem entrar depois.',
  aguardandoDono: 'Aguardando quem criou a liga dar o início.',
  comecaAoMeioDia: 'A liga começa no próximo meio-dia. Ajuste seu time até lá.',
  proximoJogoEm: 'Os jogos acontecem sozinhos às 12h, 18h e 21h.',
  proximaTemporadaAviso: 'A próxima temporada começa no próximo meio-dia.',
  erroConexao: 'Não foi possível falar com o servidor. Confira sua internet.',
  tentarDeNovo: 'Tentar de novo',
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
  saldo: (valor) => `Saldo: R$ ${valor}`,
  temporadaNumero: (n) => `Temporada ${n}`,
  titulosClube: 'Títulos do clube',
  assistente: 'Assistente ligado',
  assistenteTexto: 'Ele poupa cansados e repõe desfalques a cada jogo. Trocar um titular desliga o assistente.',
  penaltis: (clube) => `${clube} venceu nos pênaltis`,
  energia: (n) => `${n}% de energia`,
  nivelTime: 'Nível do time',
  nivelTimeAjuda: 'De 30 a 100: média dos titulares do próximo jogo. Jogador fora de posição conta menos.',
  nivelCurto: (n) => `Nível ${n}`,
  nivelJogador: (n) => `Nível ${n} de 100`,
  geral: 'Geral',
  emCasa: 'Em casa',
  foraDeCasa: 'Fora de casa',
  ultimoJogo: 'Último jogo',
  posicaoAtual: (posicao, pontos) => `${posicao}º lugar · ${pontos} pts`,
  desfalques: (n) => (n === 1 ? '1 titular fora: o reserva entra sozinho.' : `${n} titulares fora: os reservas entram sozinhos.`),
  temporadaFim: 'Fim da temporada',
  campeao: (clube) => `${clube} é o campeão!`,
  suaPosicao: (posicao) => `Seu clube terminou em ${posicao}º lugar.`,
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
  abaMercado: 'Market',
  abasMercado: { comprar: 'Buy', leiloes: 'Auctions', vender: 'Sell' },
  saldoLivre: (valor) => `Available: R$ ${valor.toLocaleString()}`,
  elencoTotal: (n) => `${n} players in the squad`,
  ofertaDe: (clube) => `Sold by ${clube}`,
  dadosJogador: (idade, potencial) => `${idade} years · potential ${potencial}`,
  mercadoAjuda: 'The list changes every day. Each computer club sells one player a day.',
  semOfertas: 'No players for sale today.',
  comprarPor: (valor) => `Buy for R$ ${valor}`,
  confirmarCompra: (jogador, valor) => `Buy ${jogador} for R$ ${valor}?`,
  venderAjuda: 'Quick sale: the player leaves the league. In an auction, other managers bid and the price can rise.',
  venderPor: (valor) => `Sell for R$ ${valor}`,
  leiloar: 'Auction',
  confirmarVenda: (jogador, valor) => `Sell ${jogador} for R$ ${valor}? The player leaves the league.`,
  confirmarLeilao: (jogador, valor) => `Auction ${jogador} with a starting bid of R$ ${valor}? This cannot be cancelled.`,
  leiloesAjuda: 'Auctions between managers last 2 days. Your highest bid stays reserved until the end.',
  semLeiloes: 'No open auctions.',
  lanceInicial: (valor) => `Starting bid: R$ ${valor}`,
  maiorLance: (valor, clube) => `Highest bid: R$ ${valor} (${clube})`,
  encerraEm: (jogos) => `Ends in ${jogos} ${jogos === 1 ? 'match' : 'matches'}`,
  lanceDe: (valor) => `Bid R$ ${valor}`,
  seuLanceLidera: 'Your bid is the highest',
  seuLeilao: 'Your player',
  emLeilao: 'In auction',
  ultimasNegociacoes: 'Latest deals',
  negociacao: (jogador, de, para, valor) => `${jogador}: ${de} → ${para} · R$ ${valor}`,
  foraDaLiga: 'out of the league',
  confirmar: 'Confirm',
  abaTabela: 'Table',
  novaLigaTitulo: 'Set up your league',
  novaLigaTexto: 'Name your club. Places without friends go to computer clubs.',
  nomeClube: 'Club name',
  nomeClubeExemplo: 'E.g. Riverside United',
  duracaoLiga: 'Length',
  duracoes: { torneio: '1 tournament (19 days)', temporada: 'Season (60 days)' },
  dificuldade: 'Difficulty',
  dificuldades: { facil: 'Easy', normal: 'Normal', dificil: 'Hard' },
  erroNome: 'Use 3 to 24 characters for the club name.',
  diaHora: (dia, hora) => `Day ${dia} · ${hora}`,
  torneios: { 0: 'Finals', 1: 'Opening Tournament', 2: 'Middle Tournament', 3: 'Closing Tournament' },
  competicoes: { liga: 'League', copa: 'Cup', prata: 'Silver Cup', taca: 'Champions Trophy' },
  fases: { pontos: '', quartas: 'Quarter-final', semifinal: 'Semi-final', terceiro: 'Third place', final: 'Final' },
  semJogo: 'Your club has no match on this date.',
  criarLiga: 'Create league',
  loginTitulo: 'Build your team and fight for the league',
  loginTexto: 'Sign in to play with friends and take your club to any phone.',
  entrarGoogle: 'Sign in with Google',
  loginPrivacidade: 'We only keep your name and a Google account identifier.',
  erroLogin: 'Could not sign in. Please try again.',
  sair: 'Sign out',
  sairTitulo: 'Sign out?',
  sairTexto: 'Your club stays saved. Just sign in with Google again.',
  cancelar: 'Cancel',
  semLiga: 'Create a league or use an invite in the Club tab.',
  entrarTitulo: 'Got an invite?',
  entrarTexto: 'Enter the code your friend sent. You will take over a club in the league.',
  codigoConvite: 'Invite code',
  entrarLiga: 'Join league',
  erroCodigo: 'Enter the 6-letter code.',
  outraLiga: 'Create or join another league',
  voltar: 'Back',
  conviteTitulo: 'Invite your friends',
  conviteTexto: (codigo) => `League code: ${codigo}. Each friend takes over a computer club.`,
  compartilhar: 'Send invite',
  mensagemConvite: (codigo) => `Join my league on Prancheta FC! Code: ${codigo}`,
  tecnicos: (n) => (n === 1 ? '1 manager in the league' : `${n} managers in the league`),
  iniciarLiga: 'Start the league',
  iniciarAviso: 'The first round is at noon. Friends can still join afterwards.',
  aguardandoDono: 'Waiting for the league creator to start it.',
  comecaAoMeioDia: 'The league starts next noon. Get your team ready.',
  proximoJogoEm: 'Matches play automatically at 12h, 18h and 21h.',
  proximaTemporadaAviso: 'The next season starts next noon.',
  erroConexao: 'Could not reach the server. Check your internet.',
  tentarDeNovo: 'Try again',
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
  saldo: (valor) => `Balance: ${valor}`,
  temporadaNumero: (n) => `Season ${n}`,
  titulosClube: 'Club honours',
  assistente: 'Assistant on',
  assistenteTexto: 'Rests tired players and covers absences every match. Swapping a starter turns it off.',
  penaltis: (clube) => `${clube} won on penalties`,
  energia: (n) => `${n}% energy`,
  nivelTime: 'Team level',
  nivelTimeAjuda: 'From 30 to 100: average of the next match starters. Players out of position count for less.',
  nivelCurto: (n) => `Level ${n}`,
  nivelJogador: (n) => `Level ${n} of 100`,
  geral: 'Overall',
  emCasa: 'Home',
  foraDeCasa: 'Away',
  ultimoJogo: 'Last match',
  posicaoAtual: (posicao, pontos) => `Position ${posicao} · ${pontos} pts`,
  desfalques: (n) => (n === 1 ? '1 starter out: a substitute steps in automatically.' : `${n} starters out: substitutes step in automatically.`),
  temporadaFim: 'End of season',
  campeao: (clube) => `${clube} are the champions!`,
  suaPosicao: (posicao) => `Your club finished in position ${posicao}.`,
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
  abaMercado: 'Mercado',
  abasMercado: { comprar: 'Comprar', leiloes: 'Subastas', vender: 'Vender' },
  saldoLivre: (valor) => `Disponible: R$ ${valor.toLocaleString()}`,
  elencoTotal: (n) => `${n} jugadores en la plantilla`,
  ofertaDe: (clube) => `Lo vende ${clube}`,
  dadosJogador: (idade, potencial) => `${idade} años · potencial ${potencial}`,
  mercadoAjuda: 'La lista cambia cada día. Cada club de la máquina vende un jugador por día.',
  semOfertas: 'Ningún jugador a la venta hoy.',
  comprarPor: (valor) => `Comprar por R$ ${valor}`,
  confirmarCompra: (jogador, valor) => `¿Comprar a ${jogador} por R$ ${valor}?`,
  venderAjuda: 'Venta rápida: el jugador deja la liga. En una subasta, los otros técnicos pujan y el valor puede subir.',
  venderPor: (valor) => `Vender por R$ ${valor}`,
  leiloar: 'Subastar',
  confirmarVenda: (jogador, valor) => `¿Vender a ${jogador} por R$ ${valor}? Deja la liga.`,
  confirmarLeilao: (jogador, valor) => `¿Subastar a ${jogador} con puja inicial de R$ ${valor}? No se puede cancelar.`,
  leiloesAjuda: 'Las subastas entre técnicos duran 2 días. Tu mayor puja queda reservada hasta el final.',
  semLeiloes: 'Ninguna subasta abierta.',
  lanceInicial: (valor) => `Puja inicial: R$ ${valor}`,
  maiorLance: (valor, clube) => `Mayor puja: R$ ${valor} (${clube})`,
  encerraEm: (jogos) => `Termina en ${jogos} ${jogos === 1 ? 'partido' : 'partidos'}`,
  lanceDe: (valor) => `Pujar R$ ${valor}`,
  seuLanceLidera: 'Tu puja es la mayor',
  seuLeilao: 'Tu jugador',
  emLeilao: 'En subasta',
  ultimasNegociacoes: 'Últimas operaciones',
  negociacao: (jogador, de, para, valor) => `${jogador}: ${de} → ${para} · R$ ${valor}`,
  foraDaLiga: 'fuera de la liga',
  confirmar: 'Confirmar',
  abaTabela: 'Tabla',
  novaLigaTitulo: 'Arma tu liga',
  novaLigaTexto: 'Ponle nombre a tu club. Las plazas sin amigos son para clubes de la máquina.',
  nomeClube: 'Nombre del club',
  nomeClubeExemplo: 'Ej.: Unidos del Barrio',
  duracaoLiga: 'Duración',
  duracoes: { torneio: '1 torneo (19 días)', temporada: 'Temporada (60 días)' },
  dificuldade: 'Dificultad',
  dificuldades: { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' },
  erroNome: 'Usa de 3 a 24 letras en el nombre del club.',
  diaHora: (dia, hora) => `Día ${dia} · ${hora}`,
  torneios: { 0: 'Finales', 1: 'Torneo Apertura', 2: 'Torneo Intermedio', 3: 'Torneo Clausura' },
  competicoes: { liga: 'Liga', copa: 'Copa', prata: 'Copa Plata', taca: 'Copa de Campeones' },
  fases: { pontos: '', quartas: 'Cuartos de final', semifinal: 'Semifinal', terceiro: 'Tercer puesto', final: 'Final' },
  semJogo: 'Tu club no juega en esta fecha.',
  criarLiga: 'Crear liga',
  loginTitulo: 'Arma tu equipo y pelea por la liga',
  loginTexto: 'Entra para jugar con tus amigos y llevar tu club a cualquier celular.',
  entrarGoogle: 'Entrar con Google',
  loginPrivacidade: 'Solo guardamos tu nombre y un identificador de la cuenta de Google.',
  erroLogin: 'No se pudo entrar. Inténtalo de nuevo.',
  sair: 'Cerrar sesión',
  sairTitulo: '¿Cerrar sesión?',
  sairTexto: 'Tu club sigue guardado. Solo vuelve a entrar con Google.',
  cancelar: 'Cancelar',
  semLiga: 'Crea una liga o entra con una invitación en la pestaña Club.',
  entrarTitulo: '¿Tienes una invitación?',
  entrarTexto: 'Escribe el código que te envió tu amigo. Asumirás un club de la liga.',
  codigoConvite: 'Código de invitación',
  entrarLiga: 'Entrar a la liga',
  erroCodigo: 'Escribe el código de 6 letras.',
  outraLiga: 'Crear o entrar a otra liga',
  voltar: 'Volver',
  conviteTitulo: 'Invita a tus amigos',
  conviteTexto: (codigo) => `Código de la liga: ${codigo}. Cada amigo asume un club de la máquina.`,
  compartilhar: 'Enviar invitación',
  mensagemConvite: (codigo) => `¡Entra a mi liga en Prancheta FC! Código: ${codigo}`,
  tecnicos: (n) => (n === 1 ? '1 entrenador en la liga' : `${n} entrenadores en la liga`),
  iniciarLiga: 'Iniciar la liga',
  iniciarAviso: 'La primera jornada será al mediodía. Los amigos aún pueden entrar después.',
  aguardandoDono: 'Esperando a que quien creó la liga la inicie.',
  comecaAoMeioDia: 'La liga empieza el próximo mediodía. Prepara tu equipo.',
  proximoJogoEm: 'Los partidos se juegan solos a las 12h, 18h y 21h.',
  proximaTemporadaAviso: 'La próxima temporada empieza el próximo mediodía.',
  erroConexao: 'No se pudo conectar con el servidor. Revisa tu internet.',
  tentarDeNovo: 'Intentar de nuevo',
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
  saldo: (valor) => `Saldo: ${valor}`,
  temporadaNumero: (n) => `Temporada ${n}`,
  titulosClube: 'Títulos del club',
  assistente: 'Asistente activado',
  assistenteTexto: 'Reserva a los cansados y cubre las bajas en cada partido. Cambiar un titular lo desactiva.',
  penaltis: (clube) => `${clube} ganó en los penales`,
  energia: (n) => `${n}% de energía`,
  nivelTime: 'Nivel del equipo',
  nivelTimeAjuda: 'De 30 a 100: promedio de los titulares del próximo partido. Un jugador fuera de posición cuenta menos.',
  nivelCurto: (n) => `Nivel ${n}`,
  nivelJogador: (n) => `Nivel ${n} de 100`,
  geral: 'General',
  emCasa: 'En casa',
  foraDeCasa: 'Fuera de casa',
  ultimoJogo: 'Último partido',
  posicaoAtual: (posicao, pontos) => `Puesto ${posicao} · ${pontos} pts`,
  desfalques: (n) => (n === 1 ? '1 titular fuera: el suplente entra solo.' : `${n} titulares fuera: los suplentes entran solos.`),
  temporadaFim: 'Fin de la temporada',
  campeao: (clube) => `¡${clube} es el campeón!`,
  suaPosicao: (posicao) => `Tu club terminó en el puesto ${posicao}.`,
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
