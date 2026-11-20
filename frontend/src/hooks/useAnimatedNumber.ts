import { useEffect, useRef, useState } from 'react';
import { DURACAO_CONTADOR_MS, interpolarValor } from '../utils/animacao';
import usePrefersReducedMotion from './usePrefersReducedMotion';

type EstadoAnimacao = {
  alvo: number | null;
  valorAtual: number | null;
  animando: boolean;
};

export default function useAnimatedNumber(
  alvo: number | null,
  duracaoMs = DURACAO_CONTADOR_MS,
): { valor: number | null; animando: boolean } {
  const prefersReducedMotion = usePrefersReducedMotion();
  const duracaoEfetiva = Math.min(Math.max(0, duracaoMs), 600);
  const ultimoValorVisivel = useRef<number>(0);
  const [estado, setEstado] = useState<EstadoAnimacao>(() => ({
    alvo,
    valorAtual: prefersReducedMotion ? alvo : alvo === null ? null : 0,
    animando: !prefersReducedMotion && alvo !== null && alvo !== 0,
  }));

  useEffect(() => {
    if (
      prefersReducedMotion ||
      alvo === null ||
      !Number.isFinite(alvo) ||
      duracaoEfetiva <= 0
    ) {
      if (alvo !== null && Number.isFinite(alvo)) {
        ultimoValorVisivel.current = alvo;
      }
      return;
    }

    const inicioValor = ultimoValorVisivel.current;
    if (inicioValor === alvo) {
      return;
    }

    let inicioTempo: number | null = null;
    let frameId = 0;

    const atualizarQuadro = (agora: number) => {
      if (inicioTempo === null) {
        inicioTempo = agora;
      }

      const progresso = Math.min(1, (agora - inicioTempo) / duracaoEfetiva);
      const proximoValor =
        progresso >= 1 ? alvo : interpolarValor(inicioValor, alvo, progresso);
      ultimoValorVisivel.current = proximoValor;

      setEstado({
        alvo,
        valorAtual: proximoValor,
        animando: progresso < 1,
      });

      if (progresso < 1) {
        frameId = window.requestAnimationFrame(atualizarQuadro);
      }
    };

    frameId = window.requestAnimationFrame(atualizarQuadro);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [alvo, duracaoEfetiva, prefersReducedMotion]);

  if (
    prefersReducedMotion ||
    alvo === null ||
    !Number.isFinite(alvo) ||
    duracaoEfetiva <= 0
  ) {
    return { valor: alvo, animando: false };
  }

  if (estado.alvo === alvo) {
    return { valor: estado.valorAtual, animando: estado.animando };
  }

  return {
    valor: ultimoValorVisivel.current,
    animando: ultimoValorVisivel.current !== alvo,
  };
}
