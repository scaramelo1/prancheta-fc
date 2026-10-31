/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fatorDaDivisao } from '../evolucao.ts';
import { entrarNaLiga } from '../liga.ts';
import {
  criarLigaOficial, destinoDoTecnico, devolverAMaquina, ligasNaDivisao, planejarAcessos, receberClube, reforcarMaquina, retirarClube,
} from '../mundo.ts';
import type { LigaRanqueada, ResumoOficial } from '../mundo.ts';

const resumo = (id: string, divisao: number, grupo: number, tecnicos: number): ResumoOficial => ({ id, divisao, grupo, tecnicos });
const clubes = (base: number) => Array.from({ length: 20 }, (_, i) => base + i);
const ranqueada = (id: string, divisao: number, grupo: number): LigaRanqueada => ({ id, divisao, grupo, clubeIds: clubes(0) });

describe('pirâmide', () => {
  it('dobra a cada divisão', () => assert.deepEqual([1, 2, 3, 4].map(ligasNaDivisao), [1, 2, 4, 8]));

  it('o primeiro abre a divisão 1, que recebe até encher', () => {
    assert.deepEqual(destinoDoTecnico([]), { divisao: 1, grupo: 0 });
    assert.deepEqual(destinoDoTecnico([resumo('a', 1, 0, 19)]), { id: 'a' });
  });

  it('cheia a última liga, abre a próxima da divisão e depois a divisão seguinte', () => {
    const d1 = resumo('a', 1, 0, 20);
    assert.deepEqual(destinoDoTecnico([d1]), { divisao: 2, grupo: 0 });
    assert.deepEqual(destinoDoTecnico([d1, resumo('b', 2, 0, 20)]), { divisao: 2, grupo: 1 });
    assert.deepEqual(destinoDoTecnico([d1, resumo('b', 2, 0, 20), resumo('c', 2, 1, 20)]), { divisao: 3, grupo: 0 });
  });

  it('vaga numa divisão de cima não recebe novato: ela é ganha por acesso', () => {
    assert.deepEqual(destinoDoTecnico([resumo('a', 1, 0, 5), resumo('b', 2, 0, 3)]), { id: 'b' });
  });
});

describe('acesso e rebaixamento', () => {
  it('a divisão 1 perde 4 e recebe os 2 primeiros de cada liga abaixo', () => {
    const trocas = planejarAcessos([ranqueada('a', 1, 0), ranqueada('b', 2, 0), ranqueada('c', 2, 1)]);
    assert.equal(trocas.length, 4);
    assert.deepEqual(trocas.map((t) => t.cai.clubeId), [19, 18, 17, 16]);
    assert.deepEqual(trocas.map((t) => [t.sobe.ligaId, t.sobe.clubeId]), [['b', 0], ['b', 1], ['c', 0], ['c', 1]]);
  });

  it('cada liga da divisão 2 recebe das suas filhas e ninguém é trocado duas vezes', () => {
    const trocas = planejarAcessos([
      ranqueada('a', 1, 0), ranqueada('b', 2, 0), ranqueada('c', 2, 1),
      ranqueada('d', 3, 0), ranqueada('e', 3, 1), ranqueada('f', 3, 2), ranqueada('g', 3, 3),
    ]);
    assert.equal(trocas.length, 12);
    const movidos = trocas.flatMap((t) => [`${t.cai.ligaId}${t.cai.clubeId}`, `${t.sobe.ligaId}${t.sobe.clubeId}`]);
    assert.equal(new Set(movidos).size, movidos.length);
    assert.deepEqual(trocas.filter((t) => t.sobe.ligaId === 'f').map((t) => t.cai.ligaId), ['c', 'c']);
  });

  it('sem liga abaixo, ninguém cai', () => assert.deepEqual(planejarAcessos([ranqueada('a', 1, 0)]), []));

  it('o clube muda de liga com elenco, escalação e títulos, sem repetir ids', () => {
    let de = entrarNaLiga(criarLigaOficial('a', { divisao: 2, grupo: 0 }, 1), 'eu', 'Meu Clube');
    const meu = de.clubes.find((c) => c.donoId === 'eu')!;
    de = { ...de, titulos: [{ temporada: 1, torneio: 1, competicao: 'liga', clubeId: meu.id, nomeClube: meu.nome }] };
    const para = criarLigaOficial('b', { divisao: 1, grupo: 0 }, 2);

    const depois = receberClube(para, 5, retirarClube(de, meu.id));
    const chegou = depois.clubes.find((c) => c.id === 5)!;
    assert.equal(chegou.nome, 'Meu Clube');
    assert.equal(chegou.elenco.length, meu.elenco.length);
    const ids = depois.clubes.flatMap((c) => c.elenco.map((j) => j.id));
    assert.equal(new Set(ids).size, ids.length);
    const elenco = new Set(chegou.elenco.map((j) => j.id));
    assert.ok(chegou.escalacao!.titulares.every((e) => elenco.has(e.jogadorId)));
    assert.equal(depois.titulos[0].clubeId, 5);
  });
});

describe('dinheiro e máquina', () => {
  it('a divisão alta rende mais, e amigos ficam iguais', () => {
    assert.deepEqual(['1', '2', '3', '4', null].map(fatorDaDivisao), [3, 2, 1.5, 1, 1]);
  });

  it('a máquina acompanha os técnicos pagando com o próprio saldo', () => {
    const base = entrarNaLiga(criarLigaOficial('a', { divisao: 1, grupo: 0 }, 1), 'eu', 'Meu Clube');
    const liga = {
      ...base,
      clubes: base.clubes.map((c) => (
        c.donoId ? { ...c, elenco: c.elenco.map((j) => ({ ...j, forca: 70, potencial: 70 })) } : { ...c, saldo: 20_000_000 }
      )),
    };
    const depois = reforcarMaquina(liga);
    const antes = liga.clubes.find((c) => c.donoId === null)!;
    const agora = depois.clubes.find((c) => c.id === antes.id)!;
    assert.ok(agora.saldo < antes.saldo);
    assert.ok(Math.max(...agora.elenco.map((j) => j.forca)) >= 67);
    assert.ok(agora.saldo >= 0);
  });

  it('sem saldo, a máquina não contrata', () => {
    const base = entrarNaLiga(criarLigaOficial('a', { divisao: 1, grupo: 0 }, 1), 'eu', 'Meu Clube');
    const liga = {
      ...base,
      clubes: base.clubes.map((c) => (
        c.donoId ? { ...c, elenco: c.elenco.map((j) => ({ ...j, forca: 70, potencial: 70 })) } : { ...c, saldo: 0 }
      )),
    };
    assert.deepEqual(reforcarMaquina(liga).clubes.map((c) => c.saldo), liga.clubes.map((c) => c.saldo));
  });

  it('o clube de técnico inativo volta para a máquina', () => {
    const liga = entrarNaLiga(criarLigaOficial('a', { divisao: 1, grupo: 0 }, 1), 'eu', 'Meu Clube');
    const { id } = liga.clubes.find((c) => c.donoId === 'eu')!;
    assert.equal(devolverAMaquina(liga, id).clubes.find((c) => c.id === id)!.donoId, null);
  });
});
