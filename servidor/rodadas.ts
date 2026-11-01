import { levarTime } from '../src/dominio/amigos.ts';
import { jogarRodada, novaTemporada, temporadaEncerrada } from '../src/dominio/liga.ts';
import type { Liga } from '../src/dominio/tipos.ts';
import { HORAS_AMIGOS, indiceDaJanela, janelaDoMeioDia } from './agenda.ts';
import type { Banco } from './banco.ts';
import { emFila } from './fila.ts';
import { ligaOficialAguardaVirada, timeDaConta, virarMundo } from './mundo.ts';

/** Avança uma liga um horário de jogo. Terminada a temporada, a próxima começa no primeiro horário seguinte. */
function avancar(liga: Liga, janela: number): Liga {
  if (!temporadaEncerrada(liga)) {
    const nova = jogarRodada(liga);
    return liga.rodadaAtual === 1 ? { ...nova, inicioJanela: janela } : nova;
  }
  return janelaDoMeioDia(janela) ? { ...jogarRodada(novaTemporada(liga)), inicioJanela: janela } : liga;
}

async function timesDosTecnicos(banco: Banco, liga: Liga) {
  const times = [];
  for (const { donoId } of liga.clubes) {
    const time = donoId ? await timeDaConta(banco, donoId) : null;
    if (donoId && time) times.push({ donoId, time });
  }
  return times;
}

/**
 * Cada liga guarda o último horário processado. Por isso o servidor pode reiniciar a qualquer
 * momento: nenhuma rodada roda duas vezes, e as perdidas são jogadas na volta.
 */
async function processarLigas(banco: Banco, ids: string[], janelaAtual: number, amigos: boolean) {
  let processadas = 0;
  for (const id of ids) {
    await emFila(async () => {
      const registro = await banco.ligaPorId(id);
      if (registro?.janela === null || registro === null) return;
      let { liga } = registro;
      let janela = registro.janela;
      const times = amigos ? await timesDosTecnicos(banco, liga) : [];
      // O Mundo Oficial vira a temporada junto, em virarMundo, e não uma liga por vez.
      while (janela < janelaAtual && !ligaOficialAguardaVirada(liga, janela + 1)) {
        janela += 1;
        for (const { donoId, time } of times) liga = levarTime(liga, donoId, time);
        liga = avancar(liga, janela);
      }
      await banco.salvarLiga(id, liga, janela);
      processadas += 1;
    });
    // Devolve o processador entre as ligas, para o app não ficar sem resposta durante a rodada.
    await new Promise((pronto) => setImmediate(pronto));
  }
  return processadas;
}

export async function processarRodadas(banco: Banco, agoraMs: number): Promise<number> {
  const janelaMundo = indiceDaJanela(agoraMs);
  const janelaAmigos = indiceDaJanela(agoraMs, HORAS_AMIGOS);
  const processadas = await processarLigas(banco, await banco.ligasAtrasadas(janelaMundo, true), janelaMundo, false)
    + await processarLigas(banco, await banco.ligasAtrasadas(janelaAmigos, false), janelaAmigos, true);
  // Virou? As ligas podem estar atrasadas se o servidor ficou fora do ar, então processa de novo.
  const virou = await emFila(() => virarMundo(banco, janelaMundo, agoraMs));
  return virou ? processadas + await processarRodadas(banco, agoraMs) : processadas;
}
