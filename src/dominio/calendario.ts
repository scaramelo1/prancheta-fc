import type { Partida } from './tipos.ts';

/** Turno e returno pelo método do rodízio; clubeIds precisa ter tamanho par. */
export function gerarCalendario(clubeIds: number[]): Partida[] {
  const n = clubeIds.length;
  if (n < 2 || n % 2 !== 0) throw new Error('A liga precisa de um número par de clubes');

  const roda = [...clubeIds];
  const partidas: Partida[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = roda[i];
      const b = roda[n - 1 - i];
      // Alterna o mando para ninguém ficar muitas rodadas seguidas fora.
      const [casaId, foraId] = (r + i) % 2 === 0 ? [a, b] : [b, a];
      partidas.push({ id: partidas.length + 1, rodada: r + 1, casaId, foraId, resultado: null });
      partidas.push({ id: 0, rodada: r + n, casaId: foraId, foraId: casaId, resultado: null });
    }
    roda.splice(1, 0, roda.pop() as number);
  }
  return partidas.sort((x, y) => x.rodada - y.rodada).map((p, i) => ({ ...p, id: i + 1 }));
}
