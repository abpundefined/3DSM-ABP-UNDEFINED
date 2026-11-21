import { useId, useState } from 'react';
import { Link } from 'react-router';
import useFlipList from '../../hooks/useFlipList';
import usePeriod from '../../hooks/usePeriod';
import type { ItemRanking, MetricaRanking } from '../../types/ranking';
import { formatEmission, formatEnergy } from '../../utils/formatters';
import { METRICAS } from '../../utils/ranking';
import useComparisonSelection from '../../hooks/useComparisonSelection';
import SeloBadge from '../common/SeloBadge';

const ordemDosSelos: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  '—': 6,
};

type TabelaRankingProps = {
  itens: ItemRanking[];
  metrica: MetricaRanking;
};

export default function TabelaRanking({ itens, metrica }: TabelaRankingProps) {
  const tituloId = useId();
  const { linkSearch } = usePeriod();
  const { serviceIds, toggleService } = useComparisonSelection();
  const [ordemSelo, setOrdemSelo] = useState<'ascending' | 'descending' | null>(
    null,
  );
  const ordenados =
    ordemSelo === null
      ? itens
      : itens.toSorted((a, b) => {
          if (a.selo === '—' || b.selo === '—') {
            if (a.selo === b.selo) return a.posicao - b.posicao;
            return a.selo === '—' ? 1 : -1;
          }

          const diferenca = ordemDosSelos[a.selo] - ordemDosSelos[b.selo];
          return (
            (ordemSelo === 'ascending' ? diferenca : -diferenca) ||
            a.posicao - b.posicao
          );
        });
  const tbodyRef = useFlipList<HTMLTableSectionElement>(
    ordenados.map((item) => item.servicoId).join(','),
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
              <th scope="col" aria-sort={ordemSelo ?? 'none'}>
                <button
                  type="button"
                  onClick={() =>
                    setOrdemSelo((atual) =>
                      atual === 'ascending' ? 'descending' : 'ascending',
                    )
                  }
                >
                  Selo
                  <span aria-hidden="true">
                    {ordemSelo === 'ascending'
                      ? ' ↑'
                      : ordemSelo === 'descending'
                        ? ' ↓'
                        : ''}
                  </span>
                </button>
              </th>
              <th scope="col">Coletas</th>
              <th scope="col">Comparação</th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {ordenados.map((item) => (
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
                <td>
                  <SeloBadge selo={item.selo} />
                </td>
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
