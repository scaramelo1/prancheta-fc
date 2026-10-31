/** Uma mudança de liga por vez: a rodada das 21h não pode pisar na escalação salva no mesmo instante. */
let fila: Promise<unknown> = Promise.resolve();

export function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.catch(() => undefined);
  return resultado;
}
