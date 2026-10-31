import type { Decisao } from '../dominio/decisoes.ts';
import type { Dificuldade, DuracaoLiga, Escalacao, Liga, Partida } from '../dominio/tipos.ts';

export const URL_API = 'https://fsadesigners.com.br/prancheta-api';

export interface ResumoLiga {
  id: string;
  codigo: string;
  iniciada: boolean;
  temporada: number;
  clube: string | null;
  tecnicos: number;
}

export interface VisaoLiga {
  id: string;
  codigo: string;
  souDono: boolean;
  iniciada: boolean;
  meuClubeId: number | null;
  decisao: Decisao | null;
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

export const criarConta = (base = URL_API) => pedir<{ id: string; token: string }>(base, '/contas', null, 'POST');

export function criarCliente(token: string, base = URL_API) {
  return {
    ligas: () => pedir<ResumoLiga[]>(base, '/ligas', token),
    liga: (id: string) => pedir<VisaoLiga>(base, `/ligas/${id}`, token),
    partida: (ligaId: string, id: number) => pedir<Partida>(base, `/ligas/${ligaId}/partidas/${id}`, token),
    criarLiga: (nomeClube: string, duracao: DuracaoLiga, dificuldade: Dificuldade) =>
      pedir<VisaoLiga>(base, '/ligas', token, 'POST', { nomeClube, duracao, dificuldade }),
    entrar: (codigo: string, nomeClube: string) =>
      pedir<VisaoLiga>(base, '/ligas/entrar', token, 'POST', { codigo, nomeClube }),
    iniciar: (id: string) => pedir<VisaoLiga>(base, `/ligas/${id}/iniciar`, token, 'POST'),
    salvarEscalacao: (id: string, escalacao: Escalacao, assistente: boolean) =>
      pedir<VisaoLiga>(base, `/ligas/${id}/escalacao`, token, 'PUT', { escalacao, assistente }),
    decidir: (id: string, aceitar: boolean) => pedir<VisaoLiga>(base, `/ligas/${id}/decisao`, token, 'POST', { aceitar }),
  };
}

export type Cliente = ReturnType<typeof criarCliente>;
