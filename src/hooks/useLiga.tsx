import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { ErroApi, criarCliente, criarConta } from '../api/cliente';
import type { Cliente, ResumoLiga, VisaoLiga } from '../api/cliente';
import { lerConfig, salvarConfig } from '../db/repositorio';
import { clubePorId } from '../dominio/liga';
import type { Clube, Dificuldade, DuracaoLiga, Escalacao, Liga } from '../dominio/tipos';
import { t } from '../i18n';

const CHAVE_TOKEN = 'token';
const CHAVE_LIGA = 'liga';

interface ValorLiga {
  pronta: boolean;
  semConexao: boolean;
  cliente: Cliente | null;
  ligas: ResumoLiga[];
  visao: VisaoLiga | null;
  liga: Liga | null;
  meuClube: Clube | null;
  recarregar: () => Promise<void>;
  selecionar: (id: string) => Promise<void>;
  criar: (nomeClube: string, duracao: DuracaoLiga, dificuldade: Dificuldade) => Promise<void>;
  entrar: (codigo: string, nomeClube: string) => Promise<void>;
  iniciar: () => void;
  salvarEscalacao: (escalacao: Escalacao, assistente: boolean) => void;
  decidir: (aceitar: boolean) => void;
}

const Contexto = createContext<ValorLiga | null>(null);

const mensagemDe = (erro: unknown) =>
  (erro instanceof ErroApi && erro.status > 0 ? erro.message : t.erroConexao);

export function ProvedorLiga({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [pronta, setPronta] = useState(false);
  const [semConexao, setSemConexao] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ligas, setLigas] = useState<ResumoLiga[]>([]);
  const [visao, setVisao] = useState<VisaoLiga | null>(null);
  const clienteRef = useRef<Cliente | null>(null);
  const ligaAberta = useRef<string | null>(null);

  /** A conta nasce no primeiro acesso, sem cadastro; o token fica guardado no aparelho. */
  const obterCliente = useCallback(async () => {
    if (clienteRef.current) return clienteRef.current;
    let token = await lerConfig(db, CHAVE_TOKEN);
    if (!token) {
      ({ token } = await criarConta());
      await salvarConfig(db, CHAVE_TOKEN, token);
    }
    clienteRef.current = criarCliente(token);
    setCliente(clienteRef.current);
    return clienteRef.current;
  }, [db]);

  const aplicar = useCallback((nova: VisaoLiga) => {
    ligaAberta.current = nova.id;
    setVisao(nova);
    salvarConfig(db, CHAVE_LIGA, nova.id);
  }, [db]);

  const recarregar = useCallback(async () => {
    try {
      const api = await obterCliente();
      const lista = await api.ligas();
      setLigas(lista);
      const salva = ligaAberta.current ?? await lerConfig(db, CHAVE_LIGA);
      const id = lista.some((l) => l.id === salva) ? salva : lista[0]?.id;
      if (id) aplicar(await api.liga(id));
      else setVisao(null);
      setSemConexao(false);
    } catch {
      setSemConexao(true);
    } finally {
      setPronta(true);
    }
  }, [aplicar, db, obterCliente]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const selecionar = useCallback(async (id: string) => {
    try {
      const api = await obterCliente();
      aplicar(await api.liga(id));
    } catch (erro) {
      Alert.alert(mensagemDe(erro));
    }
  }, [aplicar, obterCliente]);

  /** Criar e entrar devolvem o erro para o formulário, que continua aberto. */
  const criar = useCallback(async (nomeClube: string, duracao: DuracaoLiga, dificuldade: Dificuldade) => {
    try {
      const api = await obterCliente();
      aplicar(await api.criarLiga(nomeClube, duracao, dificuldade));
      setLigas(await api.ligas());
    } catch (erro) {
      throw new Error(mensagemDe(erro));
    }
  }, [aplicar, obterCliente]);

  const entrar = useCallback(async (codigo: string, nomeClube: string) => {
    try {
      const api = await obterCliente();
      aplicar(await api.entrar(codigo, nomeClube));
      setLigas(await api.ligas());
    } catch (erro) {
      throw new Error(mensagemDe(erro));
    }
  }, [aplicar, obterCliente]);

  const executar = useCallback(async (acao: (api: Cliente, id: string) => Promise<VisaoLiga>) => {
    const id = ligaAberta.current;
    const api = clienteRef.current;
    if (!id || !api) return;
    try {
      aplicar(await acao(api, id));
    } catch (erro) {
      Alert.alert(mensagemDe(erro));
      recarregar();
    }
  }, [aplicar, recarregar]);

  const iniciar = useCallback(() => {
    executar((api, id) => api.iniciar(id));
  }, [executar]);

  const salvarEscalacao = useCallback((escalacao: Escalacao, assistente: boolean) => {
    // Mostra a troca na hora; se o servidor recusar, o recarregamento desfaz.
    setVisao((atual) => atual && {
      ...atual,
      liga: {
        ...atual.liga,
        clubes: atual.liga.clubes.map((c) => (c.id === atual.meuClubeId ? { ...c, escalacao, assistente } : c)),
      },
    });
    executar((api, id) => api.salvarEscalacao(id, escalacao, assistente));
  }, [executar]);

  const decidir = useCallback((aceitar: boolean) => {
    executar((api, id) => api.decidir(id, aceitar));
  }, [executar]);

  const valor = useMemo<ValorLiga>(() => ({
    pronta,
    semConexao,
    cliente,
    ligas,
    visao,
    liga: visao?.liga ?? null,
    meuClube: visao && visao.meuClubeId !== null ? clubePorId(visao.liga, visao.meuClubeId) : null,
    recarregar,
    selecionar,
    criar,
    entrar,
    iniciar,
    salvarEscalacao,
    decidir,
  }), [cliente, criar, decidir, entrar, iniciar, ligas, pronta, recarregar, salvarEscalacao, selecionar, semConexao, visao]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useLiga() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useLiga precisa estar dentro de ProvedorLiga');
  return valor;
}
