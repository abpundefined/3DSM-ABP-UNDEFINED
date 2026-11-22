import { useLayoutEffect, useRef } from 'react';
import {
  calcularDeslocamentoFlip,
  DURACAO_TRANSICAO_ORDEM_MS,
} from '../utils/animacao';
import usePrefersReducedMotion from './usePrefersReducedMotion';

export default function useFlipList<T extends HTMLElement>(chaveOrdem: string) {
  const containerRef = useRef<T | null>(null);
  const posicoesAnteriores = useRef<Map<string, DOMRect>>(new Map());
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const elementos = Array.from(
      container.querySelectorAll<HTMLElement>('[data-flip-id]'),
    );
    const proximasPosicoes = new Map<string, DOMRect>();
    const possuiHistorico = posicoesAnteriores.current.size > 0;

    for (const elemento of elementos) {
      const id = elemento.dataset.flipId;
      if (!id) {
        continue;
      }

      const rectAtual = elemento.getBoundingClientRect();
      proximasPosicoes.set(id, rectAtual);

      if (prefersReducedMotion || typeof elemento.animate !== 'function') {
        continue;
      }

      const rectAnterior = posicoesAnteriores.current.get(id);
      if (rectAnterior) {
        const deslocamento = calcularDeslocamentoFlip(rectAnterior, rectAtual);
        if (deslocamento) {
          elemento.animate(
            [
              {
                transform: `translate(${deslocamento.dx}px, ${deslocamento.dy}px)`,
              },
              { transform: 'translate(0, 0)' },
            ],
            {
              duration: DURACAO_TRANSICAO_ORDEM_MS,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
          );
        }
      } else if (possuiHistorico) {
        elemento.animate(
          [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 200,
            easing: 'ease-out',
          },
        );
      }
    }

    posicoesAnteriores.current = proximasPosicoes;
  }, [chaveOrdem, prefersReducedMotion]);

  return containerRef;
}
