import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { apagarLigas, carregarLiga, salvarLiga } from '../db/repositorio';
import { clubeDoDono, criarLiga, jogarRodada } from '../dominio/liga';
import type { Clube, Dificuldade, Escalacao, Liga } from '../dominio/tipos';

/** Sem login por enquanto: o único humano é o dono do aparelho. */
const DONO_LOCAL = 'local';

interface ValorLiga {
  pronta: boolean;
  liga: Liga | null;
  meuClube: Clube | null;
  iniciar: (nomeClube: string, tamanho: number, dificuldade: Dificuldade) => void;
  salvarEscalacao: (escalacao: Escalacao) => void;
  jogar: () => Liga | null;
  apagar: () => void;
}

const Contexto = createContext<ValorLiga | null>(null);

export function ProvedorLiga({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [pronta, setPronta] = useState(false);
  const [liga, setLiga] = useState<Liga | null>(null);

  useEffect(() => {
    carregarLiga(db).then((salva) => {
      setLiga(salva);
      setPronta(true);
    });
  }, [db]);

  const atualizar = useCallback((nova: Liga) => {
    setLiga(nova);
    salvarLiga(db, nova);
  }, [db]);

  const iniciar = useCallback((nomeClube: string, tamanho: number, dificuldade: Dificuldade) => {
    const semente = Math.floor(Math.random() * 2 ** 31);
    atualizar(criarLiga(String(semente), { nomeClube, donoId: DONO_LOCAL, tamanho, dificuldade, semente }));
  }, [atualizar]);

  const salvarEscalacao = useCallback((escalacao: Escalacao) => {
    if (!liga) return;
    atualizar({
      ...liga,
      clubes: liga.clubes.map((c) => (c.donoId === DONO_LOCAL ? { ...c, escalacao } : c)),
    });
  }, [atualizar, liga]);

  const jogar = useCallback(() => {
    if (!liga) return null;
    const nova = jogarRodada(liga);
    atualizar(nova);
    return nova;
  }, [atualizar, liga]);

  const apagar = useCallback(() => {
    setLiga(null);
    apagarLigas(db);
  }, [db]);

  const valor = useMemo<ValorLiga>(() => ({
    pronta,
    liga,
    meuClube: liga ? (clubeDoDono(liga, DONO_LOCAL) ?? null) : null,
    iniciar,
    salvarEscalacao,
    jogar,
    apagar,
  }), [apagar, iniciar, jogar, liga, pronta, salvarEscalacao]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useLiga() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useLiga precisa estar dentro de ProvedorLiga');
  return valor;
}
