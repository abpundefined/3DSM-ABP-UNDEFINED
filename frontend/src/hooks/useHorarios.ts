import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { buscarHorarios } from '../services/horarios';
import type { RespostaHorarios } from '../types/horarios';

export type EstadoDosHorarios =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | {
      status: 'pronto';
      dados: RespostaHorarios;
      consulta: string;
      atualizando: boolean;
    };

type Resultado = { chave: string; estado: EstadoDosHorarios };

function mensagemDeErro(erro: unknown) {
  if (erro instanceof ApiError && erro.status >= 500) {
    return `Não foi possível consultar o backend (HTTP ${erro.status}). Confira se ele está em execução e tente novamente.`;
  }

  return erro instanceof Error
    ? erro.message
    : 'Não foi possível carregar os horários.';
}

export default function useHorarios(consulta: string, ativo: boolean) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado>();
  const chave = `${consulta}#${tentativa}`;

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const controller = new AbortController();

    buscarHorarios(consulta, controller.signal)
      .then((dados) => {
        setResultado({
          chave,
          estado: { status: 'pronto', dados, consulta, atualizando: false },
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

  let estado: EstadoDosHorarios = { status: 'carregando' };
  if (resultado?.chave === chave) {
    estado = resultado.estado;
  } else if (resultado?.estado.status === 'pronto') {
    estado = { ...resultado.estado, atualizando: true };
  }

  return { estado, recarregar };
}
