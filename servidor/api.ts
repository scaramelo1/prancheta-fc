import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { gzipSync } from 'node:zlib';

import { aplicarDecisao, decisaoDoDia } from '../src/dominio/decisoes.ts';
import {
  MAX_TECNICOS, MIN_TECNICOS, adicionarTecnico, criarMataMata, situacaoNoMataMata, sortearChave,
} from '../src/dominio/amigos.ts';
import { clubeDoDono, escalacaoValida, temporadaEncerrada } from '../src/dominio/liga.ts';
import type { Clube, Escalacao, Liga, Partida } from '../src/dominio/tipos.ts';
import {
  ErroTransferencia, comprarDaMaquina, criarLeilao, darLance, ofertasDoDia, venderParaFora,
} from '../src/dominio/transferencias.ts';
import { HORAS_AMIGOS, horasDaLiga, indiceDaJanela, inicioDaJanela, proximoInicio } from './agenda.ts';
import type { Banco, Conta, RegistroLiga } from './banco.ts';
import { emFila } from './fila.ts';
import { entrarNoMundo, timeDaConta } from './mundo.ts';
import { LoginGoogle, paginaDeRetorno } from './google.ts';
import type { ConfigGoogle, UsuarioGoogle } from './google.ts';

const TAMANHO_MAXIMO_CORPO = 16_000;
const LIGAS_POR_CONTA = 3;
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const JOGOS_NO_CALENDARIO = 30;

