import type { Clube, Escalacao, Escalado, Estilo, Formacao, Jogador, Personalidade, Posicao } from './tipos.ts';

interface DadosFormacao {
  def: number;
  mei: number;
  ata: number;
  ataque: number;
  meio: number;
  defesa: number;
}

export const FORMACOES: Record<Formacao, DadosFormacao> = {
  '4-4-2': { def: 4, mei: 4, ata: 2, ataque: 0, meio: 0, defesa: 0 },
  '4-3-3': { def: 4, mei: 3, ata: 3, ataque: 1.5, meio: -2, defesa: -2.5 },
  '3-5-2': { def: 3, mei: 5, ata: 2, ataque: 1, meio: 3, defesa: -3.5 },
  '5-4-1': { def: 5, mei: 4, ata: 1, ataque: -4, meio: 0, defesa: 4 },
};

export const ESTILOS: Record<Estilo, { ataque: number; defesa: number }> = {
  defensivo: { ataque: -2, defesa: 2 },
  equilibrado: { ataque: 0, defesa: 0 },
  ofensivo: { ataque: 2, defesa: -2 },
};

export const LISTA_FORMACOES = Object.keys(FORMACOES) as Formacao[];
export const LISTA_ESTILOS = Object.keys(ESTILOS) as Estilo[];

const TATICA_DA_MAQUINA: Record<Personalidade, { formacao: Formacao; estilo: Estilo }> = {
  retranqueiro: { formacao: '5-4-1', estilo: 'defensivo' },
  equilibrado: { formacao: '4-4-2', estilo: 'equilibrado' },
  ofensivo: { formacao: '4-3-3', estilo: 'ofensivo' },
  formador: { formacao: '3-5-2', estilo: 'equilibrado' },
};

export function vagasDaFormacao(formacao: Formacao): Posicao[] {
  const { def, mei, ata } = FORMACOES[formacao];
  return ['GOL', ...Array<Posicao>(def).fill('DEF'), ...Array<Posicao>(mei).fill('MEI'), ...Array<Posicao>(ata).fill('ATA')];
}

export const NIVEL_MINIMO = 30;
export const NIVEL_MAXIMO = 100;
export const PENALIDADE_FORA_DE_POSICAO = 0.7;
const TITULARES = 11;

export const limitarNivel = (nivel: number) => Math.max(NIVEL_MINIMO, Math.min(NIVEL_MAXIMO, nivel));

/** Um jogador sem energia rende 30% menos. */
export const forcaEfetiva = (j: Jogador) => j.forca * (0.7 + (0.3 * j.energia) / 100);

const porForca = (a: Jogador, b: Jogador) => forcaEfetiva(b) - forcaEfetiva(a) || a.id - b.id;

/** Completa as vagas abertas: primeiro quem é da posição, depois o melhor que sobrar. */
function completar(elenco: Jogador[], vagas: Posicao[], fixos: Escalado[]): Escalado[] {
  const usados = new Set(fixos.map((e) => e.jogadorId));
  const livres = elenco.filter((j) => j.rodadasFora === 0 && !usados.has(j.id)).sort(porForca);
  const abertas = [...vagas];
  for (const fixo of fixos) abertas.splice(abertas.indexOf(fixo.posicao), 1);

  const novos: Escalado[] = [];
  const pendentes: Posicao[] = [];
  for (const posicao of abertas) {
    const i = livres.findIndex((j) => j.posicao === posicao);
    if (i >= 0) novos.push({ jogadorId: livres.splice(i, 1)[0].id, posicao });
    else pendentes.push(posicao);
  }
  for (const posicao of pendentes) {
    const jogador = livres.shift();
    if (jogador) novos.push({ jogadorId: jogador.id, posicao });
  }
  return [...fixos, ...novos];
}

export function melhorEscalacao(clube: Clube, formacao: Formacao, estilo: Estilo): Escalacao {
  return { formacao, estilo, titulares: completar(clube.elenco, vagasDaFormacao(formacao), []) };
}

/** A máquina segue as mesmas regras: sem bônus, só o elenco e o estilo do clube. */
export function escalacaoDaMaquina(clube: Clube): Escalacao {
  const { formacao, estilo } = TATICA_DA_MAQUINA[clube.personalidade ?? 'equilibrado'];
  return melhorEscalacao(clube, formacao, estilo);
}

/** Com o assistente desligado, mantém a escolha do técnico e repõe só quem está fora. */
export function escalacaoParaJogo(clube: Clube): Escalacao {
  if (clube.donoId === null) return escalacaoDaMaquina(clube);
  const atual = clube.escalacao ?? melhorEscalacao(clube, '4-4-2', 'equilibrado');
  if (clube.assistente) return melhorEscalacao(clube, atual.formacao, atual.estilo);
  const aptos = new Set(clube.elenco.filter((j) => j.rodadasFora === 0).map((j) => j.id));
  const fixos = atual.titulares.filter((e) => aptos.has(e.jogadorId));
  return { ...atual, titulares: completar(clube.elenco, vagasDaFormacao(atual.formacao), fixos) };
}

/**
 * Nível do time, de 30 a 100: média dos 11 que vão a campo. Fora de posição conta menos, e vaga sem
 * jogador conta zero. A energia fica de fora para o número não oscilar a cada jogo.
 */
export function nivelDoTime(clube: Clube) {
  const soma = escalacaoParaJogo(clube).titulares.reduce((total, { jogadorId, posicao }) => {
    const jogador = clube.elenco.find((j) => j.id === jogadorId);
    if (!jogador) return total;
    return total + jogador.forca * (jogador.posicao === posicao ? 1 : PENALIDADE_FORA_DE_POSICAO);
  }, 0);
  return Math.round(limitarNivel(soma / TITULARES));
}

/** Troca um titular por um reserva, que passa a ocupar a mesma vaga. */
export function trocarTitular(escalacao: Escalacao, saiId: number, entraId: number): Escalacao {
  return {
    ...escalacao,
    titulares: escalacao.titulares.map((e) => (e.jogadorId === saiId ? { ...e, jogadorId: entraId } : e)),
  };
}
