import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const data = [
  { servico: 'API Gateway', energiaWh: 420 },
  { servico: 'Auth Service', energiaWh: 310 },
  { servico: 'Report Worker', energiaWh: 180 },
];

export default function ChartExample() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <figure className="chart-example">
      <figcaption>
        Exemplo com dados fictícios: energia por serviço, em Wh. O API Gateway
        consome mais (420 Wh).
      </figcaption>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="servico" />
          <YAxis unit=" Wh" width={72} />
          <Tooltip formatter={(value) => [`${value} Wh`, 'Energia']} />
          <Bar
            dataKey="energiaWh"
            name="Energia"
            fill="var(--green-forest)"
            isAnimationActive={!reduceMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
