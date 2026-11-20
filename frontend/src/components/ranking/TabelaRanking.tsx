import { useId } from 'react';
import { Link } from 'react-router';
import useFlipList from '../../hooks/useFlipList';
import usePeriod from '../../hooks/usePeriod';
import type { ItemRanking, MetricaRanking } from '../../types/ranking';
import { formatEmission, formatEnergy } from '../../utils/formatters';
import { METRICAS } from '../../utils/ranking';
import useComparisonSelection from '../../hooks/useComparisonSelection';

type TabelaRankingProps = {
  itens: ItemRanking[];
  metrica: MetricaRanking;
};

export default function TabelaRanking({ itens, metrica }: TabelaRankingProps) {
  const tituloId = useId();
  const { linkSearch } = usePeriod();
  const { serviceIds, toggleService } = useComparisonSelection();
  const tbodyRef = useFlipList<HTMLTableSectionElement>(
    itens.map((item) => item.servicoId).join(','),
  );

  return (
    <section className="ranking-bloco" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Dados do ranking</h2>
      <div
        className="ranking-tabela"
        role="region"
        aria-label="Tabela do ranking"
        tabIndex={0}
      >
        <table>
          <caption>
            Serviços em ordem de {METRICAS[metrica].nome}, do maior para o
            menor, com as coletas válidas no período
          </caption>
          <thead>
            <tr>
              <th scope="col">Posição</th>
              <th scope="col">Serviço</th>
              <th scope="col">Energia</th>
              <th scope="col">Emissão</th>
              <th scope="col">Coletas</th>
              <th scope="col">Comparação</th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {itens.map((item) => (
              <tr key={item.servicoId} data-flip-id={item.servicoId}>
                <td>{item.posicao}º</td>
                <th scope="row">
                  <Link
                    id={`ranking-service-${item.servicoId}`}
                    to={`/servicos/${item.servicoId}${linkSearch}`}
                  >
                    {item.nome}
                  </Link>
                </th>
                <td>{formatEnergy(item.energiaKwh)}</td>
                <td>{formatEmission(item.emissaoGCo2e)}</td>
                <td>{item.coletasValidas}</td>
                <td>
                  <button
                    className="ranking-compare-button"
                    type="button"
                    aria-label={
                      serviceIds.includes(item.servicoId)
                        ? 'Remover da comparação'
                        : 'Comparar'
                    }
                    aria-describedby={`ranking-service-${item.servicoId}`}
                    aria-pressed={serviceIds.includes(item.servicoId)}
                    onClick={() => toggleService(item.servicoId)}
                  >
                    {serviceIds.includes(item.servicoId)
                      ? 'Selecionado'
                      : 'Comparar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
