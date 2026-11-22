import { useId } from 'react';
import type { AgrupamentoRanking, ItemRanking } from '../../types/ranking';
import { escalaDaMetrica, fraseDeIntensidade } from '../../utils/ranking';
import BarrasHorizontais from './BarrasHorizontais';

export default function GraficoEnergiaEmissao({
  itens,
  grupo = 'servico',
}: {
  itens: ItemRanking[];
  grupo?: AgrupamentoRanking;
}) {
  const tituloId = useId();
  const energia = escalaDaMetrica(
    'energia',
    itens.map((item) => item.energiaKwh),
  );
  const emissao = escalaDaMetrica(
    'emissao',
    itens.map((item) => item.emissaoGCo2e),
  );

  return (
    <section className="ranking-bloco" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Energia e emissão lado a lado</h2>
      <p className="ranking-resumo">
        {fraseDeIntensidade(itens) ??
          'Os dois gráficos seguem a ordem do ranking: compare quanto cada serviço consome e quanto emite.'}
      </p>
      <div className="ranking-par">
        <div>
          <h3>Energia ({energia.unidade})</h3>
          <BarrasHorizontais
            barras={itens.map(({ servicoId, nome, energiaKwh }) => ({
              servicoId: grupo === 'servico' ? servicoId : undefined,
              nome,
              valor: energiaKwh * energia.fator,
            }))}
            rotulo={`Energia (${energia.unidade})`}
            unidade={energia.unidade}
            cor="var(--chart-energia)"
          />
        </div>
        <div>
          <h3>Emissão ({emissao.unidade})</h3>
          <BarrasHorizontais
            barras={itens.map(({ servicoId, nome, emissaoGCo2e }) => ({
              servicoId: grupo === 'servico' ? servicoId : undefined,
              nome,
              valor: emissaoGCo2e * emissao.fator,
            }))}
            rotulo={`Emissão (${emissao.unidade})`}
            unidade={emissao.unidade}
            cor="var(--chart-emissao)"
          />
        </div>
      </div>
    </section>
  );
}
