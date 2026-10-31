import type { SQLiteDatabase } from 'expo-sqlite';

export async function lerConfig(db: SQLiteDatabase, chave: string) {
  const linha = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM config WHERE chave = ?', chave);
  return linha?.valor ?? null;
}

export const salvarConfig = (db: SQLiteDatabase, chave: string, valor: string) =>
  db.runAsync(
    'INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor',
    chave,
    valor,
  );
