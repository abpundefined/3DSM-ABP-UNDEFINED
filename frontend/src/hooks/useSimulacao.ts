import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarSimulacao } from '../services/simulacao';
import type { RespostaSimulacao } from '../types/simulacao';

export type EstadoDaSimulacao =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: RespostaSimulacao };

type Resultado = { chave: string; estado: EstadoDaSimulacao };

function mensagemDeErro(erro: unknown) {
  if (erro instanceof ApiError && erro.status === 404) {
    return 'Serviço não encontrado.';
  }
  if (erro instanceof ApiError && erro.status >= 500) {
    return `Não foi possível consultar o backend (HTTP ${erro.status}). Confira se ele está em execução e tente novamente.`;
  }

  return erro instanceof Error
    ? erro.message
    : 'Não foi possível carregar a simulação.';
}

export default function useSimulacao(
  servicoId: number,
  periodQuery: string,
  ativo: boolean,
) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado>();
  const chave = `${servicoId}${periodQuery}#${tentativa}`;

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const controller = new AbortController();

    buscarSimulacao(servicoId, periodQuery, controller.signal)
      .then((dados) => {
        setResultado({ chave, estado: { status: 'pronto', dados } });
      })
      .catch((erro: unknown) => {
        if (!controller.signal.aborted) {
          setResultado({
            chave,
            estado: { status: 'erro', mensagem: mensagemDeErro(erro) },
          });
        }
      });

    return () => controller.abort();
  }, [ativo, chave, periodQuery, servicoId]);

  const recarregar = useCallback(() => setTentativa((atual) => atual + 1), []);
  const estado: EstadoDaSimulacao =
    resultado?.chave === chave ? resultado.estado : { status: 'carregando' };

  return { estado, recarregar };
}
