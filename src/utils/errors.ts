/** Extrai uma mensagem legível de um erro desconhecido, sem recorrer a `any`. */
export function getErrorMessage(error: unknown, fallback = 'Erro inesperado.'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
