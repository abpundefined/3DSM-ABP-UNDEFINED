import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarRanking } from '../services/ranking';
import type { RespostaRanking } from '../types/ranking';

export type EstadoDoRanking =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: RespostaRanking; atualizando: boolean };

type Resultado = { chave: string; estado: EstadoDoRanking };

function mensagemDeErro(erro: unknown) {
  if (erro instanceof ApiError && erro.status >= 500) {
    return `Não foi possível consultar o backend (HTTP ${erro.status}). Confira se ele está em execução e tente novamente.`;
  }

  return erro instanceof Error
    ? erro.message
    : 'Não foi possível carregar o ranking.';
}

export default function useRanking(consulta: string, ativo: boolean) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado>();
  const chave = `${consulta}#${tentativa}`;

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const controller = new AbortController();

    buscarRanking(consulta, controller.signal)
      .then((dados) => {
        setResultado({
          chave,
          estado: { status: 'pronto', dados, atualizando: false },
        });
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
  }, [ativo, chave, consulta]);

  const recarregar = useCallback(() => setTentativa((atual) => atual + 1), []);

  let estado: EstadoDoRanking = { status: 'carregando' };
  if (resultado?.chave === chave) {
    estado = resultado.estado;
  } else if (resultado?.estado.status === 'pronto') {
    estado = { ...resultado.estado, atualizando: true };
  }

  return { estado, recarregar };
}
