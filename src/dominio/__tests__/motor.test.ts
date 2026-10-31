/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { gerarCalendario } from '../calendario.ts';
import { escalacaoParaJogo, melhorEscalacao, trocarTitular, vagasDaFormacao } from '../escalacao.ts';
import { gerarSigla } from '../geracao.ts';
import { calcularTabela, criarLiga, jogarRodada, tabelaDaLiga, temporadaEncerrada } from '../liga.ts';
import { montarEquipe, simularPartida } from '../simulacao.ts';
import type { Clube, Liga, Partida } from '../tipos.ts';

const nova = (tamanho = 10, semente = 7): Liga =>
  criarLiga('l', { nomeClube: 'Teste FC', donoId: 'eu', tamanho, dificuldade: 'normal', semente });

const comForca = (clube: Clube, forca: number): Clube => ({
  ...clube,
  elenco: clube.elenco.map((j) => ({ ...j, forca })),
});

describe('calendário', () => {
  it('cada clube enfrenta cada adversário uma vez em casa e uma fora', () => {
    const partidas = gerarCalendario([0, 1, 2, 3, 4, 5]);
    assert.equal(partidas.length, 30);
    const confrontos = new Set(partidas.map((p) => `${p.casaId}-${p.foraId}`));
    assert.equal(confrontos.size, 30);
  });

  it('ninguém joga duas vezes na mesma rodada', () => {
    const partidas = gerarCalendario([0, 1, 2, 3, 4, 5, 6, 7]);
    for (let r = 1; r <= 14; r++) {
      const ids = partidas.filter((p) => p.rodada === r).flatMap((p) => [p.casaId, p.foraId]);
      assert.equal(ids.length, 8);
      assert.equal(new Set(ids).size, 8);
    }
  });

  it('recusa número ímpar de clubes', () => {
    assert.throws(() => gerarCalendario([1, 2, 3]));
  });
});

describe('criação da liga', () => {
  it('completa as vagas com clubes da máquina', () => {
    const liga = nova(16);
    assert.equal(liga.clubes.length, 16);
    assert.equal(liga.clubes.filter((c) => c.donoId === null).length, 15);
    assert.equal(liga.totalRodadas, 30);
  });

  it('não repete nomes de clubes nem ids de jogadores', () => {
    const liga = nova(20);
    assert.equal(new Set(liga.clubes.map((c) => c.nome)).size, 20);
    const ids = liga.clubes.flatMap((c) => c.elenco.map((j) => j.id));
    assert.equal(new Set(ids).size, ids.length);
  });

  it('gera sigla de três letras', () => {
    assert.equal(gerarSigla('Teste FC').length, 3);
    assert.equal(gerarSigla('Clube Atlético da Vila'), 'CAV');
  });
});

describe('escalação', () => {
  it('escala 11 jogadores nas vagas da formação', () => {
    const [clube] = nova().clubes;
    for (const formacao of ['4-4-2', '4-3-3', '3-5-2', '5-4-1'] as const) {
      const { titulares } = melhorEscalacao(clube, formacao, 'equilibrado');
      assert.equal(titulares.length, 11);
      assert.equal(new Set(titulares.map((t) => t.jogadorId)).size, 11);
      assert.deepEqual(titulares.map((t) => t.posicao).sort(), vagasDaFormacao(formacao).sort());
    }
  });

  it('repõe titular lesionado mantendo os demais', () => {
    const [clube] = nova().clubes;
    const escalacao = melhorEscalacao(clube, '4-4-2', 'equilibrado');
    const fora = escalacao.titulares[3];
    const jogo = escalacaoParaJogo({
      ...clube,
      escalacao,
      elenco: clube.elenco.map((j) => (j.id === fora.jogadorId ? { ...j, rodadasFora: 2 } : j)),
    });
    assert.equal(jogo.titulares.length, 11);
    assert.ok(!jogo.titulares.some((t) => t.jogadorId === fora.jogadorId));
    assert.equal(jogo.titulares.filter((t) => t.posicao === fora.posicao).length,
      escalacao.titulares.filter((t) => t.posicao === fora.posicao).length);
  });

  it('usa jogador de outra posição quando não há goleiro apto', () => {
    const [clube] = nova().clubes;
    const semGoleiro = { ...clube, elenco: clube.elenco.map((j) => (j.posicao === 'GOL' ? { ...j, rodadasFora: 1 } : j)) };
    const { titulares } = escalacaoParaJogo(semGoleiro);
    assert.equal(titulares.length, 11);
    assert.equal(titulares.filter((t) => t.posicao === 'GOL').length, 1);
  });

  it('troca o titular pelo reserva na mesma vaga', () => {
    const [clube] = nova().clubes;
    const escalacao = melhorEscalacao(clube, '4-4-2', 'equilibrado');
    const sai = escalacao.titulares[1];
    const trocada = trocarTitular(escalacao, sai.jogadorId, 999);
    assert.deepEqual(trocada.titulares[1], { jogadorId: 999, posicao: sai.posicao });
  });
});

