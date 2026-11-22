import { useNavigate } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import usePeriod from '../../hooks/usePeriod';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { abreviarNome, formatarNumero } from '../../utils/ranking';

export type Barra = { servicoId?: number; nome: string; valor: number };

type BarrasHorizontaisProps = {
  barras: Barra[];
  rotulo: string;
  unidade: string;
  cor: string;
};

const ALTURA_POR_BARRA = 36;
const ALTURA_DO_EIXO = 56;
const textoDoEixo = { fill: 'var(--text-muted)', fontSize: 12 };

export default function BarrasHorizontais({
  barras,
  rotulo,
  unidade,
  cor,
}: BarrasHorizontaisProps) {
  const navigate = useNavigate();
  const { linkSearch } = usePeriod();
  const reduceMotion = usePrefersReducedMotion();

  return (
    <ResponsiveContainer
      width="100%"
      height={barras.length * ALTURA_POR_BARRA + ALTURA_DO_EIXO}
    >
      <BarChart
        data={barras}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 24, left: 4 }}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tick={textoDoEixo}
          tickCount={4}
          tickFormatter={formatarNumero}
          label={{
            value: rotulo,
            position: 'insideBottom',
            offset: -16,
            fill: 'var(--text-muted)',
            fontSize: 12,
          }}
        />
        <YAxis
          type="category"
          dataKey="nome"
          width={128}
          tick={textoDoEixo}
          tickFormatter={abreviarNome}
        />
        <Tooltip
          cursor={{ fill: 'var(--soft-green)' }}
          contentStyle={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
          formatter={(valor) => [
            `${formatarNumero(Number(valor))} ${unidade}`,
            rotulo,
          ]}
        />
        <Bar
          dataKey="valor"
          name={rotulo}
          fill={cor}
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive={!reduceMotion}
          onClick={(_, indice) => {
            const servicoId = barras[indice]?.servicoId;
            if (servicoId !== undefined) {
              navigate(`/servicos/${servicoId}${linkSearch}`);
            }
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
