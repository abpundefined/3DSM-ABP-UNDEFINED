import { useId } from 'react';
import {
  calcularComposicaoEnergia,
  formatarPercentualComposicao,
  formatarWatts,
  type ComponentesEnergia,
} from '../../utils/composicaoEnergia';
import MethodologyLink from './MethodologyLink';
import './composicao-energia.css';

type ComposicaoEnergiaProps = {
  componentes: ComponentesEnergia | null | undefined;
  titulo?: string;
  subtitulo?: string;
  isDemo?: boolean;
};

export default function ComposicaoEnergia({
  componentes,
  titulo = 'Composição da energia',
  subtitulo = 'Distribuição estimada da potência entre CPU, memória, disco e rede.',
  isDemo = false,
}: ComposicaoEnergiaProps) {
  const headingId = useId();
  const resumo = calcularComposicaoEnergia(componentes);

  if (!resumo || !resumo.possuiConsumo) {
    return (
      <section className="composicao-energia" aria-labelledby={headingId}>
        <div className="composicao-cabecalho">
          <div>
            <p className="eyebrow">COMPOSIÇÃO POR RECURSO</p>
            <h2 id={headingId}>{titulo}</h2>
            <p className="composicao-subtitulo">{subtitulo}</p>
          </div>
          <MethodologyLink />
        </div>
        <p className="composicao-vazio">
          Sem medições suficientes para estimar a composição por componente
          neste recorte.
        </p>
      </section>
    );
  }

  const segmentos = resumo.itens.reduce<
    Array<{
      chave: string;
      nome: string;
      cor: string;
      percentual: number;
      inicio: number;
    }>
  >((acc, item) => {
    const inicio = acc.reduce(
      (soma, anterior) => soma + anterior.percentual,
      0,
    );
    acc.push({
      chave: item.chave,
      nome: item.nome,
      cor: item.cor,
      percentual: item.percentual,
      inicio,
    });
    return acc;
  }, []);

  const ativos = segmentos.filter((segmento) => segmento.percentual > 0);
  const folga = ativos.length > 1 ? 0.6 : 0;

  return (
    <section className="composicao-energia" aria-labelledby={headingId}>
      <div className="composicao-cabecalho">
        <div>
          <p className="eyebrow">COMPOSIÇÃO POR RECURSO</p>
          <h2 id={headingId}>{titulo}</h2>
          <p className="composicao-subtitulo">{subtitulo}</p>
        </div>
        <MethodologyLink />
      </div>

      <p className="composicao-resumo">{resumo.fraseResumo}</p>

      <div className="composicao-conteudo">
        <div className="composicao-donut">
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label={`Composição da potência total de ${formatarWatts(resumo.totalW)}: ${resumo.itens.map((item) => `${item.nome} ${formatarPercentualComposicao(item.percentual)} (${formatarWatts(item.watts)})`).join(', ')}`}
          >
            <circle
              cx="80"
              cy="80"
              r="60"
              className="composicao-donut-trilha"
            />
            {ativos.map((segmento) => {
              const arco = Math.max(0.4, segmento.percentual - folga);
              return (
                <circle
                  key={segmento.chave}
                  cx="80"
                  cy="80"
                  r="60"
                  pathLength="100"
                  stroke={segmento.cor}
                  strokeDasharray={`${arco} ${100 - arco}`}
                  strokeDashoffset={-segmento.inicio}
                  className="composicao-donut-segmento"
                  data-componente={segmento.chave}
                  transform="rotate(-90 80 80)"
                />
              );
            })}
          </svg>
          <div className="composicao-donut-centro" aria-hidden="true">
            <strong>{formatarWatts(resumo.totalW)}</strong>
            <span>potência total</span>
          </div>
        </div>

        <ul
          className="composicao-legenda"
          aria-label="Percentual por componente"
        >
          {resumo.itens.map((item) => (
            <li key={item.chave} data-componente={item.chave}>
              <span className="composicao-legenda-nome">
                <span
                  className="composicao-cor"
                  style={{ backgroundColor: item.cor }}
                  aria-hidden="true"
                />
                {item.nome}
              </span>
              <span className="composicao-legenda-valores">
                <strong>{formatarPercentualComposicao(item.percentual)}</strong>
                <span>{formatarWatts(item.watts)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="composicao-tabela-scroll">
        <table className="composicao-tabela">
          <caption className="sr-only">
            Potência estimada em watts e participação percentual por componente
            de hardware.
          </caption>
          <thead>
            <tr>
              <th scope="col">Componente</th>
              <th scope="col">Potência (W)</th>
              <th scope="col">Participação (%)</th>
            </tr>
          </thead>
          <tbody>
            {resumo.itens.map((item) => (
              <tr key={item.chave}>
                <th scope="row">
                  <span className="composicao-tabela-nome">
                    <span
                      className="composicao-cor"
                      style={{ backgroundColor: item.cor }}
                      aria-hidden="true"
                    />
                    {item.nome}
                  </span>
                </th>
                <td>{formatarWatts(item.watts)}</td>
                <td>{formatarPercentualComposicao(item.percentual)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{formatarWatts(resumo.totalW)}</td>
              <td>100,0%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isDemo && (
        <p className="composicao-rodape">
          Composição ilustrativa calculada com os mesmos fatores do backend.
        </p>
      )}
    </section>
  );
}
