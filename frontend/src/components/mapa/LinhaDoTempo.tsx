import { useEffect, useState } from 'react';
import { proximoIndice } from '../../utils/linhaDoTempo';
import { formatarEmissao } from '../../utils/mapaEscala';

export const PASSO_DA_REPRODUCAO_MS = 900;

type LinhaDoTempoProps = {
  rotulos: string[];
  indice: number | null;
  emissaoNoMomento: number | null;
  onMudar: (indice: number | null) => void;
};

export default function LinhaDoTempo({
  rotulos,
  indice,
  emissaoNoMomento,
  onMudar,
}: LinhaDoTempoProps) {
  const [tocando, setTocando] = useState(false);
  const total = rotulos.length;
  const ultimo = total - 1;

  useEffect(() => {
    if (!tocando) {
      return;
    }

    const temporizador = window.setTimeout(() => {
      const proximo = proximoIndice(indice, total);
      onMudar(proximo);
      if (proximo === null || proximo >= ultimo) {
        setTocando(false);
      }
    }, PASSO_DA_REPRODUCAO_MS);

    return () => window.clearTimeout(temporizador);
  }, [indice, onMudar, tocando, total, ultimo]);

  function alternarReproducao() {
    if (tocando) {
      setTocando(false);
      return;
    }
    if (indice === null || indice >= ultimo) {
      onMudar(0);
    }
    setTocando(ultimo > 0);
  }

  function escolher(proximo: number | null) {
    setTocando(false);
    onMudar(proximo);
  }

  const rotuloAtual = indice === null ? 'Período inteiro' : rotulos[indice];
  const emissao =
    emissaoNoMomento === null ? 'sem dados' : formatarEmissao(emissaoNoMomento);

  return (
    <section className="linha-do-tempo" aria-label="Linha do tempo">
      <button
        type="button"
        className="linha-do-tempo-tocar"
        onClick={alternarReproducao}
      >
        {tocando ? 'Pausar' : 'Reproduzir'}
      </button>
      <input
        type="range"
        className={`linha-do-tempo-trilho${indice === null ? ' linha-do-tempo-trilho--inativo' : ''}`}
        min={0}
        max={Math.max(0, ultimo)}
        step={1}
        value={indice ?? 0}
        aria-label="Intervalo exibido"
        aria-valuetext={rotuloAtual}
        onChange={(evento) => escolher(Number(evento.target.value))}
      />
      <p className="linha-do-tempo-momento">
        <strong>{rotuloAtual}</strong>
        <span>
          {indice === null ? 'Total do período' : 'Emissão no intervalo'}:{' '}
          {emissao}
        </span>
      </p>
      <button
        type="button"
        className="linha-do-tempo-periodo"
        onClick={() => escolher(null)}
        disabled={indice === null}
      >
        Ver período inteiro
      </button>
    </section>
  );
}
