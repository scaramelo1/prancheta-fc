import type { Partida } from './tipos.ts';

export type Motivo =
  | 'expulsao' | 'cansaco' | 'meioDominado' | 'meioPerdido' | 'faltouPontaria' | 'aproveitou' | 'equilibrado';

const POSSE_CLARA = 57;
const DIFERENCA_DE_ENERGIA = 15;

/** Escolhe a causa mais forte do resultado, do ponto de vista do clube. */
export function explicarPartida(partida: Partida, clubeId: number): Motivo {
  const r = partida.resultado;
  if (!r) return 'equilibrado';
  const emCasa = partida.casaId === clubeId;
  const pro = emCasa ? r.golsCasa : r.golsFora;
  const contra = emCasa ? r.golsFora : r.golsCasa;
  const posse = emCasa ? r.posseCasa : 100 - r.posseCasa;
  const chances = emCasa ? r.chancesCasa : r.chancesFora;
  const chancesRival = emCasa ? r.chancesFora : r.chancesCasa;
  const energia = (emCasa ? r.energiaCasa : r.energiaFora) ?? 100;
  const energiaRival = (emCasa ? r.energiaFora : r.energiaCasa) ?? 100;

  if (pro < contra) {
    if (r.eventos.some((e) => e.tipo === 'vermelho' && e.clubeId === clubeId)) return 'expulsao';
    if (energiaRival - energia >= DIFERENCA_DE_ENERGIA) return 'cansaco';
    if (chances > chancesRival) return 'faltouPontaria';
    if (posse <= 100 - POSSE_CLARA) return 'meioPerdido';
  }
  if (pro > contra) {
    if (chances < chancesRival) return 'aproveitou';
    if (posse >= POSSE_CLARA) return 'meioDominado';
  }
  return 'equilibrado';
}
