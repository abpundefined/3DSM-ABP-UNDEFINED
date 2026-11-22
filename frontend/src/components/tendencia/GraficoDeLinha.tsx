import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import type { Granularidade } from '../../types/serie';
import ListaPicosIncomuns from '../common/ListaPicosIncomuns';
import { detectarPicosIncomuns } from '../../utils/picos';
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
  const resumoPicos = detectarPicosIncomuns(pontos, granularidade === 'hora');

  return (
    <>
      <ResponsiveContainer width="100%" height={ALTURA_DO_GRAFICO}>
        <LineChart
          data={pontos}
          margin={{ top: 22, right: 16, bottom: 4, left: 4 }}
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
          {resumoPicos.picos.length > 0 && resumoPicos.limiar !== null && (
            <ReferenceLine
              y={resumoPicos.limiar}
              stroke="#c2410c"
              strokeDasharray="4 4"
              strokeOpacity={0.75}
            />
          )}
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
          {resumoPicos.picos.map((pico) => (
            <ReferenceDot
              key={pico.inicio}
              x={pico.inicio}
              y={pico.valor}
              r={5}
              fill="#c2410c"
              stroke="var(--surface)"
              strokeWidth={2}
              label={{
                value: pico.anotacao,
                position: 'top',
                fill: 'var(--text)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <ListaPicosIncomuns
        picos={resumoPicos.picos}
        limiar={resumoPicos.limiar}
        unidade={unidade}
        rotulo={rotulo}
        formatarValor={formatarNumero}
      />
    </>
  );
}
