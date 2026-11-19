import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import type { Granularidade } from '../../types/serie';
import { formatarNumero } from '../../utils/ranking';
import {
  rotuloCompletoDoIntervalo,
  rotuloDoIntervalo,
} from '../../utils/serie';
import {
  ALTURA_DO_GRAFICO,
  estiloDoTooltip,
  textoDoEixo,
} from './estiloDosGraficos';

export type PontoDaLinha = { inicio: string; valor: number | null };

type GraficoDeLinhaProps = {
  pontos: PontoDaLinha[];
  granularidade: Granularidade;
  rotulo: string;
  unidade: string;
  cor: string;
};

export default function GraficoDeLinha({
  pontos,
  granularidade,
  rotulo,
  unidade,
  cor,
}: GraficoDeLinhaProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <ResponsiveContainer width="100%" height={ALTURA_DO_GRAFICO}>
      <LineChart
        data={pontos}
        margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="inicio"
          tick={textoDoEixo}
          tickFormatter={(inicio: string) =>
            rotuloDoIntervalo(inicio, granularidade)
          }
          minTickGap={24}
        />
        <YAxis
          width={64}
          tick={textoDoEixo}
          tickFormatter={formatarNumero}
          label={{
            value: unidade,
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--text-muted)',
            fontSize: 12,
          }}
        />
        <Tooltip
          contentStyle={estiloDoTooltip}
          labelFormatter={(inicio) =>
            rotuloCompletoDoIntervalo(String(inicio), granularidade)
          }
          formatter={(valor) => [
            `${formatarNumero(Number(valor))} ${unidade}`,
            rotulo,
          ]}
        />
        <Line
          type="monotone"
          dataKey="valor"
          name={rotulo}
          stroke={cor}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={!reduceMotion}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
