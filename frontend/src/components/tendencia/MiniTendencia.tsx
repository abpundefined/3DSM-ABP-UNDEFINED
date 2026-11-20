import usePeriod from '../../hooks/usePeriod';
import { rotuloDaMiniTendencia, segmentosDaMiniatura } from '../../utils/serie';
import './tendencia.css';

const LARGURA = 120;
const ALTURA = 28;

export default function MiniTendencia({
  valores,
}: {
  valores: (number | null)[];
}) {
  const { period } = usePeriod();

  return (
    <div className="mini-tendencia">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {segmentosDaMiniatura(valores, LARGURA, ALTURA).map((pontos) => (
          <polyline key={pontos} points={pontos} />
        ))}
      </svg>
      <p>{rotuloDaMiniTendencia(valores, period)}</p>
    </div>
  );
}