class ErroHttp extends Error {
  status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

const hashDoToken = (token: string) => createHash('sha256').update(token).digest('hex');

function gerarCodigo() {
  return Array.from({ length: 6 }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join('');
}

function validarNomeClube(valor: unknown) {
  const nome = typeof valor === 'string' ? valor.trim() : '';
  if (nome.length < 3 || nome.length > 24) throw new ErroHttp(400, 'Use de 3 a 24 letras no nome do clube');
  return nome;
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = [];
  let tamanho = 0;
  for await (const parte of req) {
    tamanho += (parte as Buffer).length;
    if (tamanho > TAMANHO_MAXIMO_CORPO) throw new ErroHttp(413, 'Requisição grande demais');
    partes.push(parte as Buffer);
  }
  if (tamanho === 0) return {};
  try {
    const corpo: unknown = JSON.parse(Buffer.concat(partes).toString('utf8'));
    if (typeof corpo === 'object' && corpo !== null) return corpo as Record<string, unknown>;
  } catch {
    // Cai no erro abaixo.
  }
  throw new ErroHttp(400, 'JSON inválido');
}

function responder(req: IncomingMessage, res: ServerResponse, status: number, corpo: unknown) {
  const texto = Buffer.from(JSON.stringify(corpo));
  const comprimir = texto.length > 1024 && String(req.headers['accept-encoding'] ?? '').includes('gzip');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(comprimir ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(comprimir ? gzipSync(texto) : texto);
}

/** Tira a narração dos jogos de outros clubes: é ela que faz a liga pesar quase 1 MB. */
function visaoDaLiga({ id, codigo, donoId, janela, liga }: RegistroLiga, conta: Conta) {
  const clube = clubeDoDono(liga, conta.id);
  return {
    id,
    codigo,
    souDono: donoId === conta.id,
    iniciada: janela !== null,
    meuClubeId: clube?.id ?? null,
    // O time só muda no Mundo Oficial: a liga de amigos não tem decisão nem mercado.
    decisao: clube && liga.tipo === 'oficial' ? decisaoDoDia(liga, clube) : null,
    mercado: liga.tipo === 'oficial' ? ofertasDoDia(liga) : [],
    liga: {
      ...liga,
      partidas: liga.partidas.map((p) => (
        p.resultado && p.casaId !== clube?.id && p.foraId !== clube?.id
          ? { ...p, resultado: { ...p.resultado, eventos: [] } }
          : p
      )),
    },
  };
}

function resumoDaLiga({ id, codigo, donoId, janela, liga }: RegistroLiga, conta: Conta) {
  const clube = clubeDoDono(liga, conta.id);
  return {
    id,
    codigo,
    tipo: liga.tipo,
    souDono: donoId === conta.id,
    iniciada: janela !== null,
    temporada: liga.temporada,
    clube: clube?.nome ?? null,
    situacao: clube && liga.tipo === 'amigos' ? situacaoNoMataMata(liga, clube.id, janela !== null) : null,
    tecnicos: liga.clubes.filter((c) => c.donoId !== null).length,
  };
}

function jogosDaLiga({ id, codigo, janela, liga }: RegistroLiga, conta: Conta) {
  const clube = clubeDoDono(liga, conta.id);
  if (!clube || janela === null) return [];
  const primeira = liga.inicioJanela ?? janela - liga.rodadaAtual + 2;
  const nomeDe = (clubeId: number) => liga.clubes.find((c) => c.id === clubeId)?.nome ?? '';
  const emCasa = (p: Partida) => p.casaId === clube.id;
  return liga.partidas.filter((p) => emCasa(p) || p.foraId === clube.id).map((p) => ({
    ligaId: id,
    tipo: liga.tipo,
    codigo,
    partidaId: p.id,
    quando: inicioDaJanela(primeira + p.rodada - 1, horasDaLiga(liga.tipo === 'oficial')),
    competicao: p.competicao,
    fase: p.fase,
    emCasa: emCasa(p),
    adversario: nomeDe(emCasa(p) ? p.foraId : p.casaId),
    placar: p.resultado && (emCasa(p)
      ? { meus: p.resultado.golsCasa, deles: p.resultado.golsFora }
      : { meus: p.resultado.golsFora, deles: p.resultado.golsCasa }),
  }));
}

export interface OpcoesApi {
  relogio?: () => number;
  contasPorHora?: number;
  /** Conta sem Google: fica desligada no servidor real e serve aos testes. */
  contasAnonimas?: boolean;
  google?: ConfigGoogle;
}

export function criarApi(banco: Banco, opcoes: OpcoesApi = {}): Server {
  const { relogio = Date.now, contasPorHora = 10, contasAnonimas = false, google } = opcoes;
  const login = google ? new LoginGoogle(google, relogio) : null;

  const contasPorIp = new Map<string, { hora: number; total: number }>();

  function limitarContas(req: IncomingMessage) {
    // O servidor só escuta em 127.0.0.1, então este cabeçalho vem do nginx da própria máquina.
    const ip = String(req.headers['x-real-ip'] ?? req.socket.remoteAddress);
    const hora = Math.floor(relogio() / 3_600_000);
    const atual = contasPorIp.get(ip);
    if (!atual || atual.hora !== hora) {
      if (contasPorIp.size > 10_000) contasPorIp.clear();
      contasPorIp.set(ip, { hora, total: 1 });
    } else if (++atual.total > contasPorHora) {
      throw new ErroHttp(429, 'Muitas contas criadas; tente mais tarde');
    }
  }

  function tokenDe(req: IncomingMessage) {
    const [tipo, token] = String(req.headers.authorization ?? '').split(' ');
    return tipo === 'Bearer' && token ? token : null;
  }

  async function contaOpcional(req: IncomingMessage) {
    const token = tokenDe(req);
    return token ? banco.contaPorToken(hashDoToken(token)) : null;
  }

  async function autenticar(req: IncomingMessage): Promise<Conta> {
    const conta = await contaOpcional(req);
    if (!conta) throw new ErroHttp(401, 'Conta não reconhecida');
    await banco.registrarAcesso(conta.id, relogio());
    return conta;
  }

  /** Só quem participa enxerga a liga; para os outros, ela nem existe. */
  async function ligaDoMembro(id: string, conta: Conta) {
    const registro = await banco.ligaPorId(id);
    if (!registro || !clubeDoDono(registro.liga, conta.id)) throw new ErroHttp(404, 'Liga não encontrada');
    return registro;
  }

  /** Mudanças no time só valem no Mundo Oficial: é lá que ele mora. */
  async function ligaDoTime(id: string, conta: Conta) {
    const registro = await ligaDoMembro(id, conta);
    if (registro.liga.tipo !== 'oficial') throw new ErroHttp(409, 'O time é alterado no Mundo Oficial');
    return registro;
  }

  async function timeObrigatorio(conta: Conta) {
    const time = await timeDaConta(banco, conta.id);
    if (!time) throw new ErroHttp(409, 'Crie seu time primeiro');
    return time;
  }

  function abrirSessaoGoogle(usuario: UsuarioGoogle, req: IncomingMessage) {
    return emFila(async () => {
      let conta = await banco.contaPorGoogle(usuario.sub);
      if (!conta) {
        // Quem já jogava neste aparelho mantém as ligas ao entrar com o Google.
        const atual = await contaOpcional(req);
        const id = atual && !atual.google ? atual.id : randomUUID();
        if (id !== atual?.id) await banco.criarConta(id, usuario.nome, hashDoToken(randomBytes(32).toString('base64url')));
        await banco.vincularGoogle(id, usuario.sub, usuario.nome);
        conta = { id, nome: usuario.nome, google: true };
      }
      const token = randomBytes(32).toString('base64url');
      await banco.criarSessao(conta.id, hashDoToken(token));
      return { token, nome: conta.nome };
    });
  }

  async function atender(req: IncomingMessage, res: ServerResponse) {
    const { pathname, searchParams: params } = new URL(req.url ?? '/', 'http://localhost');
    const rota = `${req.method} ${pathname}`;
    const [, , ligaId, recurso, recursoId] = pathname.split('/');
    const ok = (corpo: unknown, status = 200) => responder(req, res, status, corpo);

    if (rota === 'GET /saude') return ok({ ok: true });

    if (rota === 'GET /auth/google/inicio') {
      if (!login) throw new ErroHttp(503, 'Login com Google indisponível');
      const destino = login.iniciar(params.get('retorno'), params.get('desafio'));
      if (!destino) throw new ErroHttp(400, 'Pedido de login inválido');
      res.writeHead(302, { Location: destino, 'Cache-Control': 'no-store' });
      res.end();
      return undefined;
    }

    if (rota === 'GET /auth/google/retorno') {
      if (!login) throw new ErroHttp(503, 'Login com Google indisponível');
      const destino = await login.concluir(params.get('code'), params.get('state'));
      if (!destino) throw new ErroHttp(400, 'Login expirado; tente de novo');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(paginaDeRetorno(destino));
      return undefined;
    }

    if (rota === 'POST /auth/google/trocar') {
      if (!login) throw new ErroHttp(503, 'Login com Google indisponível');
      const { codigo, verificador } = await lerCorpo(req);
      const usuario = login.trocar(String(codigo ?? ''), String(verificador ?? ''));
      if (!usuario) throw new ErroHttp(401, 'Login expirado; tente de novo');
      return ok(await abrirSessaoGoogle(usuario, req));
    }

    if (rota === 'POST /auth/google/aguardar') {
      if (!login) throw new ErroHttp(503, 'Login com Google indisponível');
      const { verificador } = await lerCorpo(req);
      if (typeof verificador !== 'string' || verificador.length < 20 || verificador.length > 128) {
        throw new ErroHttp(400, 'Verificador inválido');
      }
      const usuario = await login.aguardar(verificador);
      return ok(usuario ? await abrirSessaoGoogle(usuario, req) : { pendente: true });
    }

    if (rota === 'POST /contas') {
      if (!contasAnonimas) throw new ErroHttp(404, 'Rota não encontrada');
      limitarContas(req);
      const token = randomBytes(32).toString('base64url');
      const id = randomUUID();
      await banco.criarConta(id, 'Técnico', hashDoToken(token));
      return ok({ id, token }, 201);
    }

    const conta = await autenticar(req);

    if (rota === 'GET /eu') return ok({ nome: conta.nome, google: conta.google });

    if (rota === 'POST /sair') {
      await banco.apagarSessao(hashDoToken(tokenDe(req) as string));
      return ok({ ok: true });
    }

    if (rota === 'GET /ligas') {
      return ok((await banco.ligasDaConta(conta.id)).map((r) => resumoDaLiga(r, conta)));
    }

    if (rota === 'GET /calendario') {
      const ligas = await banco.ligasDaConta(conta.id);
      const jogos = ligas.flatMap((r) => jogosDaLiga(r, conta)).sort((a, b) => a.quando - b.quando);
      return ok({
        proximos: jogos.filter((j) => !j.placar).slice(0, JOGOS_NO_CALENDARIO),
        resultados: jogos.filter((j) => j.placar).slice(-JOGOS_NO_CALENDARIO).reverse(),
      });
    }

    if (rota === 'POST /ligas') {
      const time = await timeObrigatorio(conta);
      const emAndamento = (await banco.ligasDaConta(conta.id))
        .filter((r) => r.donoId === conta.id && !temporadaEncerrada(r.liga));
      if (emAndamento.length >= LIGAS_POR_CONTA) throw new ErroHttp(409, 'Limite de torneios atingido');

      const id = randomUUID();
      const liga = adicionarTecnico(criarMataMata(id, randomInt(2 ** 31)), conta.id, time);
      const registro: RegistroLiga = { id, codigo: gerarCodigo(), donoId: conta.id, janela: null, liga };
      await banco.criarLiga(registro);
      return ok(visaoDaLiga(registro, conta), 201);
    }

    if (rota === 'POST /mundo/entrar') {
      const nome = validarNomeClube((await lerCorpo(req)).nomeClube);
      return ok(await emFila(async () => (
        visaoDaLiga(await entrarNoMundo(banco, conta.id, nome, gerarCodigo, proximoInicio(relogio()) - 1), conta)
      )));
    }

    if (rota === 'POST /ligas/entrar') {
      const { codigo } = await lerCorpo(req);
      return ok(await emFila(async () => {
        const time = await timeObrigatorio(conta);
        const registro = await banco.ligaPorCodigo(String(codigo ?? '').trim().toUpperCase());
        // No Mundo Oficial, a vaga é definida pelo servidor, e não por código.
        if (!registro || registro.liga.tipo === 'oficial') throw new ErroHttp(404, 'Código não encontrado');
        if (clubeDoDono(registro.liga, conta.id)) return visaoDaLiga(registro, conta);
        if (registro.janela !== null) throw new ErroHttp(409, 'O torneio já começou');
        if (registro.liga.clubes.length >= MAX_TECNICOS) throw new ErroHttp(409, 'O torneio está cheio');
        const liga = adicionarTecnico(registro.liga, conta.id, time);
        await banco.salvarLiga(registro.id, liga, registro.janela);
        await banco.entrarNaLiga(registro.id, conta.id);
        return visaoDaLiga({ ...registro, liga }, conta);
      }));
    }

    if (req.method === 'GET' && ligaId && !recurso) {
      return ok(visaoDaLiga(await ligaDoMembro(ligaId, conta), conta));
    }

    if (req.method === 'GET' && ligaId && recurso === 'partidas' && recursoId) {
      const { liga } = await ligaDoMembro(ligaId, conta);
      const partida = liga.partidas.find((p) => p.id === Number(recursoId));
      if (!partida) throw new ErroHttp(404, 'Partida não encontrada');
      return ok(partida);
    }

    /** Aplica uma regra de transferência dentro da fila, para dois técnicos não disputarem o mesmo jogador. */
    const transferir = async (acao: (liga: Liga, clube: Clube, jogadorId: number) => Liga, jogadorId: unknown) => {
      if (!Number.isInteger(jogadorId)) throw new ErroHttp(400, 'Informe o jogador');
      return ok(await emFila(async () => {
        const registro = await ligaDoTime(ligaId, conta);
        try {
          const liga = acao(registro.liga, clubeDoDono(registro.liga, conta.id) as Clube, jogadorId as number);
          await banco.salvarLiga(registro.id, liga, registro.janela);
          return visaoDaLiga({ ...registro, liga }, conta);
        } catch (erro) {
          if (erro instanceof ErroTransferencia) throw new ErroHttp(409, erro.message);
          throw erro;
        }
      }));
    };

    if (rota === `POST /ligas/${ligaId}/mercado/comprar`) {
      const { jogadorId } = await lerCorpo(req);
      return transferir((liga, clube, id) => comprarDaMaquina(liga, clube.id, id), jogadorId);
    }

    if (rota === `POST /ligas/${ligaId}/mercado/vender`) {
      const { jogadorId } = await lerCorpo(req);
      return transferir((liga, clube, id) => venderParaFora(liga, clube.id, id), jogadorId);
    }

    if (rota === `POST /ligas/${ligaId}/leiloes`) {
      const { jogadorId } = await lerCorpo(req);
      return transferir((liga, clube, id) => criarLeilao(liga, clube.id, id), jogadorId);
    }

    if (rota === `POST /ligas/${ligaId}/leiloes/${recursoId}/lances`) {
      const { valor } = await lerCorpo(req);
      return transferir((liga, clube, id) => darLance(liga, clube.id, id, Number(valor)), Number(recursoId));
    }

    if (rota === `POST /ligas/${ligaId}/iniciar`) {
      return ok(await emFila(async () => {
        const registro = await ligaDoMembro(ligaId, conta);
        if (registro.donoId !== conta.id) throw new ErroHttp(403, 'Só quem criou o torneio pode iniciar');
        if (registro.janela !== null) throw new ErroHttp(409, 'O torneio já começou');
        if (registro.liga.clubes.length < MIN_TECNICOS) throw new ErroHttp(409, 'Convide pelo menos um amigo');
        // A janela guardada é a atual, então o primeiro jogo é o próximo horário dos amigos.
        const janela = indiceDaJanela(relogio(), HORAS_AMIGOS);
        const liga = sortearChave(registro.liga);
        await banco.salvarLiga(registro.id, liga, janela);
        return visaoDaLiga({ ...registro, liga, janela }, conta);
      }));
    }

    if (rota === `PUT /ligas/${ligaId}/escalacao`) {
      const { escalacao, assistente } = await lerCorpo(req);
      if (typeof assistente !== 'boolean') throw new ErroHttp(400, 'Informe o assistente');
      return ok(await emFila(async () => {
        const registro = await ligaDoTime(ligaId, conta);
        const clube = clubeDoDono(registro.liga, conta.id);
        if (!clube || !escalacaoValida(clube, escalacao as Escalacao)) throw new ErroHttp(400, 'Escalação inválida');
        const liga = {
          ...registro.liga,
          clubes: registro.liga.clubes.map((c) => (
            c.id === clube.id ? { ...c, escalacao: escalacao as Escalacao, assistente } : c
          )),
        };
        await banco.salvarLiga(registro.id, liga, registro.janela);
        return visaoDaLiga({ ...registro, liga }, conta);
      }));
    }

    if (rota === `POST /ligas/${ligaId}/decisao`) {
      const { aceitar } = await lerCorpo(req);
      if (typeof aceitar !== 'boolean') throw new ErroHttp(400, 'Informe a resposta');
      return ok(await emFila(async () => {
        const registro = await ligaDoTime(ligaId, conta);
        const clube = clubeDoDono(registro.liga, conta.id);
        const decisao = clube ? decisaoDoDia(registro.liga, clube) : null;
        if (!clube || !decisao) throw new ErroHttp(409, 'Não há decisão para hoje');
        const liga = aplicarDecisao(registro.liga, clube.id, decisao, aceitar);
        await banco.salvarLiga(registro.id, liga, registro.janela);
        return visaoDaLiga({ ...registro, liga }, conta);
      }));
    }

    throw new ErroHttp(404, 'Rota não encontrada');
  }

  return createServer((req, res) => {
    atender(req, res).catch((erro: unknown) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (erro instanceof ErroHttp) {
        responder(req, res, erro.status, { erro: erro.message });
        return;
      }
      console.error(erro);
      responder(req, res, 500, { erro: 'Erro interno' });
    });
  });
}
