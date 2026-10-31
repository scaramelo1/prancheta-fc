// Roda várias temporadas e mostra se os números do motor parecem futebol: `npm run calibrar`.
import { criarLiga, jogarRodada, tabelaDaCompeticao, temporadaEncerrada } from '../src/dominio/liga.ts';
import { LISTA_FORMACOES, melhorEscalacao } from '../src/dominio/escalacao.ts';
import type { Dificuldade, Liga } from '../src/dominio/tipos.ts';

const TORNEIOS = 12;

function jogar(semente: number, dificuldade: Dificuldade, ajustar?: (l: Liga) => void) {
  let liga = criarLiga('t', { nomeClube: 'Teste FC', donoId: 'eu', dificuldade, duracao: 'torneio', semente });
  ajustar?.(liga);
  while (!temporadaEncerrada(liga)) liga = jogarRodada(liga);
  return liga;
}

let jogos = 0, gols = 0, casa = 0, empate = 0, fora = 0, amarelos = 0, vermelhos = 0, lesoes = 0, desfalques = 0, energia = 0;
for (let s = 1; s <= TORNEIOS; s++) {
  const liga = jogar(s, 'normal');
  const elencos = liga.clubes.flatMap((c) => c.elenco);
  desfalques += elencos.filter((j) => j.rodadasFora > 0).length / 20;
  energia += elencos.reduce((soma, j) => soma + j.energia, 0) / elencos.length;
  for (const { resultado, casaId, foraId } of liga.partidas) {
    const r = resultado!;
    jogos++;
    gols += r.golsCasa + r.golsFora;
    if (r.golsCasa > r.golsFora) casa++; else if (r.golsCasa === r.golsFora) empate++; else fora++;
    for (const e of r.eventos) {
      if (e.tipo === 'amarelo' && (casaId === 0 || foraId === 0)) amarelos++;
      if (e.tipo === 'vermelho') vermelhos++;
      if (e.tipo === 'lesao') lesoes++;
    }
  }
}
const pct = (n: number) => `${((n / jogos) * 100).toFixed(1)}%`;
console.log(`Jogos ${jogos} | gols/jogo ${(gols / jogos).toFixed(2)} | casa ${pct(casa)} | empate ${pct(empate)} | fora ${pct(fora)}`);
console.log(`Por jogo: vermelhos ${(vermelhos / jogos).toFixed(2)}, lesões ${(lesoes / jogos).toFixed(2)} | desfalques por clube ${(desfalques / TORNEIOS).toFixed(1)} | energia média ${(energia / TORNEIOS).toFixed(0)}`);

for (const dificuldade of ['facil', 'normal', 'dificil'] as const) {
  let posicao = 0, titulos = 0, lider = 0;
  for (let s = 1; s <= TORNEIOS; s++) {
    const tabela = tabelaDaCompeticao(jogar(s, dificuldade), 'liga', 1);
    posicao += tabela.findIndex((l) => l.clubeId === 0) + 1;
    if (tabela[0].clubeId === 0) titulos++;
    lider += tabela[0].pontos;
  }
  console.log(`${dificuldade}: média ${(posicao / TORNEIOS).toFixed(1)}º, títulos ${titulos}/${TORNEIOS}, líder ${(lider / TORNEIOS).toFixed(0)} pts de 114`);
}

for (const formacao of LISTA_FORMACOES) {
  let soma = 0;
  for (let s = 1; s <= TORNEIOS; s++) {
    const liga = jogar(s, 'normal', (l) => { l.clubes[0].escalacao = melhorEscalacao(l.clubes[0], formacao, 'equilibrado'); });
    soma += tabelaDaCompeticao(liga, 'liga', 1).find((l) => l.clubeId === 0)!.pontos;
  }
  console.log(`Formação ${formacao}: ${(soma / TORNEIOS).toFixed(1)} pts`);
}
