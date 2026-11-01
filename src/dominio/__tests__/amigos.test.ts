import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { adicionarTecnico, criarMataMata, jogarFaseDoMataMata, sortearChave } from '../amigos.ts';
import { clubeDoDono, entrarNaLiga, temporadaEncerrada } from '../liga.ts';
import { criarLigaOficial, dificuldadeDaTemporada } from '../mundo.ts';

function torneioCom(tecnicos: number) {
  const base = entrarNaLiga(criarLigaOficial('m', { divisao: 1, grupo: 0 }, 1), 'x', 'Time Base');
  const time = clubeDoDono(base, 'x')!;
  let liga = criarMataMata('t', 42);
  for (let n = 0; n < tecnicos; n++) liga = adicionarTecnico(liga, `t${n}`, { ...time, nome: `Time ${n}` });
  return sortearChave(liga);
}

describe('mata-mata de amigos', () => {
  for (let tecnicos = 2; tecnicos <= 16; tecnicos++) {
    it(`com ${tecnicos} técnicos, joga ${tecnicos - 1} partidas e tem um campeão`, () => {
      let liga = torneioCom(tecnicos);
      assert.equal(liga.totalRodadas, Math.ceil(Math.log2(tecnicos)));
      while (!temporadaEncerrada(liga)) liga = jogarFaseDoMataMata(liga);
      assert.equal(liga.partidas.length, tecnicos - 1);
      assert.ok(liga.partidas.every((p) => p.resultado && p.casaId !== p.foraId));
      assert.equal(liga.titulos.length, 1);
      assert.equal(liga.partidas.at(-1)!.fase, 'final');
      const ganhou = new Set(liga.partidas.map((p) => p.casaId).concat(liga.partidas.map((p) => p.foraId)));
      assert.equal(ganhou.size, tecnicos, 'todos entram em campo');
    });
  }

  it('a mesma semente sorteia a mesma chave', () => {
    assert.deepEqual(torneioCom(7).partidas, torneioCom(7).partidas);
  });
});

describe('dificuldade do Mundo Oficial', () => {
  it('sobe com a temporada em que a liga é aberta', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 9].map(dificuldadeDaTemporada), ['facil', 'facil', 'normal', 'normal', 'dificil', 'dificil']);
    assert.equal(criarLigaOficial('a', { divisao: 2, grupo: 0 }, 1, 6).dificuldade, 'dificil');
    assert.equal(criarLigaOficial('a', { divisao: 2, grupo: 0 }, 1, 6).temporada, 6);
  });
});
