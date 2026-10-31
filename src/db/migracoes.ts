import type { SQLiteDatabase } from 'expo-sqlite';

const VERSAO_ATUAL = 3;

/** Passado como onInit do SQLiteProvider; roda a cada abertura do banco. */
export async function migrar(db: SQLiteDatabase) {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versao = linha?.user_version ?? 0;
  if (versao >= VERSAO_ATUAL) return;

  // A liga agora vive no servidor; no aparelho ficam só a conta e a última liga aberta.
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    DROP TABLE IF EXISTS liga;

    CREATE TABLE config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    ) WITHOUT ROWID;

    PRAGMA user_version = ${VERSAO_ATUAL};
  `);
}
