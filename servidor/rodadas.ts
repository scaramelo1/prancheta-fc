import { jogarRodada, novaTemporada, temporadaEncerrada } from '../src/dominio/liga.ts';
import { indiceDaJanela, janelaDoMeioDia } from './agenda.ts';
import type { Banco } from './banco.ts';
import { emFila } from './fila.ts';

/** Avança uma liga um horário de jogo. Terminada a temporada, a próxima começa no meio-dia seguinte. */
function avancar(liga: Parameters<typeof jogarRodada>[0], janela: number) {
  if (!temporadaEncerrada(liga)) return jogarRodada(liga);
  return janelaDoMeioDia(janela) ? jogarRodada(novaTemporada(liga)) : liga;
}

/**
 * Cada liga guarda o último horário processado. Por isso o servidor pode reiniciar a qualquer
 * momento: nenhuma rodada roda duas vezes, e as perdidas são jogadas na volta.
 */
export async function processarRodadas(banco: Banco, agoraMs: number) {
  const janelaAtual = indiceDaJanela(agoraMs);
  let processadas = 0;

  for (const id of await banco.ligasAtrasadas(janelaAtual)) {
    await emFila(async () => {
      const registro = await banco.ligaPorId(id);
      if (registro?.janela === null || registro === null) return;
      let { liga } = registro;
      for (let janela = registro.janela + 1; janela <= janelaAtual; janela++) liga = avancar(liga, janela);
      await banco.salvarLiga(id, liga, janelaAtual);
      processadas += 1;
    });
    // Devolve o processador entre as ligas, para o app não ficar sem resposta durante a rodada.
    await new Promise((pronto) => setImmediate(pronto));
  }
  return processadas;
}
