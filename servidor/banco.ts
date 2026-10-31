import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import type { Liga } from '../src/dominio/tipos.ts';

import type { ResumoOficial } from '../src/dominio/mundo.ts';

/** Dona das ligas do Mundo Oficial: não é um técnico e nunca faz login. */
export const CONTA_DO_MUNDO = 'mundo';

export interface Conta {
  id: string;
  nome: string;
  google: boolean;
}

export interface RegistroLiga {
  id: string;
  codigo: string;
  donoId: string;
  /** Null enquanto o dono não iniciar. */
  janela: number | null;
  liga: Liga;
}

/** Tudo que o servidor pede ao banco: para trocar por PostgreSQL, basta outra implementação disto. */
export interface Banco {
  criarConta(id: string, nome: string, tokenHash: string): Promise<void>;
  contaPorToken(tokenHash: string): Promise<Conta | null>;
  contaPorGoogle(googleSub: string): Promise<Conta | null>;
  vincularGoogle(contaId: string, googleSub: string, nome: string): Promise<void>;
  criarSessao(contaId: string, tokenHash: string): Promise<void>;
  apagarSessao(tokenHash: string): Promise<void>;
  criarLiga(registro: RegistroLiga): Promise<void>;
  salvarLiga(id: string, liga: Liga, janela: number | null): Promise<void>;
  ligaPorId(id: string): Promise<RegistroLiga | null>;
  ligaPorCodigo(codigo: string): Promise<RegistroLiga | null>;
  ligasDaConta(contaId: string): Promise<RegistroLiga[]>;
  entrarNaLiga(ligaId: string, contaId: string): Promise<void>;
  contarLigasCriadas(contaId: string): Promise<number>;
  ligasAtrasadas(janela: number): Promise<string[]>;
  sairDaLiga(ligaId: string, contaId: string): Promise<void>;
  resumoOficiais(): Promise<ResumoOficial[]>;
  registrarAcesso(contaId: string, quandoMs: number): Promise<void>;
  contaInativa(contaId: string, limiteMs: number): Promise<boolean>;
  /** Tudo o que acontecer dentro de `tarefa` vale junto, ou nada vale. */
  transacao(tarefa: () => Promise<void>): Promise<void>;
  fechar(): Promise<void>;
}

interface LinhaConta {
  id: string;
  nome: string;
  google_sub: string | null;
}

const paraConta = (c: LinhaConta): Conta => ({ id: c.id, nome: c.nome, google: c.google_sub !== null });

interface LinhaLiga {
  id: string;
  codigo: string;
  dono_id: string;
  janela: number | null;
  dados: string;
}

const paraRegistro = (l: LinhaLiga): RegistroLiga => ({
  id: l.id, codigo: l.codigo, donoId: l.dono_id, janela: l.janela, liga: JSON.parse(l.dados) as Liga,
});

export class BancoSqlite implements Banco {
  private db: DatabaseSync;

