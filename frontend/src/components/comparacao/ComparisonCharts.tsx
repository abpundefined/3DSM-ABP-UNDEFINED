import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ServicoComparacao } from '../../types/comparacao';
import type { MetricaRanking } from '../../types/ranking';
import { formatarNumero } from '../../utils/ranking';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const CORES_SERVICOS = ['#00661c', '#a65f00', '#5c58a5', '#007b83', '#a3415d'];

function formatarInicio(value: string, hourly: boolean) {
  const date = new Date(value);
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    ...(hourly
      ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit' }),
  });
}

function valorDoServico(service: ServicoComparacao, metric: MetricaRanking) {
  return metric === 'energia'
    ? service.totais.energiaKwh
    : service.totais.emissaoGCo2e;
}

function valorDoPonto(
  service: ServicoComparacao,
  pointIndex: number,
  metric: MetricaRanking,
) {
  const point = service.serie[pointIndex];
  return metric === 'energia' ? point.energiaKwh : point.emissaoGCo2e;
}

export default function ComparisonCharts({
  services,
  metric,
  onMetricChange,
  hourly,
}: {
  services: ServicoComparacao[];
  metric: MetricaRanking;
  onMetricChange: (metric: MetricaRanking) => void;
  hourly: boolean;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const isEnergy = metric === 'energia';
  const label = isEnergy ? 'Energia' : 'Emissão';
  const unit = isEnergy ? 'kWh' : 'gCO₂e';
  const data = services.map((service) => ({
    servicoId: service.servicoId,
    nome: service.nome,
    valor: valorDoServico(service, metric),
  }));
  const firstSeries = services[0]?.serie ?? [];
  const hasTotals = data.some((item) => item.valor !== null);
  const hasSeries = services.some((service) =>
    service.serie.some((point) =>
      metric === 'energia'
        ? point.energiaKwh !== null
        : point.emissaoGCo2e !== null,
    ),
  );
  const seriesData = firstSeries.map((point, pointIndex) => {
    const row: Record<string, string | number | null> = {
      inicio: point.inicio,
    };
    for (const service of services) {
      row[`servico-${service.servicoId}`] = valorDoPonto(
        service,
        pointIndex,
        metric,
      );
    }
    return row;
  });

  return (
    <section
      className="comparison-charts"
      aria-labelledby="comparison-chart-title"
    >
      <div className="comparison-chart-heading">
        <div>
          <h2 id="comparison-chart-title">Gráficos da comparação</h2>
          <p>As mesmas cores identificam cada serviço nos dois gráficos.</p>
        </div>
        <div
          className="comparison-metric-toggle"
          role="group"
          aria-label="Métrica dos gráficos"
        >
          <button
            type="button"
            aria-pressed={isEnergy}
            onClick={() => onMetricChange('energia')}
          >
            Energia
          </button>
          <button
            type="button"
            aria-pressed={!isEnergy}
            onClick={() => onMetricChange('emissao')}
          >
            Emissão
          </button>
        </div>
      </div>
      <ul className="comparison-chart-legend" aria-label="Legenda dos serviços">
        {services.map((service, index) => (
          <li key={service.servicoId}>
            <span
              aria-hidden="true"
              style={{
                backgroundColor: CORES_SERVICOS[index % CORES_SERVICOS.length],
              }}
            />
            {service.nome}
          </li>
        ))}
      </ul>
      <div className="comparison-chart-grid">
        <section
          className="comparison-chart-panel"
          aria-labelledby="comparison-totals-chart-title"
        >
          <h3 id="comparison-totals-chart-title">Totais por serviço</h3>
          {hasTotals ? (
            <div
              className="comparison-chart-canvas"
              role="img"
              aria-label={`Gráfico de barras dos totais de ${label.toLocaleLowerCase('pt-BR')} em ${unit}`}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data}
                  margin={{ top: 12, right: 12, bottom: 8 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="nome"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis
                    unit={` ${unit}`}
                    tickFormatter={formatarNumero}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    width={72}
                  />
                  <Tooltip
                    formatter={(value) => [
                      value === null
                        ? 'Sem dados'
                        : `${formatarNumero(Number(value))} ${unit}`,
                      label,
                    ]}
                    contentStyle={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                  <Bar
                    dataKey="valor"
                    name={label}
                    isAnimationActive={!reduceMotion}
                    maxBarSize={44}
                  >
                    {data.map((item, index) => (
                      <Cell
                        key={item.servicoId}
                        fill={CORES_SERVICOS[index % CORES_SERVICOS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="comparison-chart-empty" role="status">
              Sem dados de {label.toLocaleLowerCase('pt-BR')} no período.
            </p>
          )}
        </section>
        <section
          className="comparison-chart-panel"
          aria-labelledby="comparison-series-chart-title"
        >
          <h3 id="comparison-series-chart-title">Evolução no período</h3>
          {hasSeries ? (
            <div
              className="comparison-chart-canvas"
              role="img"
              aria-label={`Gráfico de linhas da evolução de ${label.toLocaleLowerCase('pt-BR')} em ${unit}`}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={seriesData}
                  margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="inicio"
                    tickFormatter={(value: string) =>
                      formatarInicio(value, hourly)
                    }
                    minTickGap={24}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    unit={` ${unit}`}
                    tickFormatter={formatarNumero}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    width={72}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      formatarInicio(String(value), hourly)
                    }
                    formatter={(value, name) => [
                      value === null
                        ? 'Sem dados'
                        : `${formatarNumero(Number(value))} ${unit}`,
                      name,
                    ]}
                    contentStyle={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                  {services.map((service, index) => (
                    <Line
                      key={service.servicoId}
                      type="monotone"
                      dataKey={`servico-${service.servicoId}`}
                      name={service.nome}
                      stroke={CORES_SERVICOS[index % CORES_SERVICOS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                      isAnimationActive={!reduceMotion}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="comparison-chart-empty" role="status">
              Sem dados de {label.toLocaleLowerCase('pt-BR')} na série do
              período.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
