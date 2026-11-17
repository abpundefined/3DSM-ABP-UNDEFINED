import { useId } from 'react';
import type { ItemRanking } from '../../types/ranking';
import { fraseDeIntensidade } from '../../utils/ranking';
import BarrasHorizontais from './BarrasHorizontais';

const WH_POR_KWH = 1000;

export default function GraficoEnergiaEmissao({
  itens,
}: {
  itens: ItemRanking[];
}) {
  const tituloId = useId();

  return (
    <section className="ranking-bloco" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Energia e emissão lado a lado</h2>
      <p className="ranking-resumo">
        {fraseDeIntensidade(itens) ??
          'Os dois gráficos seguem a ordem do ranking: compare quanto cada serviço consome e quanto emite.'}
      </p>
      <div className="ranking-par">
        <div>
          <h3>Energia (Wh)</h3>
          <BarrasHorizontais
            barras={itens.map(({ servicoId, nome, energiaKwh }) => ({
              servicoId,
              nome,
              valor: energiaKwh * WH_POR_KWH,
            }))}
            rotulo="Energia (Wh)"
            unidade="Wh"
            cor="var(--chart-energia)"
          />
        </div>
        <div>
          <h3>CO₂e (g)</h3>
          <BarrasHorizontais
            barras={itens.map(({ servicoId, nome, emissaoGCo2e }) => ({
              servicoId,
              nome,
              valor: emissaoGCo2e,
            }))}
            rotulo="CO₂e (g)"
            unidade="gCO₂e"
            cor="var(--chart-emissao)"
          />
        </div>
      </div>
    </section>
  );
}
