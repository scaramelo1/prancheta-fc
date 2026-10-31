import { randomInt, randomUUID } from 'node:crypto';

import { entrarNaLiga, jogarRodada, novaTemporada, temporadaEncerrada } from '../src/dominio/liga.ts';
import {
  QUEDAS_POR_LIGA_DE_BAIXO, criarLigaOficial, destinoDoTecnico, devolverAMaquina, grupoDeCima, numeroDaDivisao,
  planejarAcessos, ranquear, receberClube, reforcarMaquina, retirarClube,
} from '../src/dominio/mundo.ts';
import type { ClubeEmTransito, PosicaoNoMundo } from '../src/dominio/mundo.ts';
import type { Liga } from '../src/dominio/tipos.ts';
import { encerrarLeiloes } from '../src/dominio/transferencias.ts';
import { janelaDoMeioDia } from './agenda.ts';
import { CONTA_DO_MUNDO } from './banco.ts';
import type { Banco, RegistroLiga } from './banco.ts';

const DIA_MS = 24 * 3_600_000;
/** Duas temporadas sem abrir o app devolvem o clube à máquina. */
const INATIVIDADE_MS = 120 * DIA_MS;

const pausa = () => new Promise((pronto) => { setImmediate(pronto); });

async function abrirLiga(banco: Banco, posicao: PosicaoNoMundo, gerarCodigo: () => string, janelaInicial: number) {
  const ligas = await banco.resumoOficiais();
  const referencia = ligas.length > 0 ? await banco.ligaPorId(ligas[0].id) : null;
  const id = randomUUID();
  let liga = criarLigaOficial(id, posicao, randomInt(2 ** 31));

  // O calendário é um só: a liga nova joga depressa até alcançar as outras.
  if (referencia) {
    liga = { ...liga, temporada: referencia.liga.temporada };
    while (liga.rodadaAtual < referencia.liga.rodadaAtual && !temporadaEncerrada(liga)) {
      liga = jogarRodada(liga);
      await pausa();
    }
  }
  const registro: RegistroLiga = {
    id, codigo: gerarCodigo(), donoId: CONTA_DO_MUNDO, janela: referencia?.janela ?? janelaInicial, liga,
  };
  await banco.criarLiga(registro);

  if (posicao.divisao > 1) {
    const mae = ligas.find((l) => l.divisao === posicao.divisao - 1 && l.grupo === grupoDeCima(posicao.grupo));
    const registroMae = mae ? await banco.ligaPorId(mae.id) : null;
    if (registroMae) {
      const descem = (registroMae.liga.descem ?? 0) + QUEDAS_POR_LIGA_DE_BAIXO;
      await banco.salvarLiga(registroMae.id, { ...registroMae.liga, descem }, registroMae.janela);
    }
  }
  return registro;
}

/** Chamar dentro da fila. Quem já está no Mundo Oficial volta para a própria liga. */
export async function entrarNoMundo(
  banco: Banco, contaId: string, nomeClube: string, gerarCodigo: () => string, janelaInicial: number,
) {
  const atual = (await banco.ligasDaConta(contaId)).find((r) => r.liga.tipo === 'oficial');
  if (atual) return atual;

  const destino = destinoDoTecnico(await banco.resumoOficiais());
  const registro = 'id' in destino
    ? await banco.ligaPorId(destino.id) as RegistroLiga
    : await abrirLiga(banco, destino, gerarCodigo, janelaInicial);
  const liga = entrarNaLiga(registro.liga, contaId, nomeClube);
  await banco.salvarLiga(registro.id, liga, registro.janela);
  await banco.entrarNaLiga(registro.id, contaId);
  return { ...registro, liga };
}

/**
 * Vira a temporada de todas as ligas de uma vez, e só quando todas terminaram. Abre uma liga por vez,
 * porque juntas não cabem na memória do servidor, e faz tudo em uma transação: ou o mundo inteiro
 * vira, ou nada muda. Devolve true se virou.
 */
export async function virarMundo(banco: Banco, janelaAtual: number, agoraMs: number) {
  const resumos = await banco.resumoOficiais();
  if (resumos.length === 0) return false;

  const ranqueadas = [];
  let janelaDaVirada = 0;
  for (const { id } of resumos) {
    const registro = await banco.ligaPorId(id) as RegistroLiga;
    const janela = (registro.janela as number) + 1;
    if (!temporadaEncerrada(registro.liga) || !janelaDoMeioDia(janela) || janela > janelaAtual) return false;
    janelaDaVirada = janela;
    ranqueadas.push(ranquear(registro.liga));
  }

  const trocas = planejarAcessos(ranqueadas);
  const chave = (ligaId: string, clubeId: number) => `${ligaId}:${clubeId}`;
  const interessados = new Map<string, number[]>();
  for (const { cai, sobe } of trocas) {
    interessados.set(cai.ligaId, [...(interessados.get(cai.ligaId) ?? []), cai.clubeId]);
    interessados.set(sobe.ligaId, [...(interessados.get(sobe.ligaId) ?? []), sobe.clubeId]);
  }

  await banco.transacao(async () => {
    // Os leilões fecham antes de os clubes mudarem de liga: o elenco que viaja já é o definitivo.
    const emTransito = new Map<string, ClubeEmTransito>();
    for (const [ligaId, clubeIds] of interessados) {
      const { liga } = await banco.ligaPorId(ligaId) as RegistroLiga;
      const fechada = encerrarLeiloes(liga, true);
      for (const clubeId of clubeIds) emTransito.set(chave(ligaId, clubeId), retirarClube(fechada, clubeId));
      await pausa();
    }

    for (const { id } of resumos) {
      let { liga } = await banco.ligaPorId(id) as RegistroLiga;
      liga = encerrarLeiloes(liga, true);
      for (const { cai, sobe } of trocas) {
        const [vaga, chega] = cai.ligaId === id ? [cai, sobe] : [sobe, cai];
        if (vaga.ligaId !== id) continue;
        const dono = liga.clubes.find((c) => c.id === vaga.clubeId)?.donoId;
        if (dono) await banco.sairDaLiga(id, dono);
        const chegando = emTransito.get(chave(chega.ligaId, chega.clubeId)) as ClubeEmTransito;
        if (chegando.clube.donoId) await banco.entrarNaLiga(id, chegando.clube.donoId);
        liga = receberClube(liga, vaga.clubeId, chegando);
      }

      for (const clube of liga.clubes) {
        if (clube.donoId && await banco.contaInativa(clube.donoId, agoraMs - INATIVIDADE_MS)) {
          await banco.sairDaLiga(id, clube.donoId);
          liga = devolverAMaquina(liga, clube.id);
        }
      }

      const nova: Liga = reforcarMaquina(novaTemporada({ ...liga, transferencias: [] }));
      await banco.salvarLiga(id, jogarRodada(nova), janelaDaVirada);
      await pausa();
    }
  });
  return true;
}

export const ligaOficialAguardaVirada = (liga: Liga, proximaJanela: number) =>
  numeroDaDivisao(liga) > 0 && temporadaEncerrada(liga) && janelaDoMeioDia(proximaJanela);
