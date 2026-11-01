export interface Confronto {
  rodada: number;
  casaId: number;
  foraId: number;
}

export const DIAS_POR_TORNEIO = 19;
export const DATAS_POR_DIA = 3;
export const DATAS_POR_TORNEIO = DIAS_POR_TORNEIO * DATAS_POR_DIA;
export const TORNEIOS_NA_TEMPORADA = 3;
export const DATAS_DOS_TORNEIOS = DATAS_POR_TORNEIO * TORNEIOS_NA_TEMPORADA;
/** Semifinais, disputa do terceiro lugar e final, uma por dia. */
export const DATAS_DA_TACA = 3;
export const HORARIOS = ['12h', '18h', '21h'];

/** Turno e returno pelo método do rodízio; clubeIds precisa ter tamanho par. */
export function gerarCalendario(clubeIds: number[]): Confronto[] {
  const n = clubeIds.length;
  if (n < 2 || n % 2 !== 0) throw new Error('A liga precisa de um número par de clubes');

  const roda = [...clubeIds];
  const confrontos: Confronto[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = roda[i];
      const b = roda[n - 1 - i];
      // Alterna o mando para ninguém ficar muitas rodadas seguidas fora.
      const [casaId, foraId] = (r + i) % 2 === 0 ? [a, b] : [b, a];
      confrontos.push({ rodada: r + 1, casaId, foraId });
      confrontos.push({ rodada: r + n, casaId: foraId, foraId: casaId });
    }
    roda.splice(1, 0, roda.pop() as number);
  }
  return confrontos.sort((x, y) => x.rodada - y.rodada);
}

const inicioDoTorneio = (torneio: number) => (torneio - 1) * DATAS_POR_TORNEIO;

/** Cada dia tem duas rodadas de liga (12h e 18h) e uma de copa (21h). */
export const dataDaLiga = (torneio: number, rodada: number) =>
  inicioDoTorneio(torneio) + (Math.ceil(rodada / 2) - 1) * DATAS_POR_DIA + ((rodada - 1) % 2) + 1;

export const dataDaCopa = (torneio: number, rodada: number) => inicioDoTorneio(torneio) + rodada * DATAS_POR_DIA;

/** Torneio e rodada de copa de uma data, ou null se ela não for de copa. */
export function copaDaData(data: number) {
  if (data > DATAS_DOS_TORNEIOS || data % DATAS_POR_DIA !== 0) return null;
  const torneio = Math.ceil(data / DATAS_POR_TORNEIO);
  return { torneio, rodada: (data - inicioDoTorneio(torneio)) / DATAS_POR_DIA };
}

export const diaDaData = (data: number) =>
  (data <= DATAS_DOS_TORNEIOS ? Math.ceil(data / DATAS_POR_DIA) : DIAS_POR_TORNEIO * TORNEIOS_NA_TEMPORADA + data - DATAS_DOS_TORNEIOS);

export const horarioDaData = (data: number) =>
  HORARIOS[data <= DATAS_DOS_TORNEIOS ? (data - 1) % DATAS_POR_DIA : DATAS_POR_DIA - 1];

/** Torneio da data; 0 significa Taça dos Campeões. */
export const torneioDaData = (data: number) => (data > DATAS_DOS_TORNEIOS ? 0 : Math.ceil(data / DATAS_POR_TORNEIO));
