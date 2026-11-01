/// <reference types="node" />
import { createHash } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { ErroApi, criarCliente, criarConta } from '../../src/api/cliente.ts';
import type { VisaoLiga } from '../../src/api/cliente.ts';
import { indiceDaJanela, janelaDoMeioDia, proximoInicio } from '../agenda.ts';
import { criarApi } from '../api.ts';
import { BancoSqlite } from '../banco.ts';
import { paginaDeRetorno } from '../google.ts';
import { processarRodadas } from '../rodadas.ts';

/** 12:00 de Brasília em 1º de novembro de 2026. */
const MEIO_DIA = Date.UTC(2026, 10, 1, 15, 0);
const HORA = 3_600_000;

describe('agenda', () => {
  it('muda de janela às 12h, 18h e 21h de Brasília', () => {
    const j = indiceDaJanela(MEIO_DIA);
    assert.equal(indiceDaJanela(MEIO_DIA - 1), j - 1);
    assert.equal(indiceDaJanela(MEIO_DIA + 6 * HORA - 1), j);
    assert.equal(indiceDaJanela(MEIO_DIA + 6 * HORA), j + 1);
    assert.equal(indiceDaJanela(MEIO_DIA + 9 * HORA), j + 2);
    assert.equal(indiceDaJanela(MEIO_DIA + 23 * HORA), j + 2);
    assert.equal(indiceDaJanela(MEIO_DIA + 24 * HORA), j + 3);
  });

  it('a temporada sempre começa em um meio-dia futuro', () => {
    assert.equal(janelaDoMeioDia(indiceDaJanela(MEIO_DIA)), true);
    assert.equal(proximoInicio(MEIO_DIA), indiceDaJanela(MEIO_DIA + 24 * HORA));
    assert.equal(proximoInicio(MEIO_DIA - HORA), indiceDaJanela(MEIO_DIA));
    assert.equal(proximoInicio(MEIO_DIA + 10 * HORA), indiceDaJanela(MEIO_DIA + 24 * HORA));
  });
});

