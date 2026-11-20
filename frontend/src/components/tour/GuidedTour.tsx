import { useEffect, useId, useMemo, useRef, useState } from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  anteriorIndiceTour,
  filtrarPassosDisponiveis,
  PASSOS_TOUR,
  proximoIndiceTour,
  type PassoTour,
} from '../../utils/tour';
import './guided-tour.css';

type GuidedTourProps = {
  aberto: boolean;
  focarAoAbrir: boolean;
  returnFocusTo: HTMLElement | null;
  onFechar: () => void;
  passos?: readonly PassoTour[];
};

function encontrarElementoVisivel(seletor: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const candidatos = Array.from(
    document.querySelectorAll<HTMLElement>(seletor),
  );
  if (candidatos.length === 0) {
    return null;
  }

  for (const elemento of candidatos) {
    if (elemento.hidden) {
      continue;
    }
    const estilo = window.getComputedStyle(elemento);
    if (estilo.display === 'none' || estilo.visibility === 'hidden') {
      continue;
    }
    // Em navegadores reais, getClientRects diferencia links ocultos (ex.: nav mobile/desktop).
    // Em jsdom, todos os rects são vazios, então aceitamos o primeiro não oculto por CSS.
    if (elemento.getClientRects().length > 0) {
      return elemento;
    }
  }

  const primeiroVisivelCss = candidatos.find((elemento) => {
    if (elemento.hidden) {
      return false;
    }
    const estilo = window.getComputedStyle(elemento);
    return estilo.display !== 'none' && estilo.visibility !== 'hidden';
  });

  return primeiroVisivelCss ?? null;
}

export default function GuidedTour({
  aberto,
  focarAoAbrir,
  returnFocusTo,
  onFechar,
  passos = PASSOS_TOUR,
}: GuidedTourProps) {
  const tituloId = useId();
  const descricaoId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [indice, setIndice] = useState(0);
  const [passosAtivos, setPassosAtivos] = useState<PassoTour[]>([]);
  const houveInteracaoRef = useRef(false);

  const passoAtual = useMemo(
    () => passosAtivos[indice] ?? null,
    [indice, passosAtivos],
  );

  useEffect(() => {
    if (!aberto) {
      return;
    }

    let cancelado = false;
    let frame = 0;
    let observer: MutationObserver | null = null;

    const inicializarPassos = () => {
      if (cancelado) {
        return;
      }

      const conteudo = document.getElementById('conteudo');
      const carregandoPagina = Boolean(
        conteudo?.querySelector('.loading-skeleton--page'),
      );
      if (carregandoPagina && conteudo && !observer) {
        observer = new MutationObserver(() => {
          if (!conteudo.querySelector('.loading-skeleton--page')) {
            observer?.disconnect();
            observer = null;
            frame = window.requestAnimationFrame(inicializarPassos);
          }
        });
        observer.observe(conteudo, { childList: true, subtree: true });
        return;
      }

      const disponiveis = filtrarPassosDisponiveis(
        passos,
        (seletor) => encontrarElementoVisivel(seletor) !== null,
      );
      if (disponiveis.length === 0) {
        onFechar();
        return;
      }
      setPassosAtivos(disponiveis);
      setIndice(0);
      houveInteracaoRef.current = focarAoAbrir;
      if (focarAoAbrir) {
        window.requestAnimationFrame(() => {
          if (!cancelado) {
            dialogRef.current?.focus();
          }
        });
      }
    };

    frame = window.requestAnimationFrame(inicializarPassos);

    return () => {
      cancelado = true;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [aberto, focarAoAbrir, onFechar, passos]);

  useEffect(() => {
    if (!aberto || !passoAtual) {
      return;
    }

    const alvo = encontrarElementoVisivel(passoAtual.seletor);
    if (!alvo) {
      return;
    }

    alvo.classList.add('tour-target-highlight');
    if (typeof alvo.scrollIntoView === 'function') {
      alvo.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }

    return () => {
      alvo.classList.remove('tour-target-highlight');
    };
  }, [aberto, passoAtual, prefersReducedMotion]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onFechar();
        if (houveInteracaoRef.current && returnFocusTo) {
          returnFocusTo.focus();
        }
        return;
      }

      if (!dialogRef.current?.contains(document.activeElement)) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const proximo = proximoIndiceTour(indice, passosAtivos.length);
        if (proximo === null) {
          onFechar();
          if (houveInteracaoRef.current && returnFocusTo) {
            returnFocusTo.focus();
          }
        } else {
          houveInteracaoRef.current = true;
          setIndice(proximo);
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        houveInteracaoRef.current = true;
        setIndice((atual) => anteriorIndiceTour(atual));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, indice, onFechar, passosAtivos.length, returnFocusTo]);

  if (!aberto || !passoAtual) {
    return null;
  }

  const ultimoPasso = indice + 1 >= passosAtivos.length;

  function fecharERetornarFoco() {
    onFechar();
    if (houveInteracaoRef.current && returnFocusTo) {
      returnFocusTo.focus();
    }
  }

  function avancar() {
    houveInteracaoRef.current = true;
    const proximo = proximoIndiceTour(indice, passosAtivos.length);
    if (proximo === null) {
      fecharERetornarFoco();
      return;
    }
    setIndice(proximo);
  }

  function voltar() {
    houveInteracaoRef.current = true;
    setIndice((atual) => anteriorIndiceTour(atual));
  }

  return (
    <div
      ref={dialogRef}
      className="guided-tour"
      role="dialog"
      aria-modal="false"
      aria-labelledby={tituloId}
      aria-describedby={descricaoId}
      tabIndex={-1}
    >
      <div className="guided-tour-topo">
        <span className="guided-tour-progresso">
          Tour guiado · Passo {indice + 1} de {passosAtivos.length}
        </span>
        <button
          type="button"
          className="guided-tour-fechar"
          aria-label="Fechar tour"
          onClick={fecharERetornarFoco}
        >
          ×
        </button>
      </div>

      <h2 id={tituloId} className="guided-tour-titulo">
        {passoAtual.titulo}
      </h2>
      <p id={descricaoId} className="guided-tour-descricao">
        {passoAtual.descricao}
      </p>

      <div className="guided-tour-acoes">
        <button
          type="button"
          className="guided-tour-pular"
          onClick={fecharERetornarFoco}
        >
          Pular tour
        </button>
        <div className="guided-tour-navegacao">
          {indice > 0 && (
            <button
              type="button"
              className="guided-tour-btn guided-tour-btn--secundario"
              onClick={voltar}
            >
              Anterior
            </button>
          )}
          <button
            type="button"
            className="guided-tour-btn guided-tour-btn--primario"
            onClick={avancar}
          >
            {ultimoPasso ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}