  constructor(caminho: string) {
    this.db = new DatabaseSync(caminho);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS conta (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        criada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS liga (
        id TEXT PRIMARY KEY,
        codigo TEXT NOT NULL UNIQUE,
        dono_id TEXT NOT NULL REFERENCES conta (id),
        janela INTEGER,
        dados TEXT NOT NULL,
        atualizada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS liga_janela ON liga (janela);

      CREATE TABLE IF NOT EXISTS membro (
        liga_id TEXT NOT NULL REFERENCES liga (id) ON DELETE CASCADE,
        conta_id TEXT NOT NULL REFERENCES conta (id),
        PRIMARY KEY (liga_id, conta_id)
      );

      CREATE INDEX IF NOT EXISTS membro_conta ON membro (conta_id);

      -- Uma conta pode estar aberta em mais de um aparelho.
      CREATE TABLE IF NOT EXISTS sessao (
        token_hash TEXT PRIMARY KEY,
        conta_id TEXT NOT NULL REFERENCES conta (id) ON DELETE CASCADE,
        criada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO sessao (token_hash, conta_id) SELECT token_hash, id FROM conta;
    `);
    const colunas = this.db.prepare('PRAGMA table_info(conta)').all() as unknown as { name: string }[];
    if (!colunas.some((c) => c.name === 'google_sub')) {
      this.db.exec('ALTER TABLE conta ADD COLUMN google_sub TEXT');
      this.db.exec('CREATE UNIQUE INDEX conta_google ON conta (google_sub)');
    }
    if (!colunas.some((c) => c.name === 'ultimo_acesso')) this.db.exec('ALTER TABLE conta ADD COLUMN ultimo_acesso INTEGER');
    this.db.prepare('INSERT OR IGNORE INTO conta (id, nome, token_hash) VALUES (?, ?, ?)')
      .run(CONTA_DO_MUNDO, 'Mundo Oficial', randomBytes(32).toString('hex'));
  }

  async criarConta(id: string, nome: string, tokenHash: string) {
    this.db.prepare('INSERT INTO conta (id, nome, token_hash) VALUES (?, ?, ?)').run(id, nome, tokenHash);
    await this.criarSessao(id, tokenHash);
  }

  async contaPorToken(tokenHash: string) {
    const linha = this.db.prepare(
      'SELECT c.id, c.nome, c.google_sub FROM conta c JOIN sessao s ON s.conta_id = c.id WHERE s.token_hash = ?',
    ).get(tokenHash);
    return linha ? paraConta(linha as unknown as LinhaConta) : null;
  }

  async contaPorGoogle(googleSub: string) {
    const linha = this.db.prepare('SELECT id, nome, google_sub FROM conta WHERE google_sub = ?').get(googleSub);
    return linha ? paraConta(linha as unknown as LinhaConta) : null;
  }

  async vincularGoogle(contaId: string, googleSub: string, nome: string) {
    this.db.prepare('UPDATE conta SET google_sub = ?, nome = ? WHERE id = ?').run(googleSub, nome, contaId);
  }

  async criarSessao(contaId: string, tokenHash: string) {
    this.db.prepare('INSERT INTO sessao (token_hash, conta_id) VALUES (?, ?)').run(tokenHash, contaId);
  }

  async apagarSessao(tokenHash: string) {
    this.db.prepare('DELETE FROM sessao WHERE token_hash = ?').run(tokenHash);
  }

  async criarLiga({ id, codigo, donoId, janela, liga }: RegistroLiga) {
    this.db.prepare('INSERT INTO liga (id, codigo, dono_id, janela, dados) VALUES (?, ?, ?, ?, ?)')
      .run(id, codigo, donoId, janela, JSON.stringify(liga));
    await this.entrarNaLiga(id, donoId);
  }

  async salvarLiga(id: string, liga: Liga, janela: number | null) {
    this.db.prepare('UPDATE liga SET dados = ?, janela = ?, atualizada_em = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(liga), janela, id);
  }

  async ligaPorId(id: string) {
    const linha = this.db.prepare('SELECT * FROM liga WHERE id = ?').get(id);
    return linha ? paraRegistro(linha as unknown as LinhaLiga) : null;
  }

  async ligaPorCodigo(codigo: string) {
    const linha = this.db.prepare('SELECT * FROM liga WHERE codigo = ?').get(codigo);
    return linha ? paraRegistro(linha as unknown as LinhaLiga) : null;
  }

  async ligasDaConta(contaId: string) {
    const linhas = this.db.prepare(
      'SELECT l.* FROM liga l JOIN membro m ON m.liga_id = l.id WHERE m.conta_id = ? ORDER BY l.atualizada_em DESC',
    ).all(contaId);
    return (linhas as unknown as LinhaLiga[]).map(paraRegistro);
  }

  async entrarNaLiga(ligaId: string, contaId: string) {
    this.db.prepare('INSERT OR IGNORE INTO membro (liga_id, conta_id) VALUES (?, ?)').run(ligaId, contaId);
  }

  async contarLigasCriadas(contaId: string) {
    const linha = this.db.prepare('SELECT COUNT(*) AS n FROM liga WHERE dono_id = ?').get(contaId);
    return Number((linha as { n: number }).n);
  }

  async ligasAtrasadas(janela: number) {
    const linhas = this.db.prepare('SELECT id FROM liga WHERE janela IS NOT NULL AND janela < ?').all(janela);
    return (linhas as unknown as { id: string }[]).map((l) => l.id);
  }

  async sairDaLiga(ligaId: string, contaId: string) {
    this.db.prepare('DELETE FROM membro WHERE liga_id = ? AND conta_id = ?').run(ligaId, contaId);
  }

  /** O próprio SQLite lê o JSON: assim a lista não carrega as ligas inteiras na memória. */
  async resumoOficiais() {
    const linhas = this.db.prepare(`
      SELECT l.id,
        CAST(json_extract(l.dados, '$.divisao') AS INTEGER) AS divisao,
        json_extract(l.dados, '$.grupo') AS grupo,
        (SELECT COUNT(*) FROM membro m WHERE m.liga_id = l.id AND m.conta_id <> ?) AS tecnicos
      FROM liga l WHERE l.dono_id = ?
    `).all(CONTA_DO_MUNDO, CONTA_DO_MUNDO);
    return linhas as unknown as ResumoOficial[];
  }

  async registrarAcesso(contaId: string, quandoMs: number) {
    this.db.prepare('UPDATE conta SET ultimo_acesso = ? WHERE id = ?').run(quandoMs, contaId);
  }

  async contaInativa(contaId: string, limiteMs: number) {
    const linha = this.db.prepare('SELECT ultimo_acesso AS ms FROM conta WHERE id = ?').get(contaId) as { ms: number | null } | undefined;
    return linha?.ms != null && linha.ms < limiteMs;
  }

  async transacao(tarefa: () => Promise<void>) {
    this.db.exec('BEGIN');
    try {
      await tarefa();
      this.db.exec('COMMIT');
    } catch (erro) {
      this.db.exec('ROLLBACK');
      throw erro;
    }
  }

  async fechar() {
    this.db.close();
  }
}
