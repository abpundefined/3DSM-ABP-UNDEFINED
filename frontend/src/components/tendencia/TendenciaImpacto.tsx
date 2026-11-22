import { useId, useState } from 'react';
import type { RespostaSerie } from '../../types/serie';
import MethodologyLink from '../common/MethodologyLink';
import {
  escalaDaEmissao,
  escalaDaEnergia,
  maiorValor,
  montarCamadas,
  resumoDaMetrica,
  resumoDasCamadas,
} from '../../utils/serie';
import AreaEmpilhada from './AreaEmpilhada';
import GraficoDeLinha from './GraficoDeLinha';
import './tendencia.css';

type Visao = 'total' | 'servico';

const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: 'total', rotulo: 'Total' },
  { valor: 'servico', rotulo: 'Por serviço' },
];

export default function TendenciaImpacto({ serie }: { serie: RespostaSerie }) {
  const tituloId = useId();
  const [visao, setVisao] = useState<Visao>('total');
  const { global, granularidade } = serie;
  const energias = global.map((ponto) => ponto.energiaKwh);
  const emissoes = global.map((ponto) => ponto.emissaoGCo2e);
  const temEnergia = energias.some((valor) => valor !== null);
  const temEmissao = emissoes.some((valor) => valor !== null);
  const energia = escalaDaEnergia(maiorValor(energias));
  const emissao = escalaDaEmissao(maiorValor(emissoes));
  const { camadas, pontos } = montarCamadas(serie);

  return (
    <section className="tendencia-painel" aria-labelledby={tituloId}>
      <div className="tendencia-cabecalho">
        <div>
          <p className="eyebrow">EVOLUÇÃO DO IMPACTO</p>
          <h2 id={tituloId}>Tendência no período</h2>
          <MethodologyLink />
        </div>
        <div
          className="tendencia-visoes"
          role="group"
          aria-label="Visão da tendência"
        >
          {VISOES.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={visao === valor}
              onClick={() => setVisao(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      {visao === 'servico' ? (
        <figure className="tendencia-empilhada">
          <figcaption>
            <strong>Emissão por serviço ({emissao.unidade})</strong>
            <span>
              {resumoDasCamadas(camadas) ??
                'Nenhum serviço registrou emissão no período.'}
            </span>
          </figcaption>
          {!temEmissao ? (
            <p className="tendencia-vazio" role="status">
              Sem dados de emissão para exibir neste período.
            </p>
          ) : camadas.length > 0 ? (
            <AreaEmpilhada
              camadas={camadas}
              pontos={pontos}
              granularidade={granularidade}
              escala={emissao}
            />
          ) : null}
        </figure>
      ) : (
        <div className="tendencia-graficos">
          <figure>
            <figcaption>
              <strong>Energia ({energia.unidade})</strong>
              <span>{resumoDaMetrica(serie, 'energia')}</span>
            </figcaption>
            {temEnergia ? (
              <GraficoDeLinha
                pontos={global.map(({ inicio, energiaKwh }) => ({
                  inicio,
                  valor:
                    energiaKwh === null ? null : energiaKwh * energia.fator,
                }))}
                granularidade={granularidade}
                rotulo="Energia"
                unidade={energia.unidade}
                cor="var(--chart-energia)"
              />
            ) : (
              <p className="tendencia-vazio" role="status">
                Sem dados de energia para exibir neste período.
              </p>
            )}
          </figure>
          <figure>
            <figcaption>
              <strong>Emissão ({emissao.unidade})</strong>
              <span>{resumoDaMetrica(serie, 'emissao')}</span>
            </figcaption>
            {temEmissao ? (
              <GraficoDeLinha
                pontos={global.map(({ inicio, emissaoGCo2e }) => ({
                  inicio,
                  valor:
                    emissaoGCo2e === null ? null : emissaoGCo2e * emissao.fator,
                }))}
                granularidade={granularidade}
                rotulo="Emissão"
                unidade={emissao.unidade}
                cor="var(--chart-emissao)"
              />
            ) : (
              <p className="tendencia-vazio" role="status">
                Sem dados de emissão para exibir neste período.
              </p>
            )}
          </figure>
        </div>
      )}
    </section>
  );
}
