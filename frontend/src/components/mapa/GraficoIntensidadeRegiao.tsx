import { useId } from 'react';
import type { ServicoNoMapa, ServicoSemCoordenadas } from '../../types/mapa';
import MethodologyLink from '../common/MethodologyLink';
import {
  formatarIntensidadeRegional,
  intensidadesPorRegiao,
  resumoDaIntensidadeRegional,
} from '../../utils/mapaDados';

type GraficoIntensidadeRegiaoProps = {
  servicos: ServicoNoMapa[];
  semCoordenadas: ServicoSemCoordenadas[];
};

export default function GraficoIntensidadeRegiao({
  servicos,
  semCoordenadas,
}: GraficoIntensidadeRegiaoProps) {
  const tituloId = useId();
  const regioes = intensidadesPorRegiao(servicos, semCoordenadas);
  const maiorIntensidade = Math.max(
    0,
    ...regioes.map(({ intensidadeGCo2ePorKwh }) => intensidadeGCo2ePorKwh ?? 0),
  );

  return (
    <section
      className="mapa-intensidade"
      aria-labelledby={tituloId}
      role="region"
    >
      <div>
        <h2 className="mapa-intensidade-titulo" id={tituloId}>
          Intensidade de carbono por região
        </h2>
        <p className="mapa-intensidade-nota">
          Emissão total dividida pela energia total no período (média ponderada
          pelo consumo). <MethodologyLink />
        </p>
      </div>
      <p className="mapa-intensidade-resumo">
        {resumoDaIntensidadeRegional(regioes)}
      </p>
      {regioes.length === 0 ? (
        <p className="mapa-intensidade-vazio">
          Não há regiões identificadas com coordenadas ou código regional para
          exibir.
        </p>
      ) : (
        <ol
          className="mapa-intensidade-lista"
          aria-label="Regiões ordenadas da maior para a menor intensidade"
        >
          {regioes.map(
            ({ codigo, local, intensidadeGCo2ePorKwh, quantidadeServicos }) => {
              const percentual =
                intensidadeGCo2ePorKwh === null || maiorIntensidade === 0
                  ? 0
                  : (intensidadeGCo2ePorKwh / maiorIntensidade) * 100;

              return (
                <li className="mapa-intensidade-item" key={codigo}>
                  <div className="mapa-intensidade-cabecalho">
                    <strong>{local}</strong>
                    <span>
                      {formatarIntensidadeRegional(intensidadeGCo2ePorKwh)}
                    </span>
                  </div>
                  <p className="mapa-intensidade-servicos">
                    {quantidadeServicos}{' '}
                    {quantidadeServicos === 1 ? 'serviço' : 'serviços'}
                  </p>
                  <div className="mapa-intensidade-barra" aria-hidden="true">
                    <span style={{ width: `${percentual}%` }} />
                  </div>
                </li>
              );
            },
          )}
        </ol>
      )}
    </section>
  );
}
