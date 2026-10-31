/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { melhorEscalacao } from '../escalacao.ts';
import { entrarNaLiga, criarLiga, jogarRodada, novaTemporada, temporadaEncerrada } from '../liga.ts';
import {
  DATAS_DE_LEILAO, ELENCO_MAXIMO, ELENCO_MINIMO, comprarDaMaquina, criarLeilao, darLance, encerrarLeiloes, ofertasDoDia,
  precoDeCompra, precoDeVenda, proximoLance, saldoLivre, valorDe, venderParaFora,
} from '../transferencias.ts';
import type { Clube, Jogador, Liga } from '../tipos.ts';

function nova(): Liga {
  const liga = criarLiga('l', { nomeClube: 'Teste FC', donoId: 'eu', dificuldade: 'normal', duracao: 'torneio', semente: 7 });
  return { ...liga, clubes: liga.clubes.map((c) => (c.donoId ? { ...c, escalacao: melhorEscalacao(c, '4-4-2', 'equilibrado') } : c)) };
}

/** Liga com dois técnicos; o amigo assume o clube mais fraco da máquina. */
function comAmigo() {
  const liga = entrarNaLiga(nova(), 'amigo', 'Amigos FC');
  return { liga, eu: 0, amigo: liga.clubes.find((c) => c.donoId === 'amigo')!.id };
}

const clube = (liga: Liga, id: number) => liga.clubes.find((c) => c.id === id) as Clube;
const reserva = (c: Clube) => c.elenco.find((j) => j.posicao === 'ATA' && !c.escalacao?.titulares.some((e) => e.jogadorId === j.id)) as Jogador;

describe('valor do jogador', () => {
  const base: Jogador = { id: 1, nome: 'X', posicao: 'ATA', idade: 27, forca: 40, potencial: 40, energia: 100, rodadasFora: 0 };

  it('cresce com o nível e com o potencial do jovem, e cai com a idade', () => {
    assert.ok(valorDe({ ...base, forca: 80 }) > 10 * valorDe(base));
    assert.ok(valorDe({ ...base, idade: 20, potencial: 55 }) > valorDe(base));
    assert.ok(valorDe({ ...base, idade: 33 }) < valorDe(base));
  });

  it('comprar sempre custa mais do que vender rende', () => {
    assert.ok(precoDeCompra(base) > valorDe(base) && valorDe(base) > precoDeVenda(base));
  });
});

describe('mercado direto', () => {
  it('oferece um jogador por clube da máquina e repete a lista no mesmo dia', () => {
    const liga = nova();
    assert.equal(ofertasDoDia(liga).length, 19);
    assert.deepEqual(ofertasDoDia(liga), ofertasDoDia(liga));
  });

  it('a compra move o jogador e o dinheiro, e a máquina repõe a vaga', () => {
    const liga = nova();
    const oferta = ofertasDoDia(liga)[0];
    const depois = comprarDaMaquina(liga, 0, oferta.jogador.id);
    assert.equal(clube(depois, 0).saldo, clube(liga, 0).saldo - oferta.preco);
    assert.equal(clube(depois, oferta.clubeId).saldo, clube(liga, oferta.clubeId).saldo + oferta.preco);
    assert.ok(clube(depois, 0).elenco.some((j) => j.id === oferta.jogador.id));
    assert.ok(!clube(depois, oferta.clubeId).elenco.some((j) => j.id === oferta.jogador.id));
    assert.equal(clube(depois, oferta.clubeId).elenco.length, 22);
    const ids = depois.clubes.flatMap((c) => c.elenco.map((j) => j.id));
    assert.equal(new Set(ids).size, ids.length);
  });

  it('o clube sai da lista do dia depois de vender', () => {
    const liga = nova();
    const oferta = ofertasDoDia(liga)[0];
    const depois = comprarDaMaquina(liga, 0, oferta.jogador.id);
    assert.equal(ofertasDoDia(depois).length, 18);
    assert.throws(() => comprarDaMaquina(depois, 0, oferta.jogador.id), /não está mais à venda/);
  });

  it('recusa sem saldo ou com o elenco cheio', () => {
    const liga = nova();
    const { id } = ofertasDoDia(liga)[0].jogador;
    const semDinheiro = { ...liga, clubes: liga.clubes.map((c) => (c.id === 0 ? { ...c, saldo: 0 } : c)) };
    assert.throws(() => comprarDaMaquina(semDinheiro, 0, id), /Saldo insuficiente/);
    const eu = clube(liga, 0);
    const cheio = Array.from({ length: ELENCO_MAXIMO }, (_, i) => ({ ...eu.elenco[0], id: 90_000 + i }));
    const lotado = { ...liga, clubes: liga.clubes.map((c) => (c.id === 0 ? { ...c, elenco: cheio } : c)) };
    assert.throws(() => comprarDaMaquina(lotado, 0, id), /elenco já tem/);
  });
});

describe('venda para fora da liga', () => {
  it('paga o valor de venda e tira o titular da escalação', () => {
    const liga = nova();
    const eu = clube(liga, 0);
    const titular = eu.elenco.find((j) => j.id === eu.escalacao!.titulares.at(-1)!.jogadorId) as Jogador;
    const depois = clube(venderParaFora(liga, 0, titular.id), 0);
    assert.equal(depois.saldo, eu.saldo + precoDeVenda(titular));
    assert.equal(depois.elenco.length, 21);
    assert.equal(depois.escalacao!.titulares.length, 11);
    const ids = new Set(depois.elenco.map((j) => j.id));
    assert.ok(depois.escalacao!.titulares.every((e) => ids.has(e.jogadorId)));
  });

  it('respeita o elenco mínimo e o último goleiro', () => {
    const liga = nova();
    const eu = clube(liga, 0);
    const curto = { ...liga, clubes: liga.clubes.map((c) => (c.id === 0 ? { ...c, elenco: c.elenco.slice(0, ELENCO_MINIMO) } : c)) };
    assert.throws(() => venderParaFora(curto, 0, eu.elenco[0].id), /pelo menos/);
    const goleiros = eu.elenco.filter((j) => j.posicao === 'GOL');
    const umGoleiro = venderParaFora(liga, 0, goleiros[0].id);
    assert.throws(() => venderParaFora(umGoleiro, 0, goleiros[1].id), /goleiro/);
  });
});

