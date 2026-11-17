import { useId } from 'react';
import { Link } from 'react-router';
import usePeriod from '../../hooks/usePeriod';
import type { ItemRanking, MetricaRanking } from '../../types/ranking';
import { formatEmission, formatEnergy } from '../../utils/formatters';
import { METRICAS } from '../../utils/ranking';

type TabelaRankingProps = {
  itens: ItemRanking[];
  metrica: MetricaRanking;
};

export default function TabelaRanking({ itens, metrica }: TabelaRankingProps) {
  const tituloId = useId();
  const { linkSearch } = usePeriod();

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
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.servicoId}>
                <td>{item.posicao}º</td>
                <th scope="row">
                  <Link to={`/servicos/${item.servicoId}${linkSearch}`}>
                    {item.nome}
                  </Link>
                </th>
                <td>{formatEnergy(item.energiaKwh)}</td>
                <td>{formatEmission(item.emissaoGCo2e)}</td>
                <td>{item.coletasValidas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
