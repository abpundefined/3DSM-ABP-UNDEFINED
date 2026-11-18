import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatHistoryDate,
  formatHistoryNumber,
  type ScaledServiceHistoryPoint,
} from '../../utils/serviceHistory';
import { toFiniteNumber, type Escala } from '../../utils/formatters';

type ServiceHistoryChartProps = {
  metric: 'energia' | 'emissao';
  data: ScaledServiceHistoryPoint[];
  scale: Escala;
  hasData: boolean;
  hourly: boolean;
};

const labels = {
  energia: {
    title: 'Energia',
    axis: 'Energia',
    dataKey: 'energia',
  },
  emissao: {
    title: 'Emissão',
    axis: 'Emissão',
    dataKey: 'emissao',
  },
} as const;

export default function ServiceHistoryChart({
  metric,
  data,
  scale,
  hasData,
  hourly,
}: ServiceHistoryChartProps) {
  const label = labels[metric];

  return (
    <section
      className={`service-detail-chart service-detail-chart--${metric}`}
      aria-labelledby={`service-detail-chart-${metric}`}
    >
      <h3 id={`service-detail-chart-${metric}`}>
        {label.title} ao longo do período
      </h3>
      {hasData ? (
        <div
          className="service-detail-chart-canvas"
          role="img"
          aria-label={`Gráfico de linha de ${label.title.toLocaleLowerCase('pt-BR')} em ${scale.unidade}`}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={data}
              margin={{ top: 16, right: 12, bottom: 8, left: 8 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="inicio"
                tickFormatter={(value: string) =>
                  formatHistoryDate(value, hourly)
                }
                minTickGap={24}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                unit={` ${scale.unidade}`}
                label={{
                  value: `${label.axis} (${scale.unidade})`,
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--text-muted)',
                }}
                tickFormatter={(value: number) => formatHistoryNumber(value)}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
                width={68}
              />
              <Tooltip
                labelFormatter={(value) =>
                  formatHistoryDate(String(value), hourly)
                }
                formatter={(value) => {
                  const numericValue = toFiniteNumber(value);
                  return [
                    numericValue === null
                      ? '—'
                      : `${formatHistoryNumber(numericValue)} ${scale.unidade}`,
                    label.title,
                  ];
                }}
                contentStyle={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              />
              <Line
                type="monotone"
                dataKey={label.dataKey}
                name={label.title}
                stroke={
                  metric === 'energia'
                    ? 'var(--green-forest)'
                    : 'var(--service-detail-emission)'
                }
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="service-detail-chart-empty" role="status">
          Sem dados de {label.title.toLocaleLowerCase('pt-BR')} neste período.
        </p>
      )}
    </section>
  );
}
