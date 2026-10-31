// Roda muitas temporadas e mostra se os números do motor parecem futebol: `npm run calibrar`.
import { criarLiga, jogarRodada, tabelaDaLiga, temporadaEncerrada } from '../src/dominio/liga.ts';
import { melhorEscalacao, LISTA_FORMACOES } from '../src/dominio/escalacao.ts';
import type { Dificuldade, Liga } from '../src/dominio/tipos.ts';

const TEMPORADAS = 30;

function temporada(semente: number, dificuldade: Dificuldade, ajustar?: (l: Liga) => void) {
  let liga = criarLiga('t', { nomeClube: 'Teste FC', donoId: 'eu', tamanho: 16, dificuldade, semente });
  ajustar?.(liga);
  while (!temporadaEncerrada(liga)) liga = jogarRodada(liga);
  return liga;
}

let jogos = 0, gols = 0, casa = 0, empate = 0, fora = 0, zeroZero = 0, goleada = 0, amarelos = 0, vermelhos = 0, lesoes = 0;
for (let s = 1; s <= TEMPORADAS; s++) {
  for (const { resultado } of temporada(s, 'normal').partidas) {
    const r = resultado!;
    jogos++;
    gols += r.golsCasa + r.golsFora;
    if (r.golsCasa > r.golsFora) casa++; else if (r.golsCasa === r.golsFora) empate++; else fora++;
    if (r.golsCasa + r.golsFora === 0) zeroZero++;
    if (Math.abs(r.golsCasa - r.golsFora) >= 4) goleada++;
    for (const e of r.eventos) {
      if (e.tipo === 'amarelo') amarelos++;
      if (e.tipo === 'vermelho') vermelhos++;
      if (e.tipo === 'lesao') lesoes++;
    }
  }
}
const pct = (n: number) => `${((n / jogos) * 100).toFixed(1)}%`;
console.log(`Jogos ${jogos} | gols/jogo ${(gols / jogos).toFixed(2)}`);
console.log(`Casa ${pct(casa)} | empate ${pct(empate)} | fora ${pct(fora)} | 0x0 ${pct(zeroZero)} | diferença 4+ ${pct(goleada)}`);
console.log(`Por jogo: amarelos ${(amarelos / jogos).toFixed(2)}, vermelhos ${(vermelhos / jogos).toFixed(2)}, lesões ${(lesoes / jogos).toFixed(2)}`);

for (const dificuldade of ['facil', 'normal', 'dificil'] as const) {
  let soma = 0, titulos = 0, pontosLider = 0;
  for (let s = 1; s <= TEMPORADAS; s++) {
    const tabela = tabelaDaLiga(temporada(s, dificuldade));
    soma += tabela.findIndex((l) => l.clubeId === 0) + 1;
    if (tabela[0].clubeId === 0) titulos++;
    pontosLider += tabela[0].pontos;
  }
  console.log(`${dificuldade}: humano parado termina em média ${(soma / TEMPORADAS).toFixed(1)}º, títulos ${titulos}/${TEMPORADAS}, líder ${(pontosLider / TEMPORADAS).toFixed(0)} pts`);
}

for (const formacao of LISTA_FORMACOES) {
  let soma = 0;
  for (let s = 1; s <= TEMPORADAS; s++) {
    const liga = temporada(s, 'normal', (l) => { l.clubes[0].escalacao = melhorEscalacao(l.clubes[0], formacao, 'equilibrado'); });
    soma += tabelaDaLiga(liga).find((l) => l.clubeId === 0)!.pontos;
  }
  console.log(`Formação ${formacao}: ${(soma / TEMPORADAS).toFixed(1)} pts em média`);
}
