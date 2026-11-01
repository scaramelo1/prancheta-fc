/** Horários de Brasília, que não tem horário de verão desde 2019. Os amigos jogam entre os jogos do Mundo. */
export const HORAS_MUNDO = [12, 18, 21];
export const HORAS_AMIGOS = [10, 15, 20];
const FUSO_MS = 3 * 3_600_000;
const DIA_MS = 24 * 3_600_000;

export const horasDaLiga = (oficial: boolean) => (oficial ? HORAS_MUNDO : HORAS_AMIGOS);

/** Número sequencial do último horário de jogo já alcançado nesse instante. */
export function indiceDaJanela(agoraMs: number, horas = HORAS_MUNDO) {
  const local = agoraMs - FUSO_MS;
  const dia = Math.floor(local / DIA_MS);
  const hora = (local - dia * DIA_MS) / 3_600_000;
  return dia * horas.length + horas.filter((h) => h <= hora).length - 1;
}

/** Instante em que a janela começa: o caminho inverso de indiceDaJanela. */
export function inicioDaJanela(janela: number, horas = HORAS_MUNDO) {
  const dia = Math.floor(janela / horas.length);
  return dia * DIA_MS + horas[janela - dia * horas.length] * 3_600_000 + FUSO_MS;
}

/** Toda temporada começa no primeiro horário do dia, para a data 1 do calendário cair nele. */
export function proximoInicio(agoraMs: number) {
  const atual = indiceDaJanela(agoraMs);
  return atual + HORAS_MUNDO.length - (((atual % HORAS_MUNDO.length) + HORAS_MUNDO.length) % HORAS_MUNDO.length);
}

export const janelaDoMeioDia = (janela: number) => janela % HORAS_MUNDO.length === 0;
