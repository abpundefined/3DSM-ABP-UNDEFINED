import { useId } from 'react';
import type { EstadoDaSerie } from '../../hooks/useSerie';
import TendenciaImpacto from './TendenciaImpacto';
import './tendencia.css';

type PainelDaTendenciaProps = {
  estado: EstadoDaSerie;
  onRecarregar: () => void;
};

export default function PainelDaTendencia({
  estado,
  onRecarregar,
}: PainelDaTendenciaProps) {
  const tituloId = useId();

  if (estado.status === 'pronto') {
    return <TendenciaImpacto serie={estado.dados} />;
  }

  return (
    <section
      className="tendencia-painel"
      aria-labelledby={tituloId}
      aria-busy={estado.status === 'carregando' || undefined}
    >
      <div className="tendencia-cabecalho">
        <div>
          <p className="eyebrow">EVOLUÇÃO DO IMPACTO</p>
          <h2 id={tituloId}>Tendência no período</h2>
        </div>
      </div>
      {estado.status === 'carregando' ? (
        <p className="tendencia-aviso">Carregando a série do período...</p>
      ) : (
        <div className="tendencia-erro">
          <p className="tendencia-aviso">
            Não foi possível carregar a tendência. {estado.mensagem}
          </p>
          <button
            className="button button--primary"
            type="button"
            onClick={onRecarregar}
          >
            Recarregar a tendência
          </button>
        </div>
      )}
    </section>
  );
}
