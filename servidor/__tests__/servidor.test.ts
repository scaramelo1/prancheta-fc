/// <reference types="node" />
import { createHash } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { ErroApi, criarCliente, criarConta } from '../../src/api/cliente.ts';
import { indiceDaJanela, janelaDoMeioDia, proximoInicio } from '../agenda.ts';
import { criarApi } from '../api.ts';
import { BancoSqlite } from '../banco.ts';
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

  it('valida os dados da liga', async () => {
    const token = await novaConta();
    assert.equal((await chamar('POST', '/ligas', token, { nomeClube: 'x' })).status, 400);
    assert.equal((await chamar('POST', '/ligas', token, { nomeClube: 'Teste FC', dificuldade: 'absurda' })).status, 400);
  });

  it('limita as ligas criadas por conta', async () => {
    const token = await novaConta();
    for (let i = 0; i < 3; i++) assert.equal((await chamar('POST', '/ligas', token, { nomeClube: 'Teste FC' })).status, 201);
    assert.equal((await chamar('POST', '/ligas', token, { nomeClube: 'Teste FC' })).status, 409);
  });

  it('amigo entra pelo código, assume um clube da máquina e a liga fica com 20 clubes', async () => {
    const dono = await novaConta();
    const amigo = await novaConta();
    const { corpo: criada } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });

    assert.equal((await chamar('POST', '/ligas/entrar', amigo, { codigo: 'ERRADO', nomeClube: 'Amigos FC' })).status, 404);
    const { corpo: entrou } = await chamar('POST', '/ligas/entrar', amigo, { codigo: criada.codigo.toLowerCase(), nomeClube: 'Amigos FC' });

    assert.equal(entrou.liga.clubes.length, 20);
    assert.equal(entrou.liga.clubes.filter((c: any) => c.donoId !== null).length, 2);
    assert.equal(entrou.liga.clubes.find((c: any) => c.id === entrou.meuClubeId).nome, 'Amigos FC');
    assert.equal(entrou.souDono, false);
    const lista = (await chamar('GET', '/ligas', amigo)).corpo;
    assert.deepEqual([lista.length, lista[0].clube, lista[0].tecnicos], [1, 'Amigos FC', 2]);
  });

  it('entrar duas vezes não ocupa outro clube', async () => {
    const dono = await novaConta();
    const { corpo: criada } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    const { corpo } = await chamar('POST', '/ligas/entrar', dono, { codigo: criada.codigo, nomeClube: 'Outro Nome' });
    assert.equal(corpo.liga.clubes.filter((c: any) => c.donoId !== null).length, 1);
  });

  it('transferências: compra, venda e leilão pela API', async () => {
    const dono = await novaConta();
    const amigo = await novaConta();
    const { corpo: criada } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    await chamar('POST', '/ligas/entrar', amigo, { codigo: criada.codigo, nomeClube: 'Amigos FC' });
    const rota = `/ligas/${criada.id}`;

    const { corpo: visao } = await chamar('GET', rota, dono);
    assert.equal(visao.mercado.length, 18);
    const oferta = visao.mercado[0];
    const { status, corpo: comprou } = await chamar('POST', `${rota}/mercado/comprar`, dono, { jogadorId: oferta.jogador.id });
    assert.equal(status, 200);
    assert.equal(comprou.liga.clubes.find((c: any) => c.id === comprou.meuClubeId).elenco.length, 23);
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
    assert.equal(venda.corpo.liga.transferencias[0].paraId, null);
    assert.equal((await chamar('POST', `${rota}/mercado/vender`, await novaConta(), { jogadorId: 1 })).status, 404);
  });

  it('quem não participa não vê a liga', async () => {
    const dono = await novaConta();
    const { corpo } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    assert.equal((await chamar('GET', `/ligas/${corpo.id}`, await novaConta())).status, 404);
  });

  it('só o dono inicia, e uma vez só', async () => {
    const dono = await novaConta();
    const amigo = await novaConta();
    const { corpo: criada } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    await chamar('POST', '/ligas/entrar', amigo, { codigo: criada.codigo, nomeClube: 'Amigos FC' });
    assert.equal((await chamar('POST', `/ligas/${criada.id}/iniciar`, amigo)).status, 403);
    assert.equal((await chamar('POST', `/ligas/${criada.id}/iniciar`, dono)).corpo.iniciada, true);
    assert.equal((await chamar('POST', `/ligas/${criada.id}/iniciar`, dono)).status, 409);
  });

  it('aceita escalação válida e recusa jogador de outro clube, repetido ou faltando', async () => {
    const dono = await novaConta();
    const { corpo } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    const clube = corpo.liga.clubes.find((c: any) => c.id === corpo.meuClubeId);
    const rival = corpo.liga.clubes.find((c: any) => c.id !== corpo.meuClubeId);
    const { escalacao } = clube;
    const url = `/ligas/${corpo.id}/escalacao`;
    const enviar = (e: unknown) => chamar('PUT', url, dono, { escalacao: e, assistente: false });

    const trocada = { ...escalacao, estilo: 'ofensivo' };
    const salva = await enviar(trocada);
    assert.equal(salva.status, 200);
    assert.equal(salva.corpo.liga.clubes[0].escalacao.estilo, 'ofensivo');
    assert.equal(salva.corpo.liga.clubes[0].assistente, false);

    const repetido = { ...escalacao, titulares: escalacao.titulares.map((t: any) => ({ ...t, jogadorId: escalacao.titulares[0].jogadorId })) };
    const deFora = { ...escalacao, titulares: [{ ...escalacao.titulares[0], jogadorId: rival.elenco[0].id }, ...escalacao.titulares.slice(1)] };
    assert.equal((await enviar(repetido)).status, 400);
    assert.equal((await enviar(deFora)).status, 400);
    assert.equal((await enviar({ ...escalacao, titulares: escalacao.titulares.slice(1) })).status, 400);
    assert.equal((await enviar({ ...escalacao, formacao: '1-1-8' })).status, 400);
    assert.equal((await enviar(null)).status, 400);
  });

  it('responde à decisão do dia uma vez', async () => {
    const dono = await novaConta();
    const { corpo } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    assert.ok(corpo.decisao);
    const url = `/ligas/${corpo.id}/decisao`;
    assert.equal((await chamar('POST', url, dono, { aceitar: false })).corpo.decisao, null);
    assert.equal((await chamar('POST', url, dono, { aceitar: false })).status, 409);
  });

  it('recusa JSON inválido e corpo grande demais', async () => {
    const token = await novaConta();
    const invalido = await fetch(`${base}/ligas`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{' });
    assert.equal(invalido.status, 400);
    assert.equal((await chamar('POST', '/ligas', token, { nomeClube: 'x'.repeat(20_000) })).status, 413);
  });

  it('nunca grava o token em texto puro', async () => {
    const { corpo } = await chamar('POST', '/contas');
    assert.equal(await banco.contaPorToken(corpo.token), null);
  });

  it('joga cada horário uma vez, recupera os perdidos e só mostra a narração do próprio jogo', async () => {
    agora = MEIO_DIA - HORA;
    const dono = await novaConta();
    const { corpo: criada } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    await chamar('POST', `/ligas/${criada.id}/iniciar`, dono);
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
  });

  it('não joga liga que o dono ainda não iniciou', async () => {
    const dono = await novaConta();
    const { corpo } = await chamar('POST', '/ligas', dono, { nomeClube: 'Clube do Dono' });
    await processarRodadas(banco, MEIO_DIA + 100 * HORA);
    assert.equal((await chamar('GET', `/ligas/${corpo.id}`, dono)).corpo.liga.rodadaAtual, 1);
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

    const criada = await dono.criarLiga('Clube do Dono', 'torneio', 'facil');
    assert.equal(criada.codigo.length, 6);
    const entrou = await amigo.entrar(criada.codigo, 'Amigos FC');
    assert.equal(entrou.souDono, false);
    await assert.rejects(amigo.iniciar(criada.id), (e: ErroApi) => e.status === 403);

    assert.equal((await dono.iniciar(criada.id)).iniciada, true);
    const clube = entrou.liga.clubes.find((c) => c.id === entrou.meuClubeId)!;
    const salva = await amigo.salvarEscalacao(criada.id, { ...clube.escalacao!, estilo: 'ofensivo' }, false);
    assert.equal(salva.liga.clubes.find((c) => c.id === salva.meuClubeId)!.assistente, false);

    agora = MEIO_DIA;
    await processarRodadas(banco, agora);
    const visao = await amigo.liga(criada.id);
    assert.equal(visao.liga.rodadaAtual, 2);
    const jogo = visao.liga.partidas.find((p) => p.resultado && (p.casaId === visao.meuClubeId || p.foraId === visao.meuClubeId))!;
    assert.ok((await amigo.partida(criada.id, jogo.id)).resultado);
    assert.equal((await amigo.ligas())[0].tecnicos, 2);

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

  async function obterCodigo() {
    const google = new URL((await iniciar()).headers.get('location')!);
    const volta = await abrir(`/auth/google/retorno?code=abc&state=${google.searchParams.get('state')}`);
    return new URL(volta.headers.get('location')!).searchParams;
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
    await cliente.criarLiga('Clube da Ana', 'torneio', 'normal');

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
    assert.equal(new URL(volta.headers.get('location')!).searchParams.get('erro'), '1');
  });

  it('conta antiga sem Google mantém as ligas ao entrar', async () => {
    const antiga = await criarConta(base);
    const cliente = criarCliente(antiga.token, base);
    await cliente.criarLiga('Clube Antigo', 'torneio', 'normal');
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
