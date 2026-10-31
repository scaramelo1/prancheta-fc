/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { clubeDoDono } from '../../src/dominio/liga.ts';
import { indiceDaJanela } from '../agenda.ts';
import { BancoSqlite } from '../banco.ts';
import { entrarNoMundo } from '../mundo.ts';
import { processarRodadas } from '../rodadas.ts';

const MEIO_DIA = Date.UTC(2026, 10, 1, 15, 0);
let codigo = 0;
const gerarCodigo = () => `C${++codigo}`;

async function mundoCom21Tecnicos() {
  const banco = new BancoSqlite(':memory:');
  const janela = indiceDaJanela(MEIO_DIA) - 1;
  for (let n = 0; n < 21; n++) {
    await banco.criarConta(`t${n}`, 'Técnico', `hash${n}`);
    await entrarNoMundo(banco, `t${n}`, `Clube ${n}`, gerarCodigo, janela);
  }
  return { banco, janela };
}

/** Todas as ligas no último instante antes da virada. */
async function encerrarTemporada(banco: BancoSqlite, janela: number) {
  for (const { id } of await banco.resumoOficiais()) {
    const { liga } = await banco.ligaPorId(id) as NonNullable<Awaited<ReturnType<BancoSqlite['ligaPorId']>>>;
    await banco.salvarLiga(id, { ...liga, rodadaAtual: liga.totalRodadas + 1 }, janela);
  }
}

describe('virada do Mundo Oficial', () => {
  it('troca os clubes entre as divisões e mantém cada técnico em uma liga só', async () => {
    const { banco, janela } = await mundoCom21Tecnicos();
    const antes = await banco.resumoOficiais();
    assert.deepEqual(antes.map((l) => [l.divisao, l.tecnicos]).sort(), [[1, 20], [2, 1]]);
    await encerrarTemporada(banco, janela);

    await processarRodadas(banco, MEIO_DIA);

    const depois = await banco.resumoOficiais();
    assert.equal(depois.reduce((soma, l) => soma + l.tecnicos, 0), 21);
    for (const { id } of depois) {
      const registro = await banco.ligaPorId(id);
      assert.equal(registro?.liga.temporada, 2);
      assert.equal(registro?.liga.rodadaAtual, 2);
      assert.equal(registro?.janela, janela + 1);
      assert.equal(registro?.liga.clubes.length, 20);
      const ids = registro?.liga.clubes.flatMap((c) => c.elenco.map((j) => j.id)) ?? [];
      assert.equal(new Set(ids).size, ids.length);
    }
    for (let n = 0; n < 21; n++) {
      const ligas = (await banco.ligasDaConta(`t${n}`)).filter((r) => r.liga.tipo === 'oficial');
      assert.equal(ligas.length, 1, `t${n}`);
      assert.ok(clubeDoDono(ligas[0].liga, `t${n}`), `t${n} tem clube na liga`);
    }
    await banco.fechar();
  });

  it('não vira enquanto uma liga ainda joga', async () => {
    const { banco, janela } = await mundoCom21Tecnicos();
    const [primeira] = await banco.resumoOficiais();
    const { liga } = await banco.ligaPorId(primeira.id) as NonNullable<Awaited<ReturnType<BancoSqlite['ligaPorId']>>>;
    await encerrarTemporada(banco, janela);
    await banco.salvarLiga(primeira.id, liga, janela);
    await processarRodadas(banco, MEIO_DIA);
    for (const { id } of await banco.resumoOficiais()) assert.equal((await banco.ligaPorId(id))?.liga.temporada, 1);
    await banco.fechar();
  });

  it('o técnico que sumiu devolve o clube à máquina', async () => {
    const { banco, janela } = await mundoCom21Tecnicos();
    await banco.registrarAcesso('t5', MEIO_DIA - 200 * 24 * 3_600_000);
    await encerrarTemporada(banco, janela);
    await processarRodadas(banco, MEIO_DIA);
    assert.equal((await banco.ligasDaConta('t5')).length, 0);
    assert.equal((await banco.resumoOficiais()).reduce((soma, l) => soma + l.tecnicos, 0), 20);
    await banco.fechar();
  });
});