describe('simulação', () => {
  const [a, b] = nova().clubes;
  const partida = (x: Clube, y: Clube, semente: number) => simularPartida(
    montarEquipe(x, melhorEscalacao(x, '4-4-2', 'equilibrado')),
    montarEquipe(y, melhorEscalacao(y, '4-4-2', 'equilibrado')),
    semente,
  );

  it('a mesma semente repete a partida', () => {
    assert.deepEqual(partida(a, b, 42), partida(a, b, 42));
  });

  it('o placar bate com os gols narrados', () => {
    for (let s = 0; s < 50; s++) {
      const r = partida(a, b, s);
      const gols = r.eventos.filter((e) => e.tipo === 'gol');
      assert.equal(gols.filter((e) => e.clubeId === a.id).length, r.golsCasa);
      assert.equal(gols.filter((e) => e.clubeId === b.id).length, r.golsFora);
    }
  });

  it('elenco bem mais forte vence a maioria, mas não todas', () => {
    let vitorias = 0;
    const jogos = 400;
    for (let s = 0; s < jogos; s++) {
      const r = partida(comForca(a, 68), comForca(b, 52), s);
      if (r.golsCasa > r.golsFora) vitorias += 1;
    }
    assert.ok(vitorias / jogos > 0.6, `venceu ${vitorias}`);
    assert.ok(vitorias / jogos < 0.97, `venceu ${vitorias}`);
  });

  it('média de gols fica em faixa realista', () => {
    let gols = 0;
    const jogos = 500;
    for (let s = 0; s < jogos; s++) {
      const r = partida(comForca(a, 60), comForca(b, 60), s);
      gols += r.golsCasa + r.golsFora;
    }
    const media = gols / jogos;
    assert.ok(media > 2 && media < 3.3, `média ${media}`);
  });
});

describe('temporada', () => {
  it('joga todas as rodadas e fecha a tabela', () => {
    let liga = nova();
    while (!temporadaEncerrada(liga)) liga = jogarRodada(liga);
    assert.ok(liga.partidas.every((p) => p.resultado));
    const tabela = tabelaDaLiga(liga);
    assert.ok(tabela.every((l) => l.jogos === 18));
    assert.equal(tabela.reduce((s, l) => s + l.golsPro, 0), tabela.reduce((s, l) => s + l.golsContra, 0));
  });

  it('jogarRodada não altera a liga original e é determinístico', () => {
    const liga = nova();
    const antes = JSON.stringify(liga);
    const x = jogarRodada(liga);
    assert.equal(JSON.stringify(liga), antes);
    assert.deepEqual(x, jogarRodada(liga));
  });

  it('expulso ou lesionado perde as rodadas seguintes e depois volta', () => {
    let liga = nova(20);
    while (!temporadaEncerrada(liga)) {
      const anterior = liga;
      liga = jogarRodada(liga);
      const rodada = anterior.rodadaAtual;
      const foraAntes = new Set(anterior.clubes.flatMap((c) => c.elenco.filter((j) => j.rodadasFora > 0).map((j) => j.id)));
      for (const partida of liga.partidas.filter((p) => p.rodada === rodada)) {
        for (const e of partida.resultado!.eventos) assert.ok(!foraAntes.has(e.jogadorId), 'jogador fora entrou em campo');
      }
      const negativos = liga.clubes.flatMap((c) => c.elenco).filter((j) => j.rodadasFora < 0);
      assert.equal(negativos.length, 0);
    }
  });

  it('não simula depois do fim', () => {
    let liga = nova();
    while (!temporadaEncerrada(liga)) liga = jogarRodada(liga);
    assert.equal(jogarRodada(liga), liga);
  });

  it('desempata por vitórias e depois por saldo', () => {
    const r = (golsCasa: number, golsFora: number) => ({ golsCasa, golsFora, posseCasa: 50, chancesCasa: 0, chancesFora: 0, eventos: [] });
    const p = (casaId: number, foraId: number, g1: number, g2: number): Partida => ({ id: 1, rodada: 1, casaId, foraId, resultado: r(g1, g2) });
    const tabela = calcularTabela([1, 2, 3], [p(1, 3, 1, 0), p(2, 3, 5, 0)]);
    assert.deepEqual(tabela.map((l) => l.clubeId), [2, 1, 3]);
  });
});
