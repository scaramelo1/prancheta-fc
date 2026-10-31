/** Gerador com semente: a mesma semente repete a mesma partida, no app e no futuro servidor. */
export type Rng = () => number;

export function criarRng(semente: number): Rng {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function combinarSementes(...partes: number[]) {
  return partes.reduce((h, n) => (Math.imul(h ^ n, 16777619) >>> 0), 2166136261);
}

export const inteiro = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

export const escolher = <T>(rng: Rng, lista: readonly T[]) => lista[Math.floor(rng() * lista.length)];

export function embaralhar<T>(rng: Rng, lista: readonly T[]) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function escolherPonderado<T>(rng: Rng, lista: readonly T[], peso: (item: T) => number) {
  const total = lista.reduce((soma, item) => soma + peso(item), 0);
  let resto = rng() * total;
  for (const item of lista) {
    resto -= peso(item);
    if (resto <= 0) return item;
  }
  return lista[lista.length - 1];
}
