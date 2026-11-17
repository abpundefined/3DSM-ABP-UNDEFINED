import { useId } from 'react';
import { Link } from 'react-router';
import usePeriod from '../../hooks/usePeriod';
import type { ServicoSemDados } from '../../types/ranking';

export default function ListaSemDados({
  servicos,
}: {
  servicos: ServicoSemDados[];
}) {
  const tituloId = useId();
  const { linkSearch } = usePeriod();

  return (
    <section className="ranking-bloco" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Sem dados no período ({servicos.length})</h2>
      <p className="ranking-resumo">
        Estes serviços não tiveram coletas válidas no período e ficam fora do
        ranking.
      </p>
      <ul className="ranking-sem-dados">
        {servicos.map(({ servicoId, nome }) => (
          <li key={servicoId}>
            <Link to={`/servicos/${servicoId}${linkSearch}`}>{nome}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
