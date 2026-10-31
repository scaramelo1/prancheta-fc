import type { SQLiteDatabase } from 'expo-sqlite';

const VERSAO_ATUAL = 2;

/** Passado como onInit do SQLiteProvider; roda a cada abertura do banco. */
export async function migrar(db: SQLiteDatabase) {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versao = linha?.user_version ?? 0;
  if (versao >= VERSAO_ATUAL) return;

  if (versao === 1) {
    // O formato da temporada mudou e as ligas antigas não abrem nele.
    await db.execAsync(`DELETE FROM liga; PRAGMA user_version = ${VERSAO_ATUAL};`);
    return;
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    -- A liga inteira em JSON: quando houver servidor, ela passa a vir de lá.
    CREATE TABLE liga (
      id TEXT PRIMARY KEY,
      dados TEXT NOT NULL,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    PRAGMA user_version = ${VERSAO_ATUAL};
  `);
}
