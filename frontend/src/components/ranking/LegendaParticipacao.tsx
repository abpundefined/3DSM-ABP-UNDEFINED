import { formatEmission } from '../../utils/formatters';
import {
  formatarPercentual,
  type Participacao,
} from '../../utils/participacao';
import { QUANTIDADE_DE_CORES } from './TreemapParticipacao';

export default function LegendaParticipacao({
  participacao,
}: {
  participacao: Participacao;
}) {
  return (
    <ul className="treemap-legenda" aria-label="Emissão por região">
      {participacao.regioes.map((regiao, indice) => (
        <li key={regiao.codigo}>
          <span
            className="treemap-cor"
            style={{
              background: `var(--treemap-${indice % QUANTIDADE_DE_CORES})`,
            }}
            aria-hidden="true"
          />
          <strong>{regiao.nome}</strong>
          <span>
            {formatarPercentual(regiao.percentual)} ·{' '}
            {formatEmission(regiao.emissaoGCo2e)}
          </span>
        </li>
      ))}
    </ul>
  );
}
