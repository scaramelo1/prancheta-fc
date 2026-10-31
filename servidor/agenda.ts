/** Rodadas às 12h, 18h e 21h de Brasília, que não tem horário de verão desde 2019. */
const HORAS = [12, 18, 21];
const FUSO_MS = 3 * 3_600_000;
const DIA_MS = 24 * 3_600_000;

/** Número sequencial do último horário de jogo já alcançado nesse instante. */
export function indiceDaJanela(agoraMs: number) {
  const local = agoraMs - FUSO_MS;
  const dia = Math.floor(local / DIA_MS);
  const hora = (local - dia * DIA_MS) / 3_600_000;
  return dia * HORAS.length + HORAS.filter((h) => h <= hora).length - 1;
}

/** Toda temporada começa às 12h, para a data 1 do calendário cair no primeiro horário do dia. */
export function proximoInicio(agoraMs: number) {
  const atual = indiceDaJanela(agoraMs);
  return atual + HORAS.length - (((atual % HORAS.length) + HORAS.length) % HORAS.length);
}

export const janelaDoMeioDia = (janela: number) => janela % HORAS.length === 0;
