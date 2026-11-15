import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarMapa } from '../services/mapa';
import type { RespostaMapa } from '../types/mapa';

export type EstadoDoMapa =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: RespostaMapa };

type Resultado = { chave: string; estado: EstadoDoMapa };

function mensagemDeErro(erro: unknown) {
  if (erro instanceof ApiError && erro.status >= 500) {
    return `Não foi possível consultar o backend (HTTP ${erro.status}). Confira se ele está em execução e tente novamente.`;
  }

  return erro instanceof Error
    ? erro.message
    : 'Não foi possível carregar o mapa.';
}

export default function useMapa(periodQuery: string, ativo: boolean) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado>();
  const chave = `${periodQuery}#${tentativa}`;

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const controller = new AbortController();

    buscarMapa(periodQuery, controller.signal)
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
  }, [ativo, chave, periodQuery]);

  const recarregar = useCallback(() => setTentativa((atual) => atual + 1), []);
  const estado: EstadoDoMapa =
    resultado?.chave === chave ? resultado.estado : { status: 'carregando' };

  return { estado, recarregar };
}
