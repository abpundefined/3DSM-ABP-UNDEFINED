import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ResumoSerieRelatorio } from '../../types/relatorio';
import {
  formatHistoryDate,
  formatHistoryNumber,
} from '../../utils/serviceHistory';
import { toFiniteNumber } from '../../utils/formatters';

type GraficoSerieProps = {
  titulo: string;
  dataKey: 'emissao' | 'energia';
  unidade: string;
  cor: string;
  classeModificadora: string;
  serie: ResumoSerieRelatorio;
};

function GraficoSerie({
  titulo,
  dataKey,
  unidade,
  cor,
  classeModificadora,
  serie,
}: GraficoSerieProps) {
  return (
    <article
      className={`relatorio-chart ${classeModificadora}`}
      aria-label={`${titulo} em ${unidade}`}
    >
      <h3>
        {titulo} ({unidade})
      </h3>
      <div
        className="relatorio-chart-canvas"
        role="img"
        aria-label={`Gráfico de linha de ${titulo.toLocaleLowerCase('pt-BR')} em ${unidade}`}
      >
        <ResponsiveContainer width="100%" height={220} minWidth={0}>
          <LineChart
            data={serie.pontos}
            margin={{ top: 12, right: 12, bottom: 8, left: 4 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="inicio"
              tickFormatter={(valor: string) =>
                formatHistoryDate(valor, serie.granularidadeHoraria)
              }
              minTickGap={24}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tickFormatter={(valor: number) => formatHistoryNumber(valor)}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
              width={56}
            />
            <Tooltip
              labelFormatter={(valor) =>
                formatHistoryDate(String(valor), serie.granularidadeHoraria)
              }
              formatter={(valor) => {
                const numero = toFiniteNumber(valor);
                return [
                  numero === null
                    ? '—'
                    : `${formatHistoryNumber(numero)} ${unidade}`,
                  titulo,
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
              dataKey={dataKey}
              name={titulo}
              stroke={cor}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export default function RelatorioTendencia({
  serie,
}: {
  serie: ResumoSerieRelatorio;
}) {
  return (
    <section
      className="relatorio-section"
      aria-labelledby="relatorio-tendencia-title"
    >
      <div className="relatorio-section-head">
        <div>
          <h2 id="relatorio-tendencia-title">Tendência no período</h2>
          <p className="relatorio-section-description">
            Evolução consolidada por{' '}
            {serie.granularidadeHoraria ? 'hora' : 'dia'} (fuso de Brasília),
            com gráficos separados para emissão e energia.
          </p>
        </div>
      </div>

      {serie.possuiDados ? (
        <div className="relatorio-charts-grid">
          <GraficoSerie
            titulo="Emissão de CO₂e"
            dataKey="emissao"
            unidade={serie.escalaEmissao.unidade}
            cor="var(--chart-emissao)"
            classeModificadora="relatorio-chart--emissao"
            serie={serie}
          />
          <GraficoSerie
            titulo="Consumo de energia"
            dataKey="energia"
            unidade={serie.escalaEnergia.unidade}
            cor="var(--chart-energia)"
            classeModificadora="relatorio-chart--energia"
            serie={serie}
          />
        </div>
      ) : (
        <p className="relatorio-empty-note" role="status">
          Sem série temporal disponível para o período selecionado.
        </p>
      )}
    </section>
  );
}
