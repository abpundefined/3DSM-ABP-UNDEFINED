import { useId, useState } from 'react';
import type { DailyImpact, ImpactMetric } from '../../types/dashboard';
import { formatNumber } from '../dashboard/demoPresentation';

const metricOptions = {
  energyKwh: { label: 'Energia', unit: 'kWh', tickStep: 5 },
  carbonKg: { label: 'Emissões', unit: 'kgCO₂e', tickStep: 0.4 },
};

export default function ImpactTrendChart({
  history,
}: {
  history: DailyImpact[];
}) {
  const headingId = useId();
  const [metric, setMetric] = useState<ImpactMetric>('energyKwh');
  const [activeIndex, setActiveIndex] = useState(history.length - 1);
  const option = metricOptions[metric];
  const maximum = Math.max(
    option.tickStep,
    ...history.map((point) => point[metric]),
  );
  const upperLimit = Math.ceil(maximum / option.tickStep) * option.tickStep;
  const total = history.reduce((sum, point) => sum + point[metric], 0);
  const points = history.map((point, index) => ({
    ...point,
    x: 55 + index * (600 / Math.max(history.length - 1, 1)),
    y: 205 - (point[metric] / upperLimit) * 170,
  }));
  const activePoint = points[activeIndex];
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const firstPoint = points.at(0);
  const lastPoint = points.at(-1);

  return (
    <section className="demo-panel trend-panel" aria-labelledby={headingId}>
      <div className="chart-heading">
        <div>
          <p className="eyebrow">EVOLUÇÃO DO IMPACTO</p>
          <h2 id={headingId}>{option.label} ao longo do tempo</h2>
        </div>
        <div
          className="chart-switch"
          role="group"
          aria-label="Indicador do gráfico"
        >
          {(Object.keys(metricOptions) as ImpactMetric[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={metric === value}
              onClick={() => setMetric(value)}
            >
              {metricOptions[value].label}
            </button>
          ))}
        </div>
      </div>
      <div className="trend-summary">
        <div>
          <strong>{formatNumber(total)}</strong>
          <span>{option.unit} no período</span>
        </div>
        <p>01 a 07 de outubro de 2026</p>
      </div>
      <svg
        className="trend-svg"
        viewBox="0 0 690 250"
        role="group"
        aria-label={`${option.label} por dia, dados fictícios`}
      >
        <title>
          Hist?rico de {option.label.toLowerCase()} de 01 a 07 de outubro
        </title>
        {Array.from({ length: 5 }, (_, index) => {
          const value = (upperLimit * index) / 4;
          const y = 205 - index * 42.5;
          return (
            <g key={index} aria-hidden="true">
              <line x1="55" x2="655" y1={y} y2={y} className="chart-gridline" />
              <text x="44" y={y + 4} textAnchor="end" className="axis-label">
                {formatNumber(value, metric === 'energyKwh' ? 0 : 1)}
              </text>
            </g>
          );
        })}
        {firstPoint && lastPoint && (
          <polygon
            points={`${firstPoint.x},205 ${line} ${lastPoint.x},205`}
            className="trend-area"
            aria-hidden="true"
          />
        )}
        <polyline
          points={line}
          className="trend-line"
          fill="none"
          aria-hidden="true"
        />
        {activePoint && (
          <line
            x1={activePoint.x}
            x2={activePoint.x}
            y1={activePoint.y}
            y2="205"
            className="trend-marker"
            aria-hidden="true"
          />
        )}
        {points.map((point, index) => (
          <g key={point.date}>
            <text
              x={point.x}
              y="234"
              textAnchor="middle"
              className="axis-label"
              aria-hidden="true"
            >
              {point.label}
            </text>
            <circle
              className={`trend-point${index === activeIndex ? ' is-active' : ''}`}
              cx={point.x}
              cy={point.y}
              r={index === activeIndex ? 6 : 4}
              tabIndex={0}
              role="img"
              aria-label={`${point.label}: ${formatNumber(point[metric])} ${option.unit}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
            />
          </g>
        ))}
      </svg>
      <p className="trend-readout" role="status">
        {activePoint && (
          <>
            <span className="chart-legend-dot" />
            {activePoint.label}
            <strong>
              {formatNumber(activePoint[metric])} {option.unit}
            </strong>
            <span className="readout-note">estimados · exemplo</span>
          </>
        )}
      </p>
      <details className="chart-data">
        <summary>Ver valores do gráfico</summary>
        <table>
          <caption className="sr-only">
            Dados fictícios diários de {option.label.toLowerCase()}
          </caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">
                {option.label} ({option.unit})
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((point) => (
              <tr key={point.date}>
                <th scope="row">
                  <time dateTime={point.date}>{point.label}</time>
                </th>
                <td>{formatNumber(point[metric])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