describe('API', () => {
  let agora = MEIO_DIA - HORA;
  const banco = new BancoSqlite(':memory:');
  const api = criarApi(banco, { relogio: () => agora, contasPorHora: 1000, contasAnonimas: true });
  let base = '';

  async function chamar(metodo: string, caminho: string, token?: string, corpo?: unknown) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    return { status: resposta.status, corpo: (await resposta.json()) as any };
  }

  const novaConta = async () => (await chamar('POST', '/contas')).corpo.token as string;
  const novoTime = async (nomeClube: string) => {
    const token = await novaConta();
    return { token, visao: (await chamar('POST', '/mundo/entrar', token, { nomeClube })).corpo };
  };

  before(async () => {
    await new Promise<void>((pronto) => { api.listen(0, '127.0.0.1', pronto); });
    base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise((pronto) => { api.close(pronto); });
    await banco.fechar();
  });

  it('responde à checagem de saúde sem conta', async () => {
    assert.deepEqual((await chamar('GET', '/saude')).corpo, { ok: true });
  });

  it('recusa quem não tem conta ou tem token errado', async () => {
    assert.equal((await chamar('GET', '/ligas')).status, 401);
    assert.equal((await chamar('GET', '/ligas', 'token-falso')).status, 401);
  });

  it('sem time não cria nem entra em liga de amigos', async () => {
    const token = await novaConta();
    assert.equal((await chamar('POST', '/ligas', token)).status, 409);
    assert.equal((await chamar('POST', '/ligas/entrar', token, { codigo: 'ABC234' })).status, 409);
  });

  it('valida o nome do time e não deixa criar um segundo', async () => {
    const token = await novaConta();
    assert.equal((await chamar('POST', '/mundo/entrar', token, { nomeClube: 'x' })).status, 400);
    const primeiro = await chamar('POST', '/mundo/entrar', token, { nomeClube: 'Time Certo' });
    const segundo = await chamar('POST', '/mundo/entrar', token, { nomeClube: 'Outro Time' });
    assert.equal(segundo.corpo.id, primeiro.corpo.id);
    assert.equal(segundo.corpo.liga.clubes.find((c: any) => c.id === segundo.corpo.meuClubeId).nome, 'Time Certo');
  });

  it('limita as ligas criadas por conta', async () => {
    const { token } = await novoTime('Dono FC');
    for (let i = 0; i < 3; i++) assert.equal((await chamar('POST', '/ligas', token)).status, 201);
    assert.equal((await chamar('POST', '/ligas', token)).status, 409);
  });

  it('amigo entra pelo código com o mesmo time do Mundo e a liga fica com 20 clubes', async () => {
    const dono = await novoTime('Clube do Dono');
    const amigo = await novoTime('Amigos FC');
    const { corpo: criada } = await chamar('POST', '/ligas', dono.token);

    assert.equal((await chamar('POST', '/ligas/entrar', amigo.token, { codigo: 'ERRADO' })).status, 404);
    const { corpo: entrou } = await chamar('POST', '/ligas/entrar', amigo.token, { codigo: criada.codigo.toLowerCase() });

    assert.equal(entrou.liga.tipo, 'amigos');
    assert.equal(entrou.liga.clubes.length, 20);
    assert.equal(entrou.liga.clubes.filter((c: any) => c.donoId !== null).length, 2);
    const meu = entrou.liga.clubes.find((c: any) => c.id === entrou.meuClubeId);
    const noMundo = amigo.visao.liga.clubes.find((c: any) => c.id === amigo.visao.meuClubeId);
    assert.equal(meu.nome, 'Amigos FC');
    assert.deepEqual(meu.elenco.map((j: any) => j.nome), noMundo.elenco.map((j: any) => j.nome));
    assert.equal(entrou.souDono, false);
    const lista = (await chamar('GET', '/ligas', amigo.token)).corpo;
    const amigos = lista.find((l: any) => l.tipo === 'amigos');
    assert.deepEqual([lista.length, amigos.clube, amigos.tecnicos], [2, 'Amigos FC', 2]);
  });

  it('entrar duas vezes não ocupa outro clube', async () => {
    const { token } = await novoTime('Clube do Dono');
    const { corpo: criada } = await chamar('POST', '/ligas', token);
    const { corpo } = await chamar('POST', '/ligas/entrar', token, { codigo: criada.codigo });
    assert.equal(corpo.liga.clubes.filter((c: any) => c.donoId !== null).length, 1);
  });

  it('o time só muda no Mundo Oficial', async () => {
    const { token, visao } = await novoTime('Clube do Dono');
    const { corpo: criada } = await chamar('POST', '/ligas', token);
    assert.equal(criada.decisao, null);
    assert.deepEqual(criada.mercado, []);
    const rota = `/ligas/${criada.id}`;
    const clube = criada.liga.clubes.find((c: any) => c.id === criada.meuClubeId);
    assert.equal((await chamar('PUT', `${rota}/escalacao`, token, { escalacao: clube.escalacao, assistente: false })).status, 409);
    assert.equal((await chamar('POST', `${rota}/decisao`, token, { aceitar: false })).status, 409);
    assert.equal((await chamar('POST', `${rota}/mercado/vender`, token, { jogadorId: clube.elenco[0].id })).status, 409);
    assert.ok(visao.decisao);
  });

  it('transferências: compra, venda e leilão pela API', async () => {
    const { token: dono, visao: criada } = await novoTime('Clube do Dono');
    const { token: amigo } = await novoTime('Amigos FC');
    const rota = `/ligas/${criada.id}`;

    const { corpo: visao } = await chamar('GET', rota, dono);
    assert.ok(visao.mercado.length > 0);
    const tamanho = visao.liga.clubes.find((c: any) => c.id === visao.meuClubeId).elenco.length;
    const oferta = visao.mercado[0];
    const { status, corpo: comprou } = await chamar('POST', `${rota}/mercado/comprar`, dono, { jogadorId: oferta.jogador.id });
    assert.equal(status, 200);
    assert.equal(comprou.liga.clubes.find((c: any) => c.id === comprou.meuClubeId).elenco.length, tamanho + 1);
    assert.equal((await chamar('POST', `${rota}/mercado/comprar`, amigo, { jogadorId: oferta.jogador.id })).status, 409);
    assert.equal((await chamar('POST', `${rota}/mercado/comprar`, dono, {})).status, 400);

    const meu = comprou.liga.clubes.find((c: any) => c.id === comprou.meuClubeId);
    const reserva = meu.elenco.find((j: any) => !meu.escalacao.titulares.some((e: any) => e.jogadorId === j.id));
    const { corpo: leiloou } = await chamar('POST', `${rota}/leiloes`, dono, { jogadorId: reserva.id });
    const { inicial } = leiloou.liga.leiloes[0];
    assert.equal((await chamar('POST', `${rota}/leiloes/${reserva.id}/lances`, dono, { valor: inicial })).status, 409);
    const lance = await chamar('POST', `${rota}/leiloes/${reserva.id}/lances`, amigo, { valor: inicial });
    assert.equal(lance.status, 200);
    assert.equal(lance.corpo.liga.leiloes[0].lance.valor, inicial);

    const vendido = meu.elenco.find((j: any) => j.id !== reserva.id && j.posicao === 'ATA');
    const venda = await chamar('POST', `${rota}/mercado/vender`, dono, { jogadorId: vendido.id });
    assert.equal(venda.status, 200);
    assert.ok(venda.corpo.liga.transferencias.some((x: any) => x.paraId === null));
    assert.equal((await chamar('POST', `${rota}/mercado/vender`, await novaConta(), { jogadorId: 1 })).status, 404);
  });

  it('quem não participa não vê a liga', async () => {
    const { token } = await novoTime('Clube do Dono');
    const { corpo } = await chamar('POST', '/ligas', token);
    assert.equal((await chamar('GET', `/ligas/${corpo.id}`, await novaConta())).status, 404);
  });

  it('só o dono inicia, e uma vez só', async () => {
    const dono = await novoTime('Clube do Dono');
    const amigo = await novoTime('Amigos FC');
    const { corpo: criada } = await chamar('POST', '/ligas', dono.token);
    await chamar('POST', '/ligas/entrar', amigo.token, { codigo: criada.codigo });
    assert.equal((await chamar('POST', `/ligas/${criada.id}/iniciar`, amigo.token)).status, 403);
    assert.equal((await chamar('POST', `/ligas/${criada.id}/iniciar`, dono.token)).corpo.iniciada, true);
    assert.equal((await chamar('POST', `/ligas/${criada.id}/iniciar`, dono.token)).status, 409);
  });

  it('aceita escalação válida e recusa jogador de outro clube, repetido ou faltando', async () => {
    const { token: dono, visao: corpo } = await novoTime('Clube da Escalação');
    const clube = corpo.liga.clubes.find((c: any) => c.id === corpo.meuClubeId);
    const rival = corpo.liga.clubes.find((c: any) => c.id !== corpo.meuClubeId);
    const { escalacao } = clube;
    const url = `/ligas/${corpo.id}/escalacao`;
    const enviar = (e: unknown) => chamar('PUT', url, dono, { escalacao: e, assistente: false });

    const trocada = { ...escalacao, estilo: 'ofensivo' };
    const salva = await enviar(trocada);
    assert.equal(salva.status, 200);
    const meu = salva.corpo.liga.clubes.find((c: any) => c.id === salva.corpo.meuClubeId);
    assert.equal(meu.escalacao.estilo, 'ofensivo');
    assert.equal(meu.assistente, false);

    const repetido = { ...escalacao, titulares: escalacao.titulares.map((t: any) => ({ ...t, jogadorId: escalacao.titulares[0].jogadorId })) };
    const deFora = { ...escalacao, titulares: [{ ...escalacao.titulares[0], jogadorId: rival.elenco[0].id }, ...escalacao.titulares.slice(1)] };
    assert.equal((await enviar(repetido)).status, 400);
    assert.equal((await enviar(deFora)).status, 400);
    assert.equal((await enviar({ ...escalacao, titulares: escalacao.titulares.slice(1) })).status, 400);
    assert.equal((await enviar({ ...escalacao, formacao: '1-1-8' })).status, 400);
    assert.equal((await enviar(null)).status, 400);
  });

  it('responde à decisão do dia uma vez', async () => {
    const { token: dono, visao: corpo } = await novoTime('Clube da Decisão');
    assert.ok(corpo.decisao);
    const url = `/ligas/${corpo.id}/decisao`;
    assert.equal((await chamar('POST', url, dono, { aceitar: false })).corpo.decisao, null);
    assert.equal((await chamar('POST', url, dono, { aceitar: false })).status, 409);
  });

  it('recusa JSON inválido e corpo grande demais', async () => {
    const token = await novaConta();
    const invalido = await fetch(`${base}/mundo/entrar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{' });
    assert.equal(invalido.status, 400);
    assert.equal((await chamar('POST', '/mundo/entrar', token, { nomeClube: 'x'.repeat(20_000) })).status, 413);
  });

  it('nunca grava o token em texto puro', async () => {
    const { corpo } = await chamar('POST', '/contas');
    assert.equal(await banco.contaPorToken(corpo.token), null);
  });

  it('joga cada horário uma vez, recupera os perdidos e só mostra a narração do próprio jogo', async () => {
    agora = MEIO_DIA - HORA;
    const { token: dono, visao: criada } = await novoTime('Clube das Rodadas');
    const { corpo: amigos } = await chamar('POST', '/ligas', dono);
    const url = `/ligas/${criada.id}`;
    const data = async () => (await chamar('GET', url, dono)).corpo.liga.rodadaAtual;

    await processarRodadas(banco, MEIO_DIA - 1);
    assert.equal(await data(), 1);

    await processarRodadas(banco, MEIO_DIA);
    await processarRodadas(banco, MEIO_DIA + 1000);
    assert.equal(await data(), 2);

    // O servidor ficou fora do ar às 18h e às 21h.
    await processarRodadas(banco, MEIO_DIA + 10 * HORA);
    assert.equal(await data(), 4);

    const { corpo } = await chamar('GET', url, dono);
    const jogadas = corpo.liga.partidas.filter((p: any) => p.resultado);
    assert.equal(jogadas.length, 30);
    const alheia = jogadas.find((p: any) => p.casaId !== corpo.meuClubeId && p.foraId !== corpo.meuClubeId && p.resultado.golsCasa > 0);
    assert.deepEqual(alheia.resultado.eventos, []);
    const completa = (await chamar('GET', `${url}/partidas/${alheia.id}`, dono)).corpo;
    assert.ok(completa.resultado.eventos.length > 0);

    // A liga de amigos não iniciada não joga, por mais que o tempo passe.
    await processarRodadas(banco, MEIO_DIA + 30 * HORA);
    assert.equal((await chamar('GET', `/ligas/${amigos.id}`, dono)).corpo.liga.rodadaAtual, 1);
  });
});

describe('liga de amigos com o time único', () => {
  it('joga às 10h, 15h e 20h, usa o time do Mundo e não gasta a energia dele', async () => {
    // Criada às 11h: a liga de amigos começa às 10h do dia seguinte, e o Mundo, às 12h de hoje.
    const DEZ_DA_MANHA = MEIO_DIA + 22 * HORA;
    const banco = new BancoSqlite(':memory:');
    const api = criarApi(banco, { relogio: () => MEIO_DIA - HORA, contasPorHora: 100, contasAnonimas: true });
    await new Promise<void>((pronto) => { api.listen(0, '127.0.0.1', pronto); });
    const base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
    const dono = criarCliente((await criarConta(base)).token, base);
    const meu = (v: VisaoLiga) => v.liga.clubes.find((c) => c.id === v.meuClubeId)!;

    const mundo = await dono.entrarMundo('Time Único');
    const criada = await dono.criarLiga();
    assert.equal((await dono.iniciar(criada.id)).iniciada, true);
    await dono.salvarEscalacao(mundo.id, { ...meu(mundo).escalacao!, estilo: 'ofensivo' }, false);

    await processarRodadas(banco, DEZ_DA_MANHA - 1);
    assert.equal((await dono.liga(criada.id)).liga.rodadaAtual, 1);
    const antes = await dono.liga(mundo.id);
    assert.equal(antes.liga.rodadaAtual, 4);

    await processarRodadas(banco, DEZ_DA_MANHA);
    const amigos = await dono.liga(criada.id);
    const depois = await dono.liga(mundo.id);
    assert.equal(amigos.liga.rodadaAtual, 2);
    assert.equal(meu(amigos).escalacao!.estilo, 'ofensivo', 'a escalação do Mundo vale aqui');
    assert.ok(meu(amigos).elenco.every((j) => j.id > 1_000_000));
    assert.equal(depois.liga.rodadaAtual, 4, 'às 10h o Mundo não joga');
    assert.deepEqual(meu(depois).elenco, meu(antes).elenco, 'o jogo dos amigos não mexe no time');
    assert.equal(meu(depois).saldo, meu(antes).saldo);

    await processarRodadas(banco, DEZ_DA_MANHA + 5 * HORA);
    assert.equal((await dono.liga(criada.id)).liga.rodadaAtual, 3);
    assert.equal((await dono.liga(mundo.id)).liga.rodadaAtual, 5);

    const calendario = await dono.calendario();
    assert.ok(calendario.resultados.some((j) => j.tipo === 'amigos'));
    assert.ok(calendario.resultados.some((j) => j.tipo === 'oficial'));
    assert.ok(calendario.proximos.every((j, i, todos) => i === 0 || todos[i - 1].quando <= j.quando));
    const proximoAmigos = calendario.proximos.find((j) => j.tipo === 'amigos')!;
    const proximoMundo = calendario.proximos.find((j) => j.tipo === 'oficial')!;
    const hora = (ms: number) => new Date(ms - 3 * HORA).getUTCHours();
    assert.ok([10, 15, 20].includes(hora(proximoAmigos.quando)));
    assert.ok([12, 18, 21].includes(hora(proximoMundo.quando)));

    await new Promise((pronto) => { api.close(pronto); });
    await banco.fechar();
  });

  it('Mundo Oficial: 20 técnicos enchem a divisão 1 e o próximo abre a divisão 2', async () => {
    const banco = new BancoSqlite(':memory:');
    const api = criarApi(banco, { relogio: () => MEIO_DIA - HORA, contasPorHora: 1000, contasAnonimas: true });
    await new Promise<void>((pronto) => { api.listen(0, '127.0.0.1', pronto); });
    const base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
    const novo = async () => criarCliente((await criarConta(base)).token, base);
    const clientes = [];
    for (let n = 0; n < 20; n++) clientes.push(await novo());
    const primeiro = await clientes[0].entrarMundo('Clube 0');
    assert.equal(primeiro.liga.divisao, '1');
    assert.equal(primeiro.iniciada, true);
    for (let n = 1; n < 20; n++) assert.equal((await clientes[n].entrarMundo(`Clube ${n}`)).id, primeiro.id);
    assert.equal((await clientes[3].entrarMundo('Clube 3')).liga.clubes.filter((c) => c.donoId).length, 20, 'entrar de novo não ocupa outra vaga');

    const segunda = await (await novo()).entrarMundo('Clube 21');
    assert.equal(segunda.liga.divisao, '2');
    assert.equal(segunda.liga.grupo, 0);
    assert.equal(segunda.liga.temporada, primeiro.liga.temporada);
    const intruso = await novo();
    await intruso.entrarMundo('Intruso FC');
    await assert.rejects(intruso.entrar(segunda.codigo), (e: ErroApi) => e.status === 404);
    assert.equal((await clientes[0].liga(primeiro.id)).liga.descem, 2);

    await new Promise((pronto) => { api.close(pronto); });
    await banco.fechar();
  });
});

describe('limite de contas', () => {
  it('bloqueia abuso e libera na hora seguinte', async () => {
    let agora = MEIO_DIA;
    const banco = new BancoSqlite(':memory:');
    const api = criarApi(banco, { relogio: () => agora, contasPorHora: 3, contasAnonimas: true });
    await new Promise<void>((pronto) => { api.listen(0, '127.0.0.1', pronto); });
    const url = `http://127.0.0.1:${(api.address() as AddressInfo).port}/contas`;
    const criar = async () => (await fetch(url, { method: 'POST' })).status;

    for (let i = 0; i < 3; i++) assert.equal(await criar(), 201);
    assert.equal(await criar(), 429);
    agora += HORA;
    assert.equal(await criar(), 201);

    await new Promise((pronto) => { api.close(pronto); });
    await banco.fechar();
  });
});

