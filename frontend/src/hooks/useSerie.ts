import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarSerie } from '../services/serie';
import type { RespostaSerie } from '../types/serie';

export type EstadoDaSerie =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: RespostaSerie };

type Resultado = { chave: string; estado: EstadoDaSerie };

function mensagemDeErro(erro: unknown) {
  if (erro instanceof ApiError && erro.status >= 500) {
    return `O backend não respondeu (HTTP ${erro.status}).`;
  }

  return erro instanceof Error
    ? erro.message
    : 'Não foi possível carregar a tendência.';
}

export default function useSerie(apiQuery: string, ativo: boolean) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado>();
  const chave = `${apiQuery}#${tentativa}`;

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const controller = new AbortController();

    buscarSerie(apiQuery, controller.signal)
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
  }, [apiQuery, ativo, chave]);

  const recarregar = useCallback(() => setTentativa((atual) => atual + 1), []);
  const estado: EstadoDaSerie =
    resultado?.chave === chave ? resultado.estado : { status: 'carregando' };

  return { estado, recarregar };
}
