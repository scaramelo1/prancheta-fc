import { jogarRodada, novaTemporada, temporadaEncerrada } from '../src/dominio/liga.ts';
import { indiceDaJanela, janelaDoMeioDia } from './agenda.ts';
import type { Banco } from './banco.ts';
import { emFila } from './fila.ts';
import { ligaOficialAguardaVirada, virarMundo } from './mundo.ts';

/** Avança uma liga um horário de jogo. Terminada a temporada, a próxima começa no meio-dia seguinte. */
function avancar(liga: Parameters<typeof jogarRodada>[0], janela: number) {
  if (!temporadaEncerrada(liga)) return jogarRodada(liga);
  return janelaDoMeioDia(janela) ? jogarRodada(novaTemporada(liga)) : liga;
}

/**
 * Cada liga guarda o último horário processado. Por isso o servidor pode reiniciar a qualquer
 * momento: nenhuma rodada roda duas vezes, e as perdidas são jogadas na volta.
 */
export async function processarRodadas(banco: Banco, agoraMs: number): Promise<number> {
  const janelaAtual = indiceDaJanela(agoraMs);
  let processadas = 0;

  for (const id of await banco.ligasAtrasadas(janelaAtual)) {
    await emFila(async () => {
      const registro = await banco.ligaPorId(id);
      if (registro?.janela === null || registro === null) return;
      let { liga } = registro;
      let janela = registro.janela;
      // O Mundo Oficial vira a temporada junto, em virarMundo, e não uma liga por vez.
      while (janela < janelaAtual && !ligaOficialAguardaVirada(liga, janela + 1)) {
        janela += 1;
        liga = avancar(liga, janela);
      }
      await banco.salvarLiga(id, liga, janela);
      processadas += 1;
    });
    // Devolve o processador entre as ligas, para o app não ficar sem resposta durante a rodada.
    await new Promise((pronto) => setImmediate(pronto));
  }
  // Virou? As ligas podem estar atrasadas se o servidor ficou fora do ar, então processa de novo.
  const virou = await emFila(() => virarMundo(banco, janelaAtual, agoraMs));
  return virou ? processadas + await processarRodadas(banco, agoraMs) : processadas;
}
