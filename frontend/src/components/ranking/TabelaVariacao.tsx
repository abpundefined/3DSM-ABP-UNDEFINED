import { useId, useState } from 'react';
import { Link } from 'react-router';
import usePeriod from '../../hooks/usePeriod';
import type { VariacaoPorServico } from '../../types/variacao';
import { formatEmission } from '../../utils/formatters';
import VariacaoPeriodo from '../common/VariacaoPeriodo';

const colunas = [
  { campo: 'nome', titulo: 'Serviço' },
  { campo: 'emissaoAtualGCo2e', titulo: 'Emissão atual' },
  { campo: 'emissaoAnteriorGCo2e', titulo: 'Emissão anterior' },
  { campo: 'diferencaGCo2e', titulo: 'Diferença' },
  { campo: 'variacaoPercentual', titulo: 'Variação (%)' },
] as const;
type Coluna = (typeof colunas)[number]['campo'];

export default function TabelaVariacao({
  itens,
}: {
  itens: VariacaoPorServico[];
}) {
  const tituloId = useId();
  const { linkSearch } = usePeriod();
  const [ordem, setOrdem] = useState<{
    coluna: Coluna | null;
    crescente: boolean;
  }>({
    coluna: null,
    crescente: true,
  });
  const ordenar = (coluna: Coluna) =>
    setOrdem((atual) => ({
      coluna,
      crescente: atual.coluna === coluna ? !atual.crescente : true,
    }));
  const coluna = ordem.coluna;
  const ordenados =
    coluna === null
      ? itens
      : itens.toSorted((a, b) => {
          const esquerda = a[coluna];
          const direita = b[coluna];
          if (esquerda === null)
            return direita === null ? a.servicoId - b.servicoId : 1;
          if (direita === null) return -1;
          const diferenca =
            typeof esquerda === 'string' && typeof direita === 'string'
              ? esquerda.localeCompare(direita, 'pt-BR')
              : Number(esquerda) - Number(direita);
          return (
            (ordem.crescente ? diferenca : -diferenca) ||
            a.servicoId - b.servicoId
          );
        });

  return (
    <section className="ranking-bloco" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Variação por serviço</h2>
      <p className="ranking-resumo">
        Todos os serviços com coletas em pelo menos uma das duas janelas, sem o
        limite do top 10. Sem emissão no período atual, não há variação
        calculada; emissão medida igual a zero permanece zero.
      </p>
      <div
        className="ranking-tabela"
        role="region"
        aria-label="Tabela de variação"
        tabIndex={0}
      >
        <table aria-labelledby={tituloId}>
          <caption>
            Emissão atual e anterior em gCO₂e ou unidades equivalentes.
            Selecione uma coluna para ordenar; valores sem base ficam ao final.
          </caption>
          <thead>
            <tr>
              {colunas.map(({ campo, titulo }) => (
                <th
                  key={campo}
                  scope="col"
                  aria-sort={
                    ordem.coluna === campo
                      ? ordem.crescente
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button type="button" onClick={() => ordenar(campo)}>
                    {titulo}
                    <span aria-hidden="true">
                      {ordem.coluna === campo
                        ? ordem.crescente
                          ? ' ↑'
                          : ' ↓'
                        : ''}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((item) => (
              <tr key={item.servicoId}>
                <th scope="row">
                  <Link to={`/servicos/${item.servicoId}${linkSearch}`}>
                    {item.nome}
                  </Link>
                </th>
                <td>{formatEmission(item.emissaoAtualGCo2e)}</td>
                <td>{formatEmission(item.emissaoAnteriorGCo2e)}</td>
                <td>
                  {item.diferencaGCo2e === null
                    ? '—'
                    : `${item.diferencaGCo2e < 0 ? '−' : item.diferencaGCo2e > 0 ? '+' : ''}${formatEmission(Math.abs(item.diferencaGCo2e))}`}
                </td>
                <td>
                  {item.emissaoAtualGCo2e === null ? (
                    <span className="variacao variacao--sem-base">
                      sem dados no período atual
                    </span>
                  ) : (
                    <VariacaoPeriodo valor={item.variacaoPercentual} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
