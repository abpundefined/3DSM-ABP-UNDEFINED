import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarOportunidades } from '../services/oportunidades';
import type { RespostaOportunidades } from '../types/oportunidades';

export type EstadoOportunidades =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: RespostaOportunidades };

function descreverErro(erro: unknown): string {
  if (erro instanceof ApiError && erro.status >= 500) {
    return `Não foi possível consultar as oportunidades no backend (HTTP ${erro.status}).`;
  }
  return erro instanceof Error
    ? erro.message
    : 'Não foi possível carregar as oportunidades de redução.';
}

export default function useOportunidades(consulta: string, ativo = true) {
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<EstadoOportunidades>({
    status: 'carregando',
  });

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const controller = new AbortController();
    setEstado({ status: 'carregando' });

    buscarOportunidades(consulta, controller.signal)
      .then((dados) => setEstado({ status: 'pronto', dados }))
      .catch((erro: unknown) => {
        if (!controller.signal.aborted) {
          setEstado({ status: 'erro', mensagem: descreverErro(erro) });
        }
      });

    return () => controller.abort();
  }, [ativo, consulta, tentativa]);

  const recarregar = useCallback(() => {
    setTentativa((atual) => atual + 1);
  }, []);

  return { estado, recarregar };
}
