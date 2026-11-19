import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
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
  type Camada,
  type Escala,
  type PontoEmpilhado,
} from '../../utils/serie';
import {
  ALTURA_DO_GRAFICO,
  estiloDoTooltip,
  textoDoEixo,
} from './estiloDosGraficos';

type AreaEmpilhadaProps = {
  camadas: Camada[];
  pontos: PontoEmpilhado[];
  granularidade: Granularidade;
  escala: Escala;
};

const ALTURA_DA_LEGENDA = 56;

export default function AreaEmpilhada({
  camadas,
  pontos,
  granularidade,
  escala,
}: AreaEmpilhadaProps) {
  const reduceMotion = usePrefersReducedMotion();
  const pontosNaEscala = pontos.map((ponto) => {
    const convertido: PontoEmpilhado = { inicio: ponto.inicio };
    for (const { chave } of camadas) {
      const valor = ponto[chave];
      convertido[chave] =
        typeof valor === 'number' ? valor * escala.fator : null;
    }
    return convertido;
  });

  return (
    <ResponsiveContainer
      width="100%"
      height={ALTURA_DO_GRAFICO + ALTURA_DA_LEGENDA}
    >
      <AreaChart
        data={pontosNaEscala}
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
            value: escala.unidade,
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
          formatter={(valor, nome) => [
            `${formatarNumero(Number(valor))} ${escala.unidade}`,
            nome,
          ]}
        />
        <Legend itemSorter={null} wrapperStyle={{ fontSize: 13 }} />
        {camadas.map(({ chave, nome }, indice) => (
          <Area
            key={chave}
            type="monotone"
            dataKey={chave}
            name={nome}
            stackId="emissao"
            stroke={`var(--serie-${indice})`}
            fill={`var(--serie-${indice})`}
            fillOpacity={0.35}
            connectNulls={false}
            isAnimationActive={!reduceMotion}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
