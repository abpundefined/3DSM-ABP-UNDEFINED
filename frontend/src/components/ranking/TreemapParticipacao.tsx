import { useNavigate } from 'react-router';
import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
  type TreemapNode,
} from 'recharts';
import usePeriod from '../../hooks/usePeriod';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { formatEmission } from '../../utils/formatters';
import {
  formatarPercentual,
  type Participacao,
} from '../../utils/participacao';

export const QUANTIDADE_DE_CORES = 6;

const ALTURA = 320;
const LARGURA_MINIMA_DO_ROTULO = 72;
const ALTURA_MINIMA_DO_ROTULO = 40;
const LARGURA_DA_LETRA = 7;
const NIVEL_DO_SERVICO = 2;

function numero(valor: unknown) {
  return typeof valor === 'number' ? valor : 0;
}

function abreviar(nome: string, largura: number) {
  const letras = Math.floor((largura - 12) / LARGURA_DA_LETRA);
  return nome.length <= letras ? nome : `${nome.slice(0, letras - 1)}…`;
}

function Bloco(no: TreemapNode) {
  const { x, y, width, height, depth, name } = no;
  if (depth !== NIVEL_DO_SERVICO) {
    return <g />;
  }

  const cabeORotulo =
    width >= LARGURA_MINIMA_DO_ROTULO && height >= ALTURA_MINIMA_DO_ROTULO;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        className="treemap-bloco"
        style={{ fill: `var(--treemap-${numero(no.cor)})` }}
      />
      {cabeORotulo && (
        <>
          <text x={x + 8} y={y + 20} className="treemap-rotulo">
            {abreviar(name, width)}
          </text>
          <text x={x + 8} y={y + 36} className="treemap-rotulo">
            {formatarPercentual(numero(no.percentual))}
          </text>
        </>
      )}
    </g>
  );
}

export default function TreemapParticipacao({
  participacao,
}: {
  participacao: Participacao;
}) {
  const navigate = useNavigate();
  const { linkSearch } = usePeriod();
  const reduceMotion = usePrefersReducedMotion();

  const dados = participacao.regioes.map((regiao, indice) => ({
    name: regiao.nome,
    children: regiao.servicos.map((servico) => ({
      name: servico.nome,
      servicoId: servico.servicoId,
      emissao: servico.emissaoGCo2e,
      percentual: servico.percentual,
      cor: indice % QUANTIDADE_DE_CORES,
    })),
  }));

  return (
    <ResponsiveContainer width="100%" height={ALTURA}>
      <Treemap
        data={dados}
        dataKey="emissao"
        nameKey="name"
        content={Bloco}
        isAnimationActive={!reduceMotion}
        onClick={(no) => {
          if (no.depth === NIVEL_DO_SERVICO) {
            navigate(`/servicos/${numero(no.servicoId)}${linkSearch}`);
          }
        }}
      >
        <Tooltip
          contentStyle={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
          formatter={(valor) => [formatEmission(Number(valor)), 'Emissão']}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
