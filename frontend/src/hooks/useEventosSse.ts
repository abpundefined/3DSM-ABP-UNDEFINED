import { useEffect, useRef, useState } from 'react';
import {
  ATRASO_RECONEXAO_SSE_MS,
  CAMINHO_EVENTOS_SSE,
  interpretarEventoColetaRegistrada,
  interpretarEventoEstadoAlterado,
  interpretarEventoTempoReal,
  type EventoTempoRealSse,
} from '../utils/eventosSse';
import { MODO_DEMO_ESTATICO } from '../utils/modoDemo';

export type StatusConexaoSse =
  'inativo' | 'conectando' | 'conectado' | 'fallback';

export default function useEventosSse({
  ativo = true,
  onEvento,
}: {
  ativo?: boolean;
  onEvento: (evento: EventoTempoRealSse) => void;
}): {
  status: StatusConexaoSse;
} {
  const podeConectar =
    ativo &&
    !MODO_DEMO_ESTATICO &&
    typeof window !== 'undefined' &&
    typeof window.EventSource === 'function';

  const [status, setStatus] = useState<StatusConexaoSse>(() => {
    if (!ativo || MODO_DEMO_ESTATICO) {
      return 'inativo';
    }
    return podeConectar ? 'conectando' : 'fallback';
  });

  const onEventoRef = useRef(onEvento);
  useEffect(() => {
    onEventoRef.current = onEvento;
  }, [onEvento]);

  useEffect(() => {
    if (!ativo || MODO_DEMO_ESTATICO) {
      setStatus('inativo');
      return;
    }

    if (
      typeof window === 'undefined' ||
      typeof window.EventSource !== 'function'
    ) {
      setStatus('fallback');
      return;
    }

    let cancelado = false;
    let eventSource: EventSource | null = null;
    let timerReconexao: number | null = null;

    const limparTimerReconexao = () => {
      if (timerReconexao !== null) {
        window.clearTimeout(timerReconexao);
        timerReconexao = null;
      }
    };

    const fecharFonteAtual = () => {
      if (eventSource !== null) {
        eventSource.close();
        eventSource = null;
      }
    };

    const conectar = () => {
      if (cancelado) {
        return;
      }

      limparTimerReconexao();
      fecharFonteAtual();

      try {
        const fonte = new window.EventSource(CAMINHO_EVENTOS_SSE);
        eventSource = fonte;

        fonte.addEventListener('open', () => {
          if (cancelado) {
            return;
          }
          limparTimerReconexao();
          setStatus('conectado');
        });

        fonte.addEventListener('coleta-registrada', (event: Event) => {
          if (cancelado) {
            return;
          }
          const messageEvent = event as MessageEvent;
          const evento = interpretarEventoColetaRegistrada(messageEvent.data);
          if (evento) {
            setStatus('conectado');
            onEventoRef.current(evento);
          }
        });

        fonte.addEventListener('estado-alterado', (event: Event) => {
          if (cancelado) {
            return;
          }
          const messageEvent = event as MessageEvent;
          const evento = interpretarEventoEstadoAlterado(messageEvent.data);
          if (evento) {
            setStatus('conectado');
            onEventoRef.current(evento);
          }
        });

        fonte.addEventListener('message', (event: Event) => {
          if (cancelado) {
            return;
          }
          const messageEvent = event as MessageEvent;
          const evento = interpretarEventoTempoReal(messageEvent.data);
          if (evento) {
            setStatus('conectado');
            onEventoRef.current(evento);
          }
        });

        fonte.addEventListener('error', () => {
          if (cancelado) {
            return;
          }
          setStatus('fallback');
          fecharFonteAtual();
          limparTimerReconexao();
          timerReconexao = window.setTimeout(() => {
            conectar();
          }, ATRASO_RECONEXAO_SSE_MS);
        });
      } catch {
        if (!cancelado) {
          setStatus('fallback');
          limparTimerReconexao();
          timerReconexao = window.setTimeout(() => {
            conectar();
          }, ATRASO_RECONEXAO_SSE_MS);
        }
      }
    };

    setStatus('conectando');
    conectar();

    return () => {
      cancelado = true;
      limparTimerReconexao();
      fecharFonteAtual();
    };
  }, [ativo]);

  return { status };
}
