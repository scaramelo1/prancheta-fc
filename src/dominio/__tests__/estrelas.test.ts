/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { criarRng } from '../aleatorio.ts';
import { aplicarDecisao, decisaoDoDia } from '../decisoes.ts';
import { estrelasDe, raridadeDe, sortearPotencial } from '../estrelas.ts';
import { evoluirClubes } from '../evolucao.ts';
import { criarLiga } from '../liga.ts';
import type { Liga } from '../tipos.ts';

const nova = (semente = 7): Liga =>
  criarLiga('l', { nomeClube: 'Teste FC', donoId: 'eu', dificuldade: 'normal', duracao: 'torneio', semente });

describe('estrelas', () => {
  it('seguem a tabela de 1 a 5, de meia em meia', () => {
    assert.deepEqual(
      [45, 46, 55, 56, 72, 73, 88, 89, 95, 100].map(estrelasDe),
      [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5],
    );
    assert.deepEqual(
      [55, 56, 72, 73, 88, 89].map(raridadeDe),
      ['normal', 'intermediario', 'intermediario', 'raro', 'raro', 'lendario'],
    );
  });

  it('o sorteio respeita as chances da tabela', () => {
    const rng = criarRng(1);
    const total = 100_000;
    const contagem = { normal: 0, intermediario: 0, raro: 0, lendario: 0 };
    for (let i = 0; i < total; i++) contagem[raridadeDe(sortearPotencial(rng, 35))] += 1;
    const perto = (n: number, alvo: number, margem: number) => Math.abs((n / total) * 100 - alvo) < margem;
    assert.ok(perto(contagem.normal, 70, 1));
    assert.ok(perto(contagem.intermediario, 23, 1));
    assert.ok(perto(contagem.raro, 6.5, 0.5));
    assert.ok(perto(contagem.lendario, 0.5, 0.2));
  });

  it('não mudam com a evolução, e o lendário cresce rápido até o auge', () => {
    const liga = nova();
    Object.assign(liga.clubes[0].elenco[0], { idade: 17, forca: 36, potencial: 97 });
    const potencial = 97;
    const niveis = [36];
    let atual = liga;
    for (let i = 0; i < 9; i++) {
      atual = { ...atual, temporada: atual.temporada + 1, clubes: evoluirClubes(atual) };
      const { forca, potencial: p } = atual.clubes[0].elenco[0];
      assert.equal(p, potencial);
      assert.ok(forca > niveis[niveis.length - 1]);
      niveis.push(forca);
    }
    assert.ok(niveis[niveis.length - 1] >= 90, String(niveis));
  });

  it('o nível nunca passa do potencial', () => {
    let liga = nova();
    for (let i = 0; i < 30; i++) {
      liga = { ...liga, temporada: liga.temporada + 1, clubes: evoluirClubes(liga) };
      assert.ok(liga.clubes.every((c) => c.elenco.every((j) => j.forca <= j.potencial && j.forca >= 30)));
    }
  });
});

describe('peneira', () => {
  function comPeneira() {
    for (let semente = 1; semente < 500; semente++) {
      const liga = nova(semente);
      const decisao = decisaoDoDia(liga, liga.clubes[0]);
      if (decisao?.tipo === 'peneira') return { liga, decisao };
    }
    throw new Error('Nenhuma peneira encontrada');
  }

  it('mostra o jovem e o preço antes, e entrega exatamente o que mostrou', () => {
    const { liga, decisao } = comPeneira();
    assert.ok(decisao.prospecto && decisao.custo);
    assert.deepEqual(decisaoDoDia(liga, liga.clubes[0]), decisao);
    const depois = aplicarDecisao(liga, 0, decisao, true);
    const clube = depois.clubes[0];
    assert.equal(clube.saldo, liga.clubes[0].saldo - decisao.custo);
    assert.equal(clube.elenco.length, 23);
    const novo = clube.elenco[22];
    assert.equal(novo.potencial, decisao.prospecto.potencial);
    const ids = depois.clubes.flatMap((c) => c.elenco.map((j) => j.id));
    assert.equal(new Set(ids).size, ids.length);
  });

  it('recusar não custa nada', () => {
    const { liga, decisao } = comPeneira();
    const clube = aplicarDecisao(liga, 0, decisao, false).clubes[0];
    assert.equal(clube.saldo, liga.clubes[0].saldo);
    assert.equal(clube.elenco.length, 22);
  });

  it('sem dinheiro vira outra decisão', () => {
    const { liga } = comPeneira();
    liga.clubes[0].saldo = 0;
    assert.equal(decisaoDoDia(liga, liga.clubes[0])?.tipo, 'amistoso');
  });
});
