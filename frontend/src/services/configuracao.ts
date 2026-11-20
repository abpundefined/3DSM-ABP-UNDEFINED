import { apiRequest } from './api';

export interface Configuracao {
  intervaloColetaSegundos: number;
  intervaloDescobertaSegundos: number;
  metaMensalKgCo2e: number | null;
  atualizadaEm: string | null;
  padrao: boolean;
}

export type ConfiguracaoInput = {
  intervaloColetaSegundos: number;
  intervaloDescobertaSegundos: number;
  metaMensalKgCo2e?: number | null;
};

function toConfiguracao(data: unknown): Configuracao {
  const value = (
    typeof data === 'object' && data !== null ? data : {}
  ) as Record<string, unknown>;

  const metaValida =
    value.metaMensalKgCo2e === undefined ||
    value.metaMensalKgCo2e === null ||
    (typeof value.metaMensalKgCo2e === 'number' &&
      Number.isFinite(value.metaMensalKgCo2e) &&
      value.metaMensalKgCo2e >= 0);

  if (
    !Number.isInteger(value.intervaloColetaSegundos) ||
    !Number.isInteger(value.intervaloDescobertaSegundos) ||
    !metaValida ||
    typeof value.padrao !== 'boolean' ||
    (value.atualizadaEm !== null && typeof value.atualizadaEm !== 'string')
  ) {
    throw new Error('A resposta da configuração não tem o formato esperado.');
  }

  return {
    intervaloColetaSegundos: value.intervaloColetaSegundos as number,
    intervaloDescobertaSegundos: value.intervaloDescobertaSegundos as number,
    metaMensalKgCo2e:
      typeof value.metaMensalKgCo2e === 'number'
        ? value.metaMensalKgCo2e
        : null,
    atualizadaEm: value.atualizadaEm as string | null,
    padrao: value.padrao,
  };
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
