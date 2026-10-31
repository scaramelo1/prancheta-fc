import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { useSQLiteContext } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { ErroApi, criarCliente, trocarLoginGoogle, urlDoLogin } from '../api/cliente';
import type { Cliente, ResumoLiga, VisaoLiga } from '../api/cliente';
import { apagarConfig, lerConfig, salvarConfig } from '../db/repositorio';
import { clubePorId } from '../dominio/liga';
import type { Clube, Dificuldade, DuracaoLiga, Escalacao, Liga } from '../dominio/tipos';
import { t } from '../i18n';

const CHAVE_TOKEN = 'token';
const CHAVE_LIGA = 'liga';

interface ValorLiga {
  pronta: boolean;
  semConexao: boolean;
  /** Null até entrar com o Google. */
  nomeTecnico: string | null;
  cliente: Cliente | null;
  ligas: ResumoLiga[];
  visao: VisaoLiga | null;
  liga: Liga | null;
  meuClube: Clube | null;
  entrarComGoogle: () => Promise<void>;
  sair: () => Promise<void>;
  recarregar: () => Promise<void>;
  selecionar: (id: string) => Promise<void>;
  criar: (nomeClube: string, duracao: DuracaoLiga, dificuldade: Dificuldade) => Promise<void>;
  entrar: (codigo: string, nomeClube: string) => Promise<void>;
  iniciar: () => void;
  salvarEscalacao: (escalacao: Escalacao, assistente: boolean) => void;
  decidir: (aceitar: boolean) => void;
  comprar: (jogadorId: number) => void;
  vender: (jogadorId: number) => void;
  leiloar: (jogadorId: number) => void;
  darLance: (jogadorId: number, valor: number) => void;
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
  const [nomeTecnico, setNomeTecnico] = useState<string | null>(null);
  const clienteRef = useRef<Cliente | null>(null);
  const ligaAberta = useRef<string | null>(null);

  const abrirSessao = useCallback((token: string) => {
    clienteRef.current = criarCliente(token);
    setCliente(clienteRef.current);
    return clienteRef.current;
  }, []);

  const fecharSessao = useCallback(async () => {
    await apagarConfig(db, CHAVE_TOKEN);
    await apagarConfig(db, CHAVE_LIGA);
    clienteRef.current = null;
    ligaAberta.current = null;
    setCliente(null);
    setNomeTecnico(null);
    setLigas([]);
    setVisao(null);
  }, [db]);

  const obterCliente = useCallback(async () => {
    if (clienteRef.current) return clienteRef.current;
    const token = await lerConfig(db, CHAVE_TOKEN);
    return token ? abrirSessao(token) : null;
  }, [abrirSessao, db]);

  const clienteLogado = useCallback(async () => {
    const api = await obterCliente();
    if (!api) throw new ErroApi(401, t.erroConexao);
    return api;
  }, [obterCliente]);

  const aplicar = useCallback((nova: VisaoLiga) => {
    ligaAberta.current = nova.id;
    setVisao(nova);
    salvarConfig(db, CHAVE_LIGA, nova.id);
  }, [db]);

  const recarregar = useCallback(async () => {
    try {
      const api = await obterCliente();
      if (!api) return;
      const eu = await api.eu();
      // Conta antiga, sem Google: o token fica guardado para levar as ligas ao entrar.
      if (!eu.google) return;
      setNomeTecnico(eu.nome);
      const lista = await api.ligas();
      setLigas(lista);
      const salva = ligaAberta.current ?? await lerConfig(db, CHAVE_LIGA);
      const id = lista.some((l) => l.id === salva) ? salva : lista[0]?.id;
      if (id) aplicar(await api.liga(id));
      else setVisao(null);
      setSemConexao(false);
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 401) await fecharSessao();
      else setSemConexao(true);
    } finally {
      setPronta(true);
    }
  }, [aplicar, db, fecharSessao, obterCliente]);

  const entrarComGoogle = useCallback(async () => {
    // O código só vale junto com o verificador, que nunca sai do aparelho.
    const verificador = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verificador, {
      encoding: Crypto.CryptoEncoding.BASE64,
    });
    const desafio = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const retorno = Linking.createURL('login');

    const resposta = await WebBrowser.openAuthSessionAsync(urlDoLogin(retorno, desafio), retorno);
    if (resposta.type !== 'success') return;
    const codigo = Linking.parse(resposta.url).queryParams?.codigo;
    if (typeof codigo !== 'string') throw new Error(t.erroLogin);

    try {
      const { token } = await trocarLoginGoogle(codigo, verificador, await lerConfig(db, CHAVE_TOKEN));
      await salvarConfig(db, CHAVE_TOKEN, token);
      abrirSessao(token);
      setPronta(false);
      await recarregar();
    } catch {
      throw new Error(t.erroLogin);
    }
  }, [abrirSessao, db, recarregar]);

  const sair = useCallback(async () => {
    await clienteRef.current?.sair().catch(() => undefined);
    await fecharSessao();
  }, [fecharSessao]);

  const selecionar = useCallback(async (id: string) => {
    try {
      const api = await clienteLogado();
      aplicar(await api.liga(id));
    } catch (erro) {
      Alert.alert(mensagemDe(erro));
    }
  }, [aplicar, clienteLogado]);

  /** Criar e entrar devolvem o erro para o formulário, que continua aberto. */
  const criar = useCallback(async (nomeClube: string, duracao: DuracaoLiga, dificuldade: Dificuldade) => {
    try {
      const api = await clienteLogado();
      aplicar(await api.criarLiga(nomeClube, duracao, dificuldade));
      setLigas(await api.ligas());
    } catch (erro) {
      throw new Error(mensagemDe(erro));
    }
  }, [aplicar, clienteLogado]);

  const entrar = useCallback(async (codigo: string, nomeClube: string) => {
    try {
      const api = await clienteLogado();
      aplicar(await api.entrar(codigo, nomeClube));
      setLigas(await api.ligas());
    } catch (erro) {
      throw new Error(mensagemDe(erro));
    }
  }, [aplicar, clienteLogado]);

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

  const comprar = useCallback((jogadorId: number) => {
    executar((api, id) => api.comprar(id, jogadorId));
  }, [executar]);

  const vender = useCallback((jogadorId: number) => {
    executar((api, id) => api.vender(id, jogadorId));
  }, [executar]);

  const leiloar = useCallback((jogadorId: number) => {
    executar((api, id) => api.leiloar(id, jogadorId));
  }, [executar]);

  const darLance = useCallback((jogadorId: number, valor: number) => {
    executar((api, id) => api.darLance(id, jogadorId, valor));
  }, [executar]);

  const valor = useMemo<ValorLiga>(() => ({
    pronta,
    semConexao,
    nomeTecnico,
    cliente,
    ligas,
    visao,
    liga: visao?.liga ?? null,
    meuClube: visao && visao.meuClubeId !== null ? clubePorId(visao.liga, visao.meuClubeId) : null,
    entrarComGoogle,
    sair,
    recarregar,
    selecionar,
    criar,
    entrar,
    iniciar,
    salvarEscalacao,
    decidir,
    comprar,
    vender,
    leiloar,
    darLance,
  }), [
    cliente, comprar, criar, darLance, decidir, entrar, entrarComGoogle, iniciar, leiloar, ligas, nomeTecnico, pronta, recarregar, sair,
    salvarEscalacao, selecionar, semConexao, vender, visao,
  ]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useLiga() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useLiga precisa estar dentro de ProvedorLiga');
  return valor;
}
