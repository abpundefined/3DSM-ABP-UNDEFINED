import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarMetaCarbono } from '../services/metaCarbono';
import type { RespostaMetaCarbono } from '../utils/metaCarbono';

export type EstadoDaMeta =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: RespostaMetaCarbono };

function mensagemDeErro(error: unknown): string {
  if (error instanceof ApiError && error.status >= 500) {
    return `Não foi possível consultar o backend (HTTP ${error.status}). Confira se ele está em execução e tente novamente.`;
  }
  return error instanceof Error
    ? error.message
    : 'Não foi possível carregar a meta mensal.';
}

export default function useMetaCarbono(ativo = true) {
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<EstadoDaMeta>({ status: 'carregando' });

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const controller = new AbortController();
    setEstado({ status: 'carregando' });

    buscarMetaCarbono(controller.signal)
      .then((dados) => {
        if (!controller.signal.aborted) {
          setEstado({ status: 'pronto', dados });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setEstado({ status: 'erro', mensagem: mensagemDeErro(error) });
        }
      });

    return () => controller.abort();
  }, [ativo, tentativa]);

  const recarregar = useCallback(() => setTentativa((atual) => atual + 1), []);

  return { estado, recarregar };
}
