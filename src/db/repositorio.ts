import type { SQLiteDatabase } from 'expo-sqlite';

import type { Liga } from '../dominio/tipos';

// Uma gravação por vez, na ordem pedida, para a mais antiga nunca sobrescrever a mais nova.
let fila: Promise<unknown> = Promise.resolve();
function emFila<T>(escrita: () => Promise<T>): Promise<T> {
  const resultado = fila.then(escrita, escrita);
  fila = resultado.catch(() => undefined);
  return resultado;
}

export async function carregarLiga(db: SQLiteDatabase): Promise<Liga | null> {
  const linha = await db.getFirstAsync<{ dados: string }>('SELECT dados FROM liga LIMIT 1');
  return linha ? (JSON.parse(linha.dados) as Liga) : null;
}

export function salvarLiga(db: SQLiteDatabase, liga: Liga) {
  return emFila(() => db.runAsync(
    `INSERT INTO liga (id, dados) VALUES (?, ?)
     ON CONFLICT (id) DO UPDATE SET dados = excluded.dados, atualizado_em = CURRENT_TIMESTAMP`,
    liga.id,
    JSON.stringify(liga),
  ));
}

export const apagarLigas = (db: SQLiteDatabase) => emFila(() => db.runAsync('DELETE FROM liga'));
