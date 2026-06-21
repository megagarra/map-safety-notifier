export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getFriendlyErrorMessage(status: number, detail?: string, context?: string): string {
  if (status === 429) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (status === 503 && context === 'upload') {
    return 'Serviço de moderação indisponível. Tente mais tarde.';
  }
  if (status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }
  if (detail) return detail;
  return `Erro na requisição (${status})`;
}
