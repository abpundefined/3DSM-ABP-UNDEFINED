export async function comTimeout<T>(
  timeoutMs: number,
  descricao: string,
  operacao: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operacao(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `Tempo limite de ${timeoutMs}ms excedido ao consultar ${descricao}.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
