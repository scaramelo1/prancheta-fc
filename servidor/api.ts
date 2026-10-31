import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { gzipSync } from 'node:zlib';

import { aplicarDecisao, decisaoDoDia } from '../src/dominio/decisoes.ts';
import { clubeDoDono, criarLiga, entrarNaLiga, escalacaoValida } from '../src/dominio/liga.ts';
import type { Clube, Dificuldade, DuracaoLiga, Escalacao, Liga } from '../src/dominio/tipos.ts';
import {
  ErroTransferencia, comprarDaMaquina, criarLeilao, darLance, ofertasDoDia, venderParaFora,
} from '../src/dominio/transferencias.ts';
import { proximoInicio } from './agenda.ts';
import type { Banco, Conta, RegistroLiga } from './banco.ts';
import { emFila } from './fila.ts';
import { LoginGoogle } from './google.ts';
import type { ConfigGoogle } from './google.ts';

const TAMANHO_MAXIMO_CORPO = 16_000;
const LIGAS_POR_CONTA = 3;
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DIFICULDADES: Dificuldade[] = ['facil', 'normal', 'dificil'];
const DURACOES: DuracaoLiga[] = ['torneio', 'temporada'];

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
    decisao: clube ? decisaoDoDia(liga, clube) : null,
    mercado: ofertasDoDia(liga),
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

function resumoDaLiga({ id, codigo, janela, liga }: RegistroLiga, conta: Conta) {
  return {
    id,
    codigo,
    iniciada: janela !== null,
    temporada: liga.temporada,
    clube: clubeDoDono(liga, conta.id)?.nome ?? null,
    tecnicos: liga.clubes.filter((c) => c.donoId !== null).length,
  };
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
    return conta;
  }

  /** Só quem participa enxerga a liga; para os outros, ela nem existe. */
  async function ligaDoMembro(id: string, conta: Conta) {
    const registro = await banco.ligaPorId(id);
    if (!registro || !clubeDoDono(registro.liga, conta.id)) throw new ErroHttp(404, 'Liga não encontrada');
    return registro;
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
      res.writeHead(302, { Location: destino, 'Cache-Control': 'no-store' });
      res.end();
      return undefined;
    }

    if (rota === 'POST /auth/google/trocar') {
      if (!login) throw new ErroHttp(503, 'Login com Google indisponível');
      const { codigo, verificador } = await lerCorpo(req);
      const usuario = login.trocar(String(codigo ?? ''), String(verificador ?? ''));
      if (!usuario) throw new ErroHttp(401, 'Login expirado; tente de novo');

      return ok(await emFila(async () => {
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
      }));
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

    if (rota === 'POST /ligas') {
      const { nomeClube, dificuldade = 'normal', duracao = 'temporada' } = await lerCorpo(req);
      const nome = validarNomeClube(nomeClube);
      if (!DIFICULDADES.includes(dificuldade as Dificuldade)) throw new ErroHttp(400, 'Dificuldade inválida');
      if (!DURACOES.includes(duracao as DuracaoLiga)) throw new ErroHttp(400, 'Duração inválida');
      if (await banco.contarLigasCriadas(conta.id) >= LIGAS_POR_CONTA) throw new ErroHttp(409, 'Limite de ligas atingido');

      const id = randomUUID();
      const liga: Liga = criarLiga(id, {
        nomeClube: nome,
        donoId: conta.id,
        dificuldade: dificuldade as Dificuldade,
        duracao: duracao as DuracaoLiga,
        semente: randomInt(2 ** 31),
      });
      const registro: RegistroLiga = { id, codigo: gerarCodigo(), donoId: conta.id, janela: null, liga };
      await banco.criarLiga(registro);
      return ok(visaoDaLiga(registro, conta), 201);
    }

    if (rota === 'POST /ligas/entrar') {
      const { codigo, nomeClube } = await lerCorpo(req);
      const nome = validarNomeClube(nomeClube);
      return ok(await emFila(async () => {
        const registro = await banco.ligaPorCodigo(String(codigo ?? '').trim().toUpperCase());
        if (!registro) throw new ErroHttp(404, 'Código não encontrado');
        if (clubeDoDono(registro.liga, conta.id)) return visaoDaLiga(registro, conta);
        if (registro.liga.clubes.every((c) => c.donoId !== null)) throw new ErroHttp(409, 'A liga está cheia');
        const liga = entrarNaLiga(registro.liga, conta.id, nome);
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
        const registro = await ligaDoMembro(ligaId, conta);
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
        if (registro.donoId !== conta.id) throw new ErroHttp(403, 'Só quem criou a liga pode iniciar');
        if (registro.janela !== null) throw new ErroHttp(409, 'A liga já começou');
        // A janela guardada é a anterior ao primeiro jogo, que será a próxima às 12h.
        const janela = proximoInicio(relogio()) - 1;
        await banco.salvarLiga(registro.id, registro.liga, janela);
        return visaoDaLiga({ ...registro, janela }, conta);
      }));
    }

    if (rota === `PUT /ligas/${ligaId}/escalacao`) {
      const { escalacao, assistente } = await lerCorpo(req);
      if (typeof assistente !== 'boolean') throw new ErroHttp(400, 'Informe o assistente');
      return ok(await emFila(async () => {
        const registro = await ligaDoMembro(ligaId, conta);
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
        const registro = await ligaDoMembro(ligaId, conta);
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
