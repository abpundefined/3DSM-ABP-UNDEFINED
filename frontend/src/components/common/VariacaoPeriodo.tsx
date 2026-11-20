import type { PeriodoConsultado } from '../../types/mapa';
import { descreverJanelaAnterior } from '../../utils/variacao';
import './variacao.css';

const percentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export default function VariacaoPeriodo({
  valor,
  periodo,
}: {
  valor: number | null;
  periodo?: PeriodoConsultado;
}) {
  const estado =
    valor === null
      ? 'sem-base'
      : valor > 0
        ? 'alerta'
        : valor < 0
          ? 'melhoria'
          : 'estavel';
  const descricao =
    valor === null
      ? 'Sem base de comparação'
      : valor > 0
        ? 'Alerta: aumento'
        : valor < 0
          ? 'Melhoria: redução'
          : 'Sem alteração';
  const texto =
    valor === null
      ? 'sem base de comparação'
      : `${valor > 0 ? '▲' : valor < 0 ? '▼' : '—'} ${percentual.format(Math.abs(valor))}%${periodo ? ` em relação ${descreverJanelaAnterior(periodo)}` : ''}`;

  return (
    <span className={`variacao variacao--${estado}`} title={descricao}>
      {texto}
    </span>
  );
}
