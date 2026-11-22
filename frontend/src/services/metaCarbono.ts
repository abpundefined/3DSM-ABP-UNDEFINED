import { apiRequest } from './api';
import {
  isRespostaMetaCarbono,
  type RespostaMetaCarbono,
} from '../utils/metaCarbono';

export async function buscarMetaCarbono(
  signal?: AbortSignal,
): Promise<RespostaMetaCarbono> {
  const resposta = await apiRequest<unknown>('/indicadores/meta', { signal });

  if (!isRespostaMetaCarbono(resposta)) {
    throw new Error('A resposta da meta mensal não tem o formato esperado.');
  }

  return resposta;
}