describe('leilão entre técnicos', () => {
  function leilaoAberto() {
    const { liga, eu, amigo } = comAmigo();
    const jogador = reserva(clube(liga, eu));
    return { liga: criarLeilao(liga, eu, jogador.id), eu, amigo, jogador };
  }

  it('exige outro técnico na liga e começa no valor de venda', () => {
    const sozinho = nova();
    assert.throws(() => criarLeilao(sozinho, 0, reserva(clube(sozinho, 0)).id), /outro técnico/);
    const { liga, jogador } = leilaoAberto();
    assert.equal(liga.leiloes![0].inicial, precoDeVenda(jogador));
  });

  it('o jogador em leilão não pode ser vendido nem leiloado de novo', () => {
    const { liga, eu, jogador } = leilaoAberto();
    assert.throws(() => venderParaFora(liga, eu, jogador.id), /em leilão/);
    assert.throws(() => criarLeilao(liga, eu, jogador.id), /em leilão/);
  });

  it('recusa lance do vendedor, lance baixo e repetir a liderança', () => {
    const { liga, eu, amigo, jogador } = leilaoAberto();
    const inicial = liga.leiloes![0].inicial;
    assert.throws(() => darLance(liga, eu, jogador.id, inicial), /próprio jogador/);
    assert.throws(() => darLance(liga, amigo, jogador.id, inicial - 10_000), /lance maior/);
    const comLance = darLance(liga, amigo, jogador.id, inicial);
    assert.throws(() => darLance(comLance, amigo, jogador.id, inicial * 2), /já é o maior/);
    assert.ok(proximoLance(comLance.leiloes![0]) > inicial);
  });

  it('o lance mais alto reserva o saldo', () => {
    const { liga, amigo, jogador } = leilaoAberto();
    const antes = saldoLivre(liga, clube(liga, amigo));
    const comLance = darLance(liga, amigo, jogador.id, 1_000_000);
    assert.equal(saldoLivre(comLance, clube(comLance, amigo)), antes - 1_000_000);
    assert.throws(() => darLance(liga, amigo, jogador.id, antes + 10_000), /Saldo insuficiente/);
  });

  it('termina na data certa e transfere para o maior lance', () => {
    const { liga, eu, amigo, jogador } = leilaoAberto();
    let atual = darLance(liga, amigo, jogador.id, 1_000_000);
    const [saldoEu, saldoAmigo] = [clube(atual, eu).saldo, clube(atual, amigo).saldo];
    assert.equal(encerrarLeiloes(atual).leiloes!.length, 1);

    atual = encerrarLeiloes({ ...atual, rodadaAtual: atual.rodadaAtual + DATAS_DE_LEILAO });
    assert.equal(atual.leiloes!.length, 0);
    assert.ok(clube(atual, amigo).elenco.some((j) => j.id === jogador.id));
    assert.ok(!clube(atual, eu).elenco.some((j) => j.id === jogador.id));
    assert.equal(clube(atual, eu).saldo, saldoEu + 1_000_000);
    assert.equal(clube(atual, amigo).saldo, saldoAmigo - 1_000_000);
    assert.equal(atual.transferencias![0].paraId, amigo);
  });

  it('sem lance ou sem dinheiro no fim, o jogador fica', () => {
    const { liga, eu, amigo, jogador } = leilaoAberto();
    assert.ok(clube(encerrarLeiloes(liga, true), eu).elenco.some((j) => j.id === jogador.id));
    const comLance = darLance(liga, amigo, jogador.id, 1_000_000);
    const pobre = { ...comLance, clubes: comLance.clubes.map((c) => (c.id === amigo ? { ...c, saldo: 0 } : c)) };
    const fim = encerrarLeiloes(pobre, true);
    assert.equal(fim.leiloes!.length, 0);
    assert.ok(clube(fim, eu).elenco.some((j) => j.id === jogador.id));
  });

  it('a rodada fecha o leilão vencido e a virada de temporada fecha os abertos', () => {
    const { liga, amigo, jogador } = leilaoAberto();
    let atual = darLance(liga, amigo, jogador.id, 1_000_000);
    for (let i = 0; i <= DATAS_DE_LEILAO; i++) atual = jogarRodada(atual);
    assert.ok(clube(atual, amigo).elenco.some((j) => j.id === jogador.id));

    let segundo = leilaoAberto().liga;
    segundo = darLance(segundo, amigo, jogador.id, 1_000_000);
    const encerrada = { ...segundo, rodadaAtual: segundo.totalRodadas + 1 };
    assert.ok(temporadaEncerrada(encerrada));
    assert.equal(novaTemporada(encerrada).leiloes!.length, 0);
  });

  it('liga antiga, sem os campos novos, continua funcionando', () => {
    const antiga = nova();
    delete antiga.leiloes;
    delete antiga.transferencias;
    assert.equal(jogarRodada(antiga).rodadaAtual, 2);
    assert.equal(ofertasDoDia(antiga).length, 19);
  });
});