describe('cliente do app', () => {
  it('faz o caminho completo: conta, liga, convite, início, rodada e narração', async () => {
    let agora = MEIO_DIA - HORA;
    const banco = new BancoSqlite(':memory:');
    const api = criarApi(banco, { relogio: () => agora, contasPorHora: 100, contasAnonimas: true });
    await new Promise<void>((pronto) => { api.listen(0, '127.0.0.1', pronto); });
    const base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;

    const dono = criarCliente((await criarConta(base)).token, base);
    const amigo = criarCliente((await criarConta(base)).token, base);

    await dono.entrarMundo('Clube do Dono');
    const mundo = await amigo.entrarMundo('Amigos FC');
    const criada = await dono.criarLiga();
    assert.equal(criada.codigo.length, 6);
    const entrou = await amigo.entrar(criada.codigo);
    assert.equal(entrou.souDono, false);
    await assert.rejects(amigo.iniciar(criada.id), (e: ErroApi) => e.status === 403);

    assert.equal((await dono.iniciar(criada.id)).iniciada, true);
    const clube = mundo.liga.clubes.find((c) => c.id === mundo.meuClubeId)!;
    const salva = await amigo.salvarEscalacao(mundo.id, { ...clube.escalacao!, estilo: 'ofensivo' }, false);
    assert.equal(salva.liga.clubes.find((c) => c.id === salva.meuClubeId)!.assistente, false);

    agora = MEIO_DIA;
    await processarRodadas(banco, agora);
    const visao = await amigo.liga(mundo.id);
    assert.equal(visao.liga.rodadaAtual, 2);
    const jogo = visao.liga.partidas.find((p) => p.resultado && (p.casaId === visao.meuClubeId || p.foraId === visao.meuClubeId))!;
    assert.ok((await amigo.partida(mundo.id, jogo.id)).resultado);
    assert.equal((await amigo.ligas()).find((l) => l.tipo === 'amigos')!.tecnicos, 2);

    await new Promise((pronto) => { api.close(pronto); });
    await banco.fechar();
  });

  it('sem servidor, avisa com status 0', async () => {
    await assert.rejects(criarConta('http://127.0.0.1:9'), (e: ErroApi) => e.status === 0);
  });
});

