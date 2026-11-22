import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarSaude } from '../services/saude';
import type { RespostaSaude } from '../types/saude';

export type EstadoDaSaude =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string; naoAutorizado: boolean }
  | { status: 'pronto'; dados: RespostaSaude };

const INTERVALO_DE_ATUALIZACAO_MS = 30_000;

function descreverErro(erro: unknown): EstadoDaSaude {
  if (erro instanceof ApiError && erro.status === 401) {
    return { status: 'erro', mensagem: erro.message, naoAutorizado: true };
  }

  return {
    status: 'erro',
    naoAutorizado: false,
    mensagem:
      erro instanceof ApiError && erro.status >= 500
        ? `Não foi possível consultar o backend (HTTP ${erro.status}). Confira se ele está em execução e tente novamente.`
        : erro instanceof Error
          ? erro.message
          : 'Não foi possível carregar a saúde das integrações.',
  };
}

export default function useSaude(token: string | null, ativo: boolean) {
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<EstadoDaSaude>({ status: 'carregando' });

  useEffect(() => {
    if (!ativo || !token) {
      return;
    }

    const controller = new AbortController();

    buscarSaude(token, controller.signal)
      .then((dados) => setEstado({ status: 'pronto', dados }))
      .catch((erro: unknown) => {
        if (!controller.signal.aborted) {
          setEstado(descreverErro(erro));
        }
      });

    return () => controller.abort();
  }, [ativo, token, tentativa]);

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const intervalo = setInterval(
      () => setTentativa((atual) => atual + 1),
      INTERVALO_DE_ATUALIZACAO_MS,
    );

    return () => clearInterval(intervalo);
  }, [ativo]);

  const recarregar = useCallback(() => {
    setEstado((atual) =>
      atual.status === 'erro' ? { status: 'carregando' } : atual,
    );
    setTentativa((atual) => atual + 1);
  }, []);

  return { estado, recarregar };
}
