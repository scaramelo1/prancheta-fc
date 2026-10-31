import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { criarApi } from './api.ts';
import { BancoSqlite } from './banco.ts';
import { processarRodadas } from './rodadas.ts';

const PORTA = Number(process.env.PORTA ?? 3100);
const HOST = process.env.HOST ?? '127.0.0.1';
const CAMINHO_BANCO = resolve(process.env.BANCO ?? 'servidor/dados/prancheta.db');
const INTERVALO_MS = 30_000;

mkdirSync(dirname(CAMINHO_BANCO), { recursive: true });
const banco = new BancoSqlite(CAMINHO_BANCO);
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const URL_PUBLICA = process.env.URL_PUBLICA ?? 'https://fsadesigners.com.br/prancheta-api';
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) console.warn('Login com Google desligado: faltam as credenciais');
const api = criarApi(banco, {
  google: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, urlPublica: URL_PUBLICA }
    : undefined,
});

let processando = false;
async function rodarAgenda() {
  if (processando) return;
  processando = true;
  try {
    const total = await processarRodadas(banco, Date.now());
    if (total > 0) console.log(`Rodada processada em ${total} liga(s)`);
  } catch (erro) {
    console.error('Falha ao processar rodadas', erro);
  } finally {
    processando = false;
  }
}

api.listen(PORTA, HOST, () => console.log(`Prancheta FC em http://${HOST}:${PORTA}`));
void rodarAgenda();
const agenda = setInterval(rodarAgenda, INTERVALO_MS);

function encerrar() {
  clearInterval(agenda);
  api.close(() => {
    banco.fechar().finally(() => process.exit(0));
  });
}
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
