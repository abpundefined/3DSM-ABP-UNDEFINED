import { apiRequest } from './api';

export interface Configuracao {
  intervaloColetaSegundos: number;
  intervaloDescobertaSegundos: number;
  atualizadaEm: string | null;
  padrao: boolean;
}

export type ConfiguracaoInput = Pick<
  Configuracao,
  'intervaloColetaSegundos' | 'intervaloDescobertaSegundos'
>;

function toConfiguracao(data: unknown): Configuracao {
  const value = (
    typeof data === 'object' && data !== null ? data : {}
  ) as Record<string, unknown>;

  if (
    !Number.isInteger(value.intervaloColetaSegundos) ||
    !Number.isInteger(value.intervaloDescobertaSegundos) ||
    typeof value.padrao !== 'boolean' ||
    (value.atualizadaEm !== null && typeof value.atualizadaEm !== 'string')
  ) {
    throw new Error('A resposta da configuração não tem o formato esperado.');
  }

  return value as unknown as Configuracao;
}

export async function getConfiguracao(signal?: AbortSignal) {
  return toConfiguracao(await apiRequest('/configuracao', { signal }));
}

export async function saveConfiguracao(
  input: ConfiguracaoInput,
  token: string,
) {
  const data = await apiRequest('/configuracao', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  return toConfiguracao(data);
}
