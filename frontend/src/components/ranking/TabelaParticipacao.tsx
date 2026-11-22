import { Link } from 'react-router';
import usePeriod from '../../hooks/usePeriod';
import { formatEmission } from '../../utils/formatters';
import {
  formatarPercentual,
  type Participacao,
} from '../../utils/participacao';

export default function TabelaParticipacao({
  participacao,
}: {
  participacao: Participacao;
}) {
  const { linkSearch } = usePeriod();

  return (
    <details className="treemap-dados">
      <summary>Ver a participação em tabela</summary>
      <div
        className="ranking-tabela"
        role="region"
        aria-label="Tabela da participação nas emissões"
        tabIndex={0}
      >
        <table>
          <caption>
            Emissão de cada serviço no período, agrupada por região, com a
            participação no total de {formatEmission(participacao.totalGCo2e)}
          </caption>
          <thead>
            <tr>
              <th scope="col">Região</th>
              <th scope="col">Serviço</th>
              <th scope="col">Emissão</th>
              <th scope="col">Participação</th>
            </tr>
          </thead>
          <tbody>
            {participacao.regioes.flatMap((regiao) =>
              regiao.servicos.map((servico) => (
                <tr key={servico.servicoId}>
                  <td>{regiao.nome}</td>
                  <th scope="row">
                    <Link to={`/servicos/${servico.servicoId}${linkSearch}`}>
                      {servico.nome}
                    </Link>
                  </th>
                  <td>{formatEmission(servico.emissaoGCo2e)}</td>
                  <td>{formatarPercentual(servico.percentual)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}
