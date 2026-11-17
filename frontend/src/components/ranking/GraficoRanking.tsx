import { useId } from 'react';
import type { ItemRanking, MetricaRanking } from '../../types/ranking';
import {
  METRICAS,
  escalaDaMetrica,
  resumoDoRanking,
  valorDaMetrica,
} from '../../utils/ranking';
import BarrasHorizontais from './BarrasHorizontais';

type GraficoRankingProps = {
  itens: ItemRanking[];
  metrica: MetricaRanking;
};

export default function GraficoRanking({
  itens,
  metrica,
}: GraficoRankingProps) {
  const tituloId = useId();
  const { nome, rotulo } = METRICAS[metrica];
  const valores = itens.map((item) => valorDaMetrica(item, metrica));
  const { unidade, fator } = escalaDaMetrica(metrica, valores);

  return (
    <section className="ranking-bloco" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Ranking por {nome}</h2>
      <p className="ranking-resumo">{resumoDoRanking(itens, metrica)}</p>
      <BarrasHorizontais
        barras={itens.map((item, indice) => ({
          servicoId: item.servicoId,
          nome: item.nome,
          valor: valores[indice] * fator,
        }))}
        rotulo={`${rotulo} (${unidade})`}
        unidade={unidade}
        cor={
          metrica === 'emissao'
            ? 'var(--chart-emissao)'
            : 'var(--chart-energia)'
        }
      />
    </section>
  );
}
