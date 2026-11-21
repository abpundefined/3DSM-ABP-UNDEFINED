import { type MouseEvent, useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import {
  calcularAcumuladoCo2,
  formatarGramasContador,
  formatarTaxaGPorSegundo,
  INTERVALO_ANUNCIO_LEITOR_TELA_MS,
  INTERVALO_ATUALIZACAO_CONTADOR_MS,
  INTERVALO_CONTADOR_MOVIMENTO_REDUZIDO_MS,
  montarFraseContadorCo2,
} from '../../utils/contadorCo2';
import { MEDIA_MODO_TV_DESKTOP } from '../../utils/modoTv';
import './contador-co2.css';

type ContadorCo2AoVivoProps = {
  taxaGPorSegundo: number;
  variante?: 'dashboard' | 'tv';
  isDemo?: boolean;
};

export default function ContadorCo2AoVivo({
  taxaGPorSegundo,
  variante = 'dashboard',
  isDemo = false,
}: ContadorCo2AoVivoProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [ehDesktop, setEhDesktop] = useState(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return true;
    }
    return window.matchMedia(MEDIA_MODO_TV_DESKTOP).matches;
  });
  const [acumuladoG, setAcumuladoG] = useState(0);
  const [cicloReset, setCicloReset] = useState(0);
  const [anuncioLeitorTela, setAnuncioLeitorTela] = useState('');
  const taxaRef = useRef(taxaGPorSegundo);
  const acumuladoRef = useRef(0);
  const ultimoTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mediaQuery = window.matchMedia(MEDIA_MODO_TV_DESKTOP);
    const atualizar = (event: MediaQueryListEvent) =>
      setEhDesktop(event.matches);
    mediaQuery.addEventListener('change', atualizar);
    return () => mediaQuery.removeEventListener('change', atualizar);
  }, []);

  useEffect(() => {
    taxaRef.current = taxaGPorSegundo;
  }, [taxaGPorSegundo]);

  const ativo =
    ehDesktop && Number.isFinite(taxaGPorSegundo) && taxaGPorSegundo > 0;

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const intervaloMs = prefersReducedMotion
      ? INTERVALO_CONTADOR_MOVIMENTO_REDUZIDO_MS
      : INTERVALO_ATUALIZACAO_CONTADOR_MS;
    ultimoTickRef.current = Date.now();

    const timer = window.setInterval(() => {
      const agora = Date.now();
      const base = ultimoTickRef.current ?? agora;
      const segundos = Math.max(0, (agora - base) / 1000);
      ultimoTickRef.current = agora;

      const incremento = calcularAcumuladoCo2(taxaRef.current, segundos);
      if (incremento > 0) {
        const proximo = acumuladoRef.current + incremento;
        acumuladoRef.current = proximo;
        setAcumuladoG(proximo);
      }
    }, intervaloMs);

    return () => window.clearInterval(timer);
  }, [ativo, cicloReset, prefersReducedMotion]);

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const timerAnuncio = window.setInterval(() => {
      setAnuncioLeitorTela(montarFraseContadorCo2(acumuladoRef.current));
    }, INTERVALO_ANUNCIO_LEITOR_TELA_MS);

    return () => window.clearInterval(timerAnuncio);
  }, [ativo, cicloReset]);

  if (!ativo) {
    return null;
  }

  function handleRecomecar(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    acumuladoRef.current = 0;
    ultimoTickRef.current = Date.now();
    setAcumuladoG(0);
    setCicloReset((atual) => atual + 1);
    setAnuncioLeitorTela(`Contador reiniciado. ${montarFraseContadorCo2(0)}.`);
  }

  const valorFormatado = formatarGramasContador(acumuladoG);

  return (
    <section
      className={`contador-co2 contador-co2--${variante}`}
      aria-label="Contador ao vivo de CO₂e"
      onClick={(event) => {
        if (variante === 'tv') {
          event.stopPropagation();
        }
      }}
    >
      <div className="contador-co2-conteudo">
        <span
          className={`contador-co2-pulso${prefersReducedMotion ? ' contador-co2-pulso--estatico' : ''}`}
          aria-hidden="true"
        />
        <p className="contador-co2-texto">
          Desde que você chegou, os serviços emitiram{' '}
          <strong className="contador-co2-valor">{valorFormatado} g</strong> de
          CO₂e
        </p>
        <span className="contador-co2-taxa">
          {isDemo ? 'Taxa ilustrativa' : 'Taxa atual'}:{' '}
          {formatarTaxaGPorSegundo(taxaGPorSegundo)}
        </span>
      </div>

      <button
        type="button"
        className="contador-co2-recomecar"
        onClick={handleRecomecar}
      >
        Recomeçar
      </button>

      <span
        className="contador-co2-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {anuncioLeitorTela}
      </span>
    </section>
  );
}
