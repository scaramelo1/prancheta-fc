/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  copaDaData, dataDaCopa, dataDaLiga, diaDaData, gerarCalendario, horarioDaData,
} from '../calendario.ts';
import { escalacaoParaJogo, forcaEfetiva, melhorEscalacao, nivelDoTime, trocarTitular, vagasDaFormacao } from '../escalacao.ts';
import { CACHE_AMISTOSO, CUSTO_FOLGA, CUSTO_TREINO_JOVEM, aplicarDecisao, decisaoDoDia } from '../decisoes.ts';
import { evoluirClubes, folhaSalarial, premioDaLiga, salarioDe } from '../evolucao.ts';
import { gerarSigla } from '../geracao.ts';
import {
  calcularTabela, criarLiga, entrarNaLiga, escalacaoValida, jogarDia, jogarRodada, novaTemporada, partidaDoClube, tabelaDaCompeticao, tabelaGeral, temporadaEncerrada, vencedorDaPartida,
} from '../liga.ts';
import { montarEquipe, simularPartida } from '../simulacao.ts';
import { explicarPartida } from '../resumo.ts';
import type { Clube, DuracaoLiga, Evento, Liga, Partida, Resultado } from '../tipos.ts';

const nova = (duracao: DuracaoLiga = 'torneio', semente = 7): Liga =>
  criarLiga('l', { nomeClube: 'Teste FC', donoId: 'eu', dificuldade: 'normal', duracao, semente });

function jogarAte(liga: Liga, data: number) {
  let atual = liga;
  while (!temporadaEncerrada(atual) && atual.rodadaAtual <= data) atual = jogarRodada(atual);
  return atual;
}

const jogarTudo = (liga: Liga) => jogarAte(liga, Infinity);