describe('login com Google', () => {
  const VERIFICADOR = 'verificador-secreto-do-aparelho';
  const DESAFIO = createHash('sha256').update(VERIFICADOR).digest('base64url');
  const RETORNO = 'pranchetafc://login';
  let agora = MEIO_DIA;
  let perfil: Record<string, unknown> = {};
  let trocas = 0;

  const idToken = (dados: Record<string, unknown>) =>
    `x.${Buffer.from(JSON.stringify(dados)).toString('base64url')}.y`;

  const banco = new BancoSqlite(':memory:');
  const api = criarApi(banco, {
    relogio: () => agora,
    contasPorHora: 1000,
    contasAnonimas: true,
    google: {
      clientId: 'id-do-app',
      clientSecret: 'segredo',
      urlPublica: 'https://exemplo.test/api',
      esperaMs: 50,
      trocarCodigo: async () => {
        trocas += 1;
        return idToken(perfil);
      },
    },
  });
  let base = '';
  const valido = (sub: string, nome = 'Ana Lima') => ({
    iss: 'https://accounts.google.com', aud: 'id-do-app', exp: agora / 1000 + 600, sub, given_name: nome.split(' ')[0], name: nome,
  });

  const abrir = (caminho: string) => fetch(base + caminho, { redirect: 'manual' });

  async function iniciar(retorno = RETORNO, desafio = DESAFIO) {
    return abrir(`/auth/google/inicio?retorno=${encodeURIComponent(retorno)}&desafio=${desafio}`);
  }

  /** A volta ao app é uma página com um link, e não um redirecionamento. */
  async function destinoDaVolta(volta: Response) {
    assert.equal(volta.status, 200);
    assert.equal(volta.headers.get('cache-control'), 'no-store');
    const href = /<a href="([^"]+)"/.exec(await volta.text())?.[1] as string;
    return new URL(href.replace(/&amp;/g, '&'));
  }

  async function obterCodigo() {
    const google = new URL((await iniciar()).headers.get('location')!);
    const volta = await abrir(`/auth/google/retorno?code=abc&state=${google.searchParams.get('state')}`);
    return (await destinoDaVolta(volta)).searchParams;
  }

  const trocar = (codigo: unknown, verificador: unknown, token?: string) => fetch(`${base}/auth/google/trocar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ codigo, verificador }),
  });

  before(async () => {
    await new Promise<void>((pronto) => { api.listen(0, '127.0.0.1', pronto); });
    base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise((pronto) => { api.close(pronto); });
    await banco.fechar();
  });

  it('manda para o Google com o endereço de retorno certo', async () => {
    const resposta = await iniciar();
    assert.equal(resposta.status, 302);
    const url = new URL(resposta.headers.get('location')!);
    assert.equal(url.hostname, 'accounts.google.com');
    assert.equal(url.searchParams.get('client_id'), 'id-do-app');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://exemplo.test/api/auth/google/retorno');
    assert.equal(url.searchParams.get('scope'), 'openid profile');
    assert.ok(!url.toString().includes('segredo'));
  });

  it('recusa endereço de retorno que não é do app', async () => {
    for (const retorno of ['https://site-do-golpe.test/', 'javascript:alert(1)', 'pranchetafcx://login']) {
      assert.equal((await iniciar(retorno)).status, 400, retorno);
    }
    assert.equal((await iniciar(RETORNO, '')).status, 400);
  });

  it('cria a conta, abre sessão e lembra quem é no próximo login', async () => {
    perfil = valido('google-1');
    const resposta = await trocar((await obterCodigo()).get('codigo'), VERIFICADOR);
    assert.equal(resposta.status, 200);
    const sessao = await resposta.json() as { token: string; nome: string };
    assert.equal(sessao.nome, 'Ana');

    const cliente = criarCliente(sessao.token, base);
    assert.deepEqual(await cliente.eu(), { nome: 'Ana', google: true });
    await cliente.entrarMundo('Clube da Ana');

    const segunda = await (await trocar((await obterCodigo()).get('codigo'), VERIFICADOR)).json() as { token: string };
    assert.notEqual(segunda.token, sessao.token);
    assert.equal((await criarCliente(segunda.token, base).ligas()).length, 1);
  });

  it('o código sozinho não vale: exige o verificador e funciona uma vez só', async () => {
    perfil = valido('google-2');
    const codigo = (await obterCodigo()).get('codigo');
    assert.equal((await trocar(codigo, 'verificador-errado')).status, 401);
    assert.equal((await trocar(codigo, VERIFICADOR)).status, 401);

    const outro = (await obterCodigo()).get('codigo');
    assert.equal((await trocar(outro, VERIFICADOR)).status, 200);
    assert.equal((await trocar(outro, VERIFICADOR)).status, 401);
  });

  it('o código expira', async () => {
    perfil = valido('google-3');
    const codigo = (await obterCodigo()).get('codigo');
    agora += 10 * 60_000;
    assert.equal((await trocar(codigo, VERIFICADOR)).status, 401);
  });

  it('recusa retorno com estado desconhecido ou repetido', async () => {
    assert.equal((await abrir('/auth/google/retorno?code=abc&state=falso')).status, 400);
    const estado = new URL((await iniciar()).headers.get('location')!).searchParams.get('state');
    await abrir(`/auth/google/retorno?code=abc&state=${estado}`);
    const antes = trocas;
    assert.equal((await abrir(`/auth/google/retorno?code=abc&state=${estado}`)).status, 400);
    assert.equal(trocas, antes);
  });

  it('recusa token do Google emitido para outro app, vencido ou de outro emissor', async () => {
    for (const ruim of [
      { ...valido('g'), aud: 'outro-app' },
      { ...valido('g'), exp: agora / 1000 - 1 },
      { ...valido('g'), iss: 'https://golpe.test' },
      { ...valido('g'), sub: undefined },
    ]) {
      perfil = ruim;
      const volta = await obterCodigo();
      assert.equal(volta.get('erro'), '1');
      assert.equal(volta.get('codigo'), null);
    }
  });

  it('quem cancelou no Google volta ao app com erro', async () => {
    const estado = new URL((await iniciar()).headers.get('location')!).searchParams.get('state');
    const volta = await abrir(`/auth/google/retorno?error=access_denied&state=${estado}`);
    assert.equal((await destinoDaVolta(volta)).searchParams.get('erro'), '1');
  });

  it('o app recebe a sessão sem depender da volta pelo navegador', async () => {
    perfil = valido('google-aguarda', 'Bia Souza');
    const aguardar = (verificador: unknown, token?: string) => fetch(`${base}/auth/google/aguardar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ verificador }),
    });
    assert.equal((await aguardar('curto')).status, 400);
    const verificador = 'verificador-so-deste-teste';
    const desafio = createHash('sha256').update(verificador).digest('base64url');
    assert.deepEqual(await (await aguardar(verificador)).json(), { pendente: true });

    const google = new URL((await iniciar(RETORNO, desafio)).headers.get('location')!);
    await abrir(`/auth/google/retorno?code=abc&state=${google.searchParams.get('state')}`);
    const outro = 'x'.repeat(60);
    assert.deepEqual(await (await aguardar(outro)).json(), { pendente: true }, 'outro verificador não recebe a sessão');
    const sessao = (await (await aguardar(verificador)).json()) as { token: string; nome: string };
    assert.equal(sessao.nome, 'Bia');
    assert.equal((await criarCliente(sessao.token, base).eu()).google, true);
    assert.deepEqual(await (await aguardar(verificador)).json(), { pendente: true }, 'a sessão sai uma vez só');
  });

  it('a página de retorno não deixa o endereço virar código', async () => {
    const pagina = paginaDeRetorno('pranchetafc://login?x="></a><script>alert(1)</script>');
    assert.ok(!pagina.includes('<script>alert'));
    assert.equal(pagina.match(/<script>/g)?.length, 1);
    assert.ok(!pagina.split('<script>')[1].slice(0, -30).includes('</script><'));
  });

  it('conta antiga sem Google mantém as ligas ao entrar', async () => {
    const antiga = await criarConta(base);
    const cliente = criarCliente(antiga.token, base);
    await cliente.entrarMundo('Clube Antigo');
    assert.equal((await cliente.eu()).google, false);

    perfil = valido('google-4');
    const resposta = await trocar((await obterCodigo()).get('codigo'), VERIFICADOR, antiga.token);
    const { token } = await resposta.json() as { token: string };
    const logado = criarCliente(token, base);
    assert.equal((await logado.eu()).google, true);
    assert.equal((await logado.ligas())[0].clube, 'Clube Antigo');
  });

  it('sair invalida só a sessão deste aparelho', async () => {
    perfil = valido('google-5');
    const sessao = async () => ((await (await trocar((await obterCodigo()).get('codigo'), VERIFICADOR)).json()) as { token: string }).token;
    const [a, b] = [await sessao(), await sessao()];
    await criarCliente(a, base).sair();
    await assert.rejects(criarCliente(a, base).eu(), (e: ErroApi) => e.status === 401);
    assert.equal((await criarCliente(b, base).eu()).google, true);
  });

  it('com as contas anônimas desligadas, só entra pelo Google', async () => {
    const banco2 = new BancoSqlite(':memory:');
    const fechada = criarApi(banco2);
    await new Promise<void>((pronto) => { fechada.listen(0, '127.0.0.1', pronto); });
    const url = `http://127.0.0.1:${(fechada.address() as AddressInfo).port}`;
    assert.equal((await fetch(`${url}/contas`, { method: 'POST' })).status, 404);
    assert.equal((await fetch(`${url}/auth/google/inicio`)).status, 503);
    await new Promise((pronto) => { fechada.close(pronto); });
    await banco2.fechar();
  });
});
