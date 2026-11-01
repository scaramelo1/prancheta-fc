import type { SituacaoNoMataMata } from '../dominio/amigos.ts';
import type { Decisao } from '../dominio/decisoes.ts';
import type { Competicao, Escalacao, Fase, Liga, Partida, TipoCampeonato } from '../dominio/tipos.ts';
import type { Oferta } from '../dominio/transferencias.ts';

export const URL_API = 'https://fsadesigners.com.br/prancheta-api';

export interface ResumoLiga {
  id: string;
  codigo: string;
  tipo: TipoCampeonato;
  souDono: boolean;
  iniciada: boolean;
  temporada: number;
  clube: string | null;
  /** Só no mata-mata de amigos. */
  situacao: SituacaoNoMataMata | null;
  tecnicos: number;
}

export interface JogoDoCalendario {
  ligaId: string;
  tipo: TipoCampeonato;
  codigo: string;
  partidaId: number;
  /** Milissegundos desde 1970. */
  quando: number;
  competicao: Competicao;
  fase: Fase;
  emCasa: boolean;
  adversario: string;
  placar: { meus: number; deles: number } | null;
}

export interface Calendario {
  proximos: JogoDoCalendario[];
  resultados: JogoDoCalendario[];
}

export interface VisaoLiga {
  id: string;
  codigo: string;
  souDono: boolean;
  iniciada: boolean;
  meuClubeId: number | null;
  decisao: Decisao | null;
  mercado: Oferta[];
  liga: Liga;
}

export class ErroApi extends Error {
  status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

/** Sem resposta do servidor não há status: 0 significa falta de internet ou servidor fora do ar. */
async function pedir<T>(base: string, caminho: string, token: string | null, metodo = 'GET', corpo?: unknown): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(base + caminho, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão');
  }
  const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
  if (!resposta.ok) throw new ErroApi(resposta.status, dados.erro ?? 'Erro no servidor');
  return dados as T;
}

export interface Sessao {
  token: string;
  nome: string;
}

export const urlDoLogin = (retorno: string, desafio: string, base = URL_API) =>
  `${base}/auth/google/inicio?retorno=${encodeURIComponent(retorno)}&desafio=${encodeURIComponent(desafio)}`;

/** Espera o login no navegador terminar. O token atual preserva as ligas de quem já jogava. */
export const aguardarLoginGoogle = (verificador: string, tokenAtual: string | null, base = URL_API) =>
  pedir<Sessao | { pendente: true }>(base, '/auth/google/aguardar', tokenAtual, 'POST', { verificador });

export const criarConta = (base = URL_API) => pedir<{ id: string; token: string }>(base, '/contas', null, 'POST');

export function criarCliente(token: string, base = URL_API) {
  return {
    eu: () => pedir<{ nome: string; google: boolean }>(base, '/eu', token),
    sair: () => pedir<{ ok: boolean }>(base, '/sair', token, 'POST'),
    ligas: () => pedir<ResumoLiga[]>(base, '/ligas', token),
    liga: (id: string) => pedir<VisaoLiga>(base, `/ligas/${id}`, token),
    partida: (ligaId: string, id: number) => pedir<Partida>(base, `/ligas/${ligaId}/partidas/${id}`, token),
    calendario: () => pedir<Calendario>(base, '/calendario', token),
    criarLiga: () => pedir<VisaoLiga>(base, '/ligas', token, 'POST'),
    entrar: (codigo: string) => pedir<VisaoLiga>(base, '/ligas/entrar', token, 'POST', { codigo }),
    entrarMundo: (nomeClube: string) => pedir<VisaoLiga>(base, '/mundo/entrar', token, 'POST', { nomeClube }),
    iniciar: (id: string) => pedir<VisaoLiga>(base, `/ligas/${id}/iniciar`, token, 'POST'),
    salvarEscalacao: (id: string, escalacao: Escalacao, assistente: boolean) =>
      pedir<VisaoLiga>(base, `/ligas/${id}/escalacao`, token, 'PUT', { escalacao, assistente }),
    decidir: (id: string, aceitar: boolean) => pedir<VisaoLiga>(base, `/ligas/${id}/decisao`, token, 'POST', { aceitar }),
    comprar: (id: string, jogadorId: number) =>
      pedir<VisaoLiga>(base, `/ligas/${id}/mercado/comprar`, token, 'POST', { jogadorId }),
    vender: (id: string, jogadorId: number) =>
      pedir<VisaoLiga>(base, `/ligas/${id}/mercado/vender`, token, 'POST', { jogadorId }),
    leiloar: (id: string, jogadorId: number) =>
      pedir<VisaoLiga>(base, `/ligas/${id}/leiloes`, token, 'POST', { jogadorId }),
    darLance: (id: string, jogadorId: number, valor: number) =>
      pedir<VisaoLiga>(base, `/ligas/${id}/leiloes/${jogadorId}/lances`, token, 'POST', { valor }),
  };
}

export type Cliente = ReturnType<typeof criarCliente>;