// Uma temporada completa leva alguns segundos: é jogada uma vez e usada por vários testes.
const temporadaCompleta = jogarTudo(nova('temporada'));

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
    const liga = nova();
    assert.equal(liga.clubes.length, 20);
    assert.equal(liga.clubes.filter((c) => c.donoId === null).length, 19);
  });

  it('não repete nomes de clubes nem ids de jogadores', () => {
    const liga = nova();
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

describe('calendário da temporada', () => {
  it('cada dia tem liga às 12h e às 18h e copa às 21h', () => {
    assert.equal(dataDaLiga(1, 1), 1);
    assert.equal(dataDaLiga(1, 2), 2);
    assert.equal(dataDaCopa(1, 1), 3);
    assert.equal(dataDaLiga(1, 3), 4);
    assert.equal(dataDaLiga(1, 38), 56);
    assert.equal(dataDaCopa(1, 19), 57);
    assert.equal(dataDaLiga(2, 1), 58);
    assert.deepEqual(copaDaData(60), { torneio: 2, rodada: 1 });
    assert.equal(copaDaData(58), null);
    assert.equal(horarioDaData(3), '21h');
  });

  it('a temporada dura 60 dias', () => {
    assert.equal(temporadaCompleta.totalRodadas, 174);
    assert.equal(diaDaData(171), 57);
    assert.equal(diaDaData(174), 60);
    assert.equal(nova('torneio').totalRodadas, 57);
  });

  it('todos jogam a liga inteira: 38 jogos em cada torneio', () => {
    for (const torneio of [1, 2, 3]) {
      assert.ok(tabelaDaCompeticao(temporadaCompleta, 'liga', torneio).every((l) => l.jogos === 38));
    }
    assert.ok(tabelaGeral(temporadaCompleta).every((l) => l.jogos === 114));
  });

  it('todas as partidas foram jogadas e ninguém joga duas vezes na mesma data', () => {
    assert.ok(temporadaCompleta.partidas.every((p) => p.resultado));
    for (let data = 1; data <= 174; data++) {
      const ids = temporadaCompleta.partidas.filter((p) => p.rodada === data).flatMap((p) => [p.casaId, p.foraId]);
      assert.equal(new Set(ids).size, ids.length, `data ${data}`);
    }
  });
});

describe('copas', () => {
  const liga = jogarTudo(nova('torneio'));
  const copa = liga.partidas.filter((p) => p.competicao === 'copa');
  const fase = (nome: string) => copa.filter((p) => p.fase === nome);

  it('tem 13 rodadas de pontos, depois quartas, semifinais e final em ida e volta', () => {
    assert.ok(tabelaDaCompeticao(liga, 'copa', 1).every((l) => l.jogos === 13));
    assert.equal(fase('quartas').length, 8);
    assert.equal(fase('semifinal').length, 4);
    assert.equal(fase('final').length, 2);
  });

  it('só os 8 melhores vão ao mata-mata; os outros 12 jogam a Copa Prata', () => {
    const top8 = tabelaDaCompeticao(liga, 'copa', 1).slice(0, 8).map((l) => l.clubeId).sort();
    assert.deepEqual([...new Set(fase('quartas').flatMap((p) => [p.casaId, p.foraId]))].sort(), top8);
    const prata = tabelaDaCompeticao(liga, 'prata', 1);
    assert.equal(prata.length, 12);
    assert.ok(prata.every((l) => l.jogos === 6));
    assert.ok(prata.every((l) => !top8.includes(l.clubeId)));
  });

  it('avança quem vence no agregado, ou nos pênaltis', () => {
    for (const volta of copa.filter((p) => p.decisiva)) {
      const ida = copa.find((p) => p.id === volta.idaId)!;
      const casa = volta.resultado!.golsCasa + ida.resultado!.golsFora;
      const fora = volta.resultado!.golsFora + ida.resultado!.golsCasa;
      const vencedor = vencedorDaPartida(liga, volta);
      if (casa > fora) assert.equal(vencedor, volta.casaId);
      else if (fora > casa) assert.equal(vencedor, volta.foraId);
      else assert.ok([volta.casaId, volta.foraId].includes(volta.resultado!.vencedorPenaltis!));
    }
  });

  it('registra os campeões do torneio e encerra sem Taça na liga curta', () => {
    assert.deepEqual(liga.titulos.map((t) => t.competicao).sort(), ['copa', 'liga', 'prata']);
    assert.ok(!liga.partidas.some((p) => p.competicao === 'taca'));
    assert.equal(temporadaEncerrada(liga), true);
  });
});

describe('Taça dos Campeões', () => {
  const taca = temporadaCompleta.partidas.filter((p) => p.competicao === 'taca');

  it('tem semifinais, terceiro lugar e final, com um campeão', () => {
    assert.deepEqual(taca.map((p) => p.fase), ['semifinal', 'semifinal', 'terceiro', 'final']);
    const titulo = temporadaCompleta.titulos.find((t) => t.competicao === 'taca')!;
    assert.equal(titulo.clubeId, vencedorDaPartida(temporadaCompleta, taca[3]));
  });

  it('reúne 4 clubes, incluindo os campeões das ligas', () => {
    const clubes = new Set(taca.slice(0, 2).flatMap((p) => [p.casaId, p.foraId]));
    assert.equal(clubes.size, 4);
    for (const t of temporadaCompleta.titulos.filter((x) => x.competicao === 'liga')) assert.ok(clubes.has(t.clubeId));
  });
});

describe('cansaço', () => {
  it('energia baixa reduz o rendimento', () => {
    const [clube] = nova().clubes;
    const j = clube.elenco[0];
    assert.equal(forcaEfetiva({ ...j, energia: 100 }), j.forca);
    assert.ok(forcaEfetiva({ ...j, energia: 0 }) < j.forca * 0.71);
  });

  it('titular cansa mais do que recupera, e quem descansa recupera', () => {
    const inicio = nova();
    inicio.clubes[0].assistente = false;
    const titular = inicio.clubes[0].escalacao!.titulares[5].jogadorId;
    const reserva = inicio.clubes[0].elenco.find((j) => !inicio.clubes[0].escalacao!.titulares.some((t) => t.jogadorId === j.id))!;
    const depois = jogarAte(inicio, 12).clubes[0].elenco;
    const energiaTitular = depois.find((j) => j.id === titular)!;
    assert.ok(energiaTitular.energia < 60 || energiaTitular.rodadasFora > 0, `energia ${energiaTitular.energia}`);
    assert.equal(depois.find((j) => j.id === reserva.id)!.energia, 100);
  });

  it('o assistente poupa os cansados', () => {
    const [clube] = nova().clubes;
    const titular = clube.escalacao!.titulares.find((t) => t.posicao === 'ATA')!;
    const cansado = {
      ...clube,
      elenco: clube.elenco.map((j) => (j.id === titular.jogadorId ? { ...j, energia: 0 } : j)),
    };
    assert.ok(!escalacaoParaJogo(cansado).titulares.some((t) => t.jogadorId === titular.jogadorId));
    assert.ok(escalacaoParaJogo({ ...cansado, assistente: false }).titulares.some((t) => t.jogadorId === titular.jogadorId));
  });

  it('com o assistente, o time rende mais do que sem rodízio', () => {
    let comRodizio = 0;
    let semRodizio = 0;
    for (let semente = 1; semente <= 6; semente++) {
      const base = nova('torneio', semente);
      comRodizio += tabelaDaCompeticao(jogarTudo(base), 'liga', 1).find((l) => l.clubeId === 0)!.pontos;
      const manual = structuredClone(base);
      manual.clubes[0].assistente = false;
      semRodizio += tabelaDaCompeticao(jogarTudo(manual), 'liga', 1).find((l) => l.clubeId === 0)!.pontos;
    }
    assert.ok(comRodizio > semRodizio, `${comRodizio} x ${semRodizio}`);
  });
});

describe('lesões e suspensões', () => {
  it('lesão tira de 3 a 12 jogos e vermelho tira 1', () => {
    const eventos = temporadaCompleta.partidas.flatMap((p) => p.resultado!.eventos);
    const lesoes = eventos.filter((e) => e.tipo === 'lesao');
    assert.ok(lesoes.length > 0);
    assert.ok(lesoes.every((e) => e.rodadasFora! >= 3 && e.rodadasFora! <= 12));
    assert.ok(eventos.filter((e) => e.tipo === 'vermelho').every((e) => e.rodadasFora === 1));
  });

  it('quem está fora não entra em campo e o contador nunca fica negativo', () => {
    let liga = nova();
    while (!temporadaEncerrada(liga)) {
      const anterior = liga;
      liga = jogarRodada(liga);
      const fora = new Set(anterior.clubes.flatMap((c) => c.elenco.filter((j) => j.rodadasFora > 0).map((j) => j.id)));
      for (const partida of liga.partidas.filter((p) => p.rodada === anterior.rodadaAtual)) {
        for (const e of partida.resultado!.eventos) assert.ok(!fora.has(e.jogadorId), 'jogador fora entrou em campo');
      }
      assert.ok(liga.clubes.flatMap((c) => c.elenco).every((j) => j.rodadasFora >= 0));
    }
  });
});

describe('dinheiro', () => {
  it('salário sobe com a força e o prêmio cai com a posição', () => {
    const [clube] = nova().clubes;
    const j = clube.elenco[0];
    assert.ok(salarioDe({ ...j, forca: 80 }) > 2 * salarioDe({ ...j, forca: 60 }));
    assert.ok(premioDaLiga(1) > premioDaLiga(2));
    assert.ok(premioDaLiga(20) > 0);
  });

  it('cobra a folha a cada 7 dias e paga bilheteria ao mandante', () => {
    const inicio = nova();
    const depois = jogarAte(inicio, 21);
    for (const clube of depois.clubes) {
      const mandos = depois.partidas.filter((p) => p.resultado && p.casaId === clube.id).length;
      const original = inicio.clubes.find((c) => c.id === clube.id)!;
      assert.equal(clube.saldo, original.saldo + mandos * 30_000 - folhaSalarial(original));
    }
  });

  it('o clube mediano não quebra em uma temporada', () => {
    const saldos = temporadaCompleta.clubes.map((c) => c.saldo).sort((a, b) => a - b);
    assert.ok(saldos[10] > 0, `saldo mediano ${saldos[10]}`);
  });
});

describe('temporada', () => {
  it('jogarRodada não altera a liga original e é determinístico', () => {
    const liga = nova();
    const antes = JSON.stringify(liga);
    const x = jogarRodada(liga);
    assert.equal(JSON.stringify(liga), antes);
    assert.deepEqual(x, jogarRodada(liga));
  });

  it('não simula depois do fim nem recomeça antes dele', () => {
    assert.equal(jogarRodada(temporadaCompleta), temporadaCompleta);
    const liga = nova();
    assert.equal(novaTemporada(liga), liga);
  });

  it('a nova temporada mantém saldo e títulos e recomeça o calendário', () => {
    const seguinte = novaTemporada(temporadaCompleta);
    assert.equal(seguinte.temporada, 2);
    assert.equal(seguinte.rodadaAtual, 1);
    assert.equal(seguinte.titulos.length, temporadaCompleta.titulos.length);
    assert.equal(seguinte.clubes[0].saldo, temporadaCompleta.clubes[0].saldo);
    assert.ok(seguinte.partidas.every((p) => !p.resultado));
    assert.ok(partidaDoClube(seguinte, 1, 0));
  });

  it('os jogadores envelhecem, e quem se aposenta dá lugar a um jovem', () => {
    const liga = nova();
    for (const j of liga.clubes[0].elenco) j.idade = 38;
    liga.clubes[0].assistente = false;
    const [clube] = evoluirClubes(liga);
    assert.equal(clube.elenco.length, 22);
    assert.ok(clube.elenco.every((j) => j.idade <= 19 && j.potencial >= j.forca));
    assert.equal(escalacaoParaJogo(clube).titulares.length, 11);
    assert.ok(escalacaoValida(clube, clube.escalacao!), 'a escalação salva continua válida');
    const ids = evoluirClubes(liga).flatMap((c) => c.elenco.map((j) => j.id));
    assert.equal(new Set(ids).size, ids.length);
  });

  it('jovem evolui até o potencial e veterano cai', () => {
    const liga = nova();
    Object.assign(liga.clubes[0].elenco[0], { idade: 18, forca: 50, potencial: 51 });
    Object.assign(liga.clubes[0].elenco[1], { idade: 32, forca: 70, potencial: 70 });
    const { elenco } = evoluirClubes(liga)[0];
    assert.equal(elenco[0].forca, 51);
    assert.ok(elenco[1].forca < 70 || elenco[1].idade < 20);
  });

  it('desempata por vitórias e depois por saldo', () => {
    const r = (golsCasa: number, golsFora: number) => ({ golsCasa, golsFora, posseCasa: 50, chancesCasa: 0, chancesFora: 0, eventos: [] });
    const p = (casaId: number, foraId: number, g1: number, g2: number) => ({ casaId, foraId, resultado: r(g1, g2) });
    const tabela = calcularTabela([1, 2, 3], [p(1, 3, 1, 0), p(2, 3, 5, 0)]);
    assert.deepEqual(tabela.map((l) => l.clubeId), [2, 1, 3]);
  });
});

describe('resumo do jogo', () => {
  const resultado = (extra: Partial<Resultado>): Resultado => ({
    golsCasa: 1, golsFora: 0, posseCasa: 50, chancesCasa: 10, chancesFora: 10, energiaCasa: 80, energiaFora: 80, eventos: [], ...extra,
  });
  const partida = (r: Resultado | null): Partida => ({
    id: 1, rodada: 1, competicao: 'liga', torneio: 1, fase: 'pontos', decisiva: false, casaId: 1, foraId: 2, resultado: r,
  });
  const vermelho: Evento = { minuto: 10, tipo: 'vermelho', clubeId: 2, jogadorId: 9, jogador: 'X', rodadasFora: 1 };

  it('aponta a causa da derrota', () => {
    assert.equal(explicarPartida(partida(resultado({ eventos: [vermelho] })), 2), 'expulsao');
    assert.equal(explicarPartida(partida(resultado({ energiaFora: 50 })), 2), 'cansaco');
    assert.equal(explicarPartida(partida(resultado({ chancesFora: 15 })), 2), 'faltouPontaria');
    assert.equal(explicarPartida(partida(resultado({ posseCasa: 60, chancesCasa: 15 })), 2), 'meioPerdido');
  });

  it('aponta a causa da vitória, vista por qualquer lado', () => {
    assert.equal(explicarPartida(partida(resultado({ posseCasa: 60 })), 1), 'meioDominado');
    assert.equal(explicarPartida(partida(resultado({ chancesCasa: 4 })), 1), 'aproveitou');
    assert.equal(explicarPartida(partida(resultado({ golsCasa: 0, golsFora: 2, chancesFora: 3 })), 2), 'aproveitou');
  });

  it('empate e jogo sem resultado são equilibrados', () => {
    assert.equal(explicarPartida(partida(resultado({ golsFora: 1, posseCasa: 70 })), 1), 'equilibrado');
    assert.equal(explicarPartida(partida(null), 1), 'equilibrado');
  });

  it('a partida jogada guarda a energia dos dois times', () => {
    const r = temporadaCompleta.partidas[0].resultado!;
    assert.equal(r.energiaCasa, 100);
    assert.equal(r.energiaFora, 100);
  });
});

describe('simular o dia', () => {
  it('joga as 3 datas do dia e para no dia seguinte', () => {
    assert.equal(jogarDia(nova()).rodadaAtual, 4);
  });

  it('continuando de uma data no meio do dia, joga só o que falta', () => {
    assert.equal(jogarDia(jogarRodada(nova())).rodadaAtual, 4);
  });

  it('não faz nada com a temporada encerrada', () => {
    assert.equal(jogarDia(temporadaCompleta), temporadaCompleta);
  });
});

describe('decisão do dia', () => {
  const comDecisao = (tipo: string) => {
    for (let semente = 1; semente < 200; semente++) {
      const liga = nova('torneio', semente);
      const decisao = decisaoDoDia(liga, liga.clubes[0]);
      if (decisao?.tipo === tipo) return { liga, decisao };
    }
    throw new Error(`sem decisão ${tipo}`);
  };

  it('aparece uma vez por dia e volta no dia seguinte', () => {
    const { liga, decisao } = comDecisao('folga');
    const respondida = aplicarDecisao(liga, 0, decisao, false);
    assert.equal(decisaoDoDia(respondida, respondida.clubes[0]), null);
    assert.notEqual(decisaoDoDia(jogarDia(respondida), respondida.clubes[0]), null);
  });

  it('recusar não muda nada além de marcar o dia', () => {
    const { liga, decisao } = comDecisao('amistoso');
    const depois = aplicarDecisao(liga, 0, decisao, false);
    assert.equal(depois.clubes[0].saldo, liga.clubes[0].saldo);
    assert.deepEqual(depois.clubes[0].elenco, liga.clubes[0].elenco);
  });

  it('a folga custa dinheiro e devolve energia, sem passar de 100', () => {
    const { liga, decisao } = comDecisao('folga');
    liga.clubes[0].elenco[0].energia = 50;
    const depois = aplicarDecisao(liga, 0, decisao, true).clubes[0];
    assert.equal(depois.saldo, liga.clubes[0].saldo - CUSTO_FOLGA);
    assert.equal(depois.elenco[0].energia, 65);
    assert.equal(depois.elenco[1].energia, 100);
  });

  it('o amistoso paga e cansa', () => {
    const { liga, decisao } = comDecisao('amistoso');
    const depois = aplicarDecisao(liga, 0, decisao, true).clubes[0];
    assert.equal(depois.saldo, liga.clubes[0].saldo + CACHE_AMISTOSO);
    assert.equal(depois.elenco[0].energia, 90);
  });

  it('o treino do jovem respeita o potencial', () => {
    const { liga, decisao } = comDecisao('jovem');
    const antes = liga.clubes[0].elenco.find((j) => j.id === decisao.jogadorId)!;
    const depois = aplicarDecisao(liga, 0, decisao, true).clubes[0];
    assert.equal(depois.saldo, liga.clubes[0].saldo - CUSTO_TREINO_JOVEM);
    assert.equal(depois.elenco.find((j) => j.id === decisao.jogadorId)!.forca, antes.forca + 1);
  });

  it('sem dinheiro, não oferece treino pago de jovem', () => {
    const { liga } = comDecisao('jovem');
    liga.clubes[0].saldo = 0;
    assert.equal(decisaoDoDia(liga, liga.clubes[0])?.tipo, 'amistoso');
  });

  it('não aparece depois do fim da temporada', () => {
    assert.equal(decisaoDoDia(temporadaCompleta, temporadaCompleta.clubes[0]), null);
  });
});

describe('entrada na liga', () => {
  const forca = (c: Clube) => c.elenco.reduce((soma, j) => soma + j.forca, 0);

  it('o novo técnico assume o clube mais fraco da máquina', () => {
    const liga = nova();
    const maquinas = liga.clubes.filter((c) => c.donoId === null);
    const fraco = maquinas.reduce((a, c) => (forca(c) < forca(a) ? c : a));
    const depois = entrarNaLiga(liga, 'amigo', 'Amigos FC');
    const clube = depois.clubes.find((c) => c.donoId === 'amigo')!;
    assert.equal(clube.id, fraco.id);
    assert.equal(clube.nome, 'Amigos FC');
    assert.equal(clube.personalidade, null);
    assert.ok(escalacaoValida(clube, clube.escalacao!));
  });

  it('recusa quem já está na liga e liga cheia', () => {
    let liga = nova();
    assert.throws(() => entrarNaLiga(liga, 'eu', 'De Novo FC'));
    for (let i = 0; i < 19; i++) liga = entrarNaLiga(liga, `t${i}`, `Time ${i} FC`);
    assert.throws(() => entrarNaLiga(liga, 'outro', 'Sem Vaga FC'));
  });

  it('dois humanos jogam a mesma liga até o fim', () => {
    const liga = jogarTudo(entrarNaLiga(nova(), 'amigo', 'Amigos FC'));
    assert.ok(liga.partidas.every((p) => p.resultado));
  });
});

describe('nível de 30 a 100', () => {
  it('o nível do time é a média dos titulares e acompanha o dos jogadores', () => {
    const clube = nova().clubes[0];
    assert.equal(nivelDoTime(comForca(clube, 30)), 30);
    assert.equal(nivelDoTime(comForca(clube, 73)), 73);
    assert.equal(nivelDoTime(comForca(clube, 100)), 100);
  });

  it('um reforço entre os titulares sobe o nível do time', () => {
    const clube = comForca(nova().clubes[0], 50);
    const [primeiro, ...resto] = clube.elenco;
    assert.equal(nivelDoTime({ ...clube, elenco: [{ ...primeiro, forca: 100 }, ...resto] }), 55);
  });

  it('jogador fora de posição e vaga vazia derrubam o nível', () => {
    const clube = comForca(nova().clubes[0], 60);
    const semGoleiros = { ...clube, elenco: clube.elenco.map((j) => (j.posicao === 'GOL' ? { ...j, rodadasFora: 3 } : j)) };
    assert.ok(nivelDoTime(semGoleiros) < 60);
    const incompleto = { ...clube, elenco: clube.elenco.slice(0, 5) };
    assert.ok(nivelDoTime(incompleto) < 40);
  });

  it('um time inicial gira em torno de 35 a 40', () => {
    for (const dificuldade of ['facil', 'normal', 'dificil'] as const) {
      const niveis: number[] = [];
      for (let semente = 1; semente <= 20; semente++) {
        const liga = criarLiga('l', { nomeClube: 'Teste FC', donoId: 'eu', dificuldade, duracao: 'torneio', semente });
        niveis.push(...liga.clubes.map(nivelDoTime));
      }
      const media = niveis.reduce((a, b) => a + b, 0) / niveis.length;
      assert.ok(media >= 35 && media <= 40, `${dificuldade}: ${media}`);
      assert.ok(niveis.every((n) => n >= 33 && n <= 42), dificuldade);
    }
  });

  it('a evolução vai até 100 e para no piso de 30', () => {
    const liga = nova();
    Object.assign(liga.clubes[0].elenco[0], { idade: 18, forca: 100, potencial: 100 });
    Object.assign(liga.clubes[0].elenco[1], { idade: 32, forca: 30, potencial: 30 });
    const { elenco } = evoluirClubes(liga)[0];
    assert.ok(elenco[0].forca >= 99 && elenco[0].forca <= 100);
    assert.equal(elenco[1].forca, 30);
  });

  it('o jogo roda com os extremos da escala', () => {
    const { clubes } = nova();
    const [fraco, forte] = [comForca(clubes[1], 30), comForca(clubes[2], 100)];
    const r = simularPartida(
      montarEquipe(forte, melhorEscalacao(forte, '4-4-2', 'equilibrado')),
      montarEquipe(fraco, melhorEscalacao(fraco, '4-4-2', 'equilibrado')),
      3,
    );
    assert.ok(r.golsCasa > r.golsFora);
  });
});
