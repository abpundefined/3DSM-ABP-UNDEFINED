import { useId, useMemo, useState } from 'react';
import {
  construirResumoDisponibilidade,
  formatarContagemColetas,
  ROTULO_ESTADO_INTERVALO,
  type EstadoIntervalo,
  type PontoEstadoHistorico,
} from '../../utils/disponibilidade';
import './linha-tempo-estado.css';

type LinhaDoTempoEstadoProps = {
  history: readonly PontoEstadoHistorico[];
  hourly?: boolean;
  isDemo?: boolean;
};

const ESTADOS_LEGENDA: readonly EstadoIntervalo[] = [
  'ativo',
  'indisponivel',
  'semMetricas',
];

export default function LinhaDoTempoEstado({
  history,
  hourly,
  isDemo = false,
}: LinhaDoTempoEstadoProps) {
  const tituloId = useId();
  const [inicioSelecionado, setInicioSelecionado] = useState<string | null>(
    null,
  );

  const resumo = useMemo(
    () => construirResumoDisponibilidade(history, hourly),
    [history, hourly],
  );

  const segmentoSelecionado = useMemo(() => {
    if (!inicioSelecionado) {
      return null;
    }
    return (
      resumo.segmentos.find((item) => item.inicio === inicioSelecionado) ?? null
    );
  }, [inicioSelecionado, resumo.segmentos]);

  const estadosVisiveisLegenda: EstadoIntervalo[] =
    resumo.possuiIntervalosSemColetas
      ? [...ESTADOS_LEGENDA, 'semDados']
      : [...ESTADOS_LEGENDA];

  const primeiroSegmento = resumo.segmentos[0] ?? null;
  const ultimoSegmento =
    resumo.segmentos.length > 1
      ? resumo.segmentos[resumo.segmentos.length - 1]
      : null;

  return (
    <section className="linha-tempo-estado" aria-labelledby={tituloId}>
      <div className="linha-tempo-cabecalho">
        <div>
          <p className="eyebrow">DISPONIBILIDADE</p>
          <h2 id={tituloId}>Linha do tempo de estado</h2>
          <p className="linha-tempo-subtitulo">
            Estado predominante em cada intervalo do período selecionado.
            {isDemo ? ' Dados ilustrativos no modo demonstração.' : ''}
          </p>
        </div>

        <div className="linha-tempo-kpi">
          <strong className="linha-tempo-percentual">
            {resumo.textoDisponibilidade}
          </strong>
          {resumo.possuiColetas && (
            <span className="linha-tempo-kpi-detalhe">
              {formatarContagemColetas(resumo.totalAtivo)} de{' '}
              {formatarContagemColetas(resumo.totalColetas)} coletas ativas
            </span>
          )}
        </div>
      </div>

      {!resumo.possuiColetas ? (
        <p className="linha-tempo-vazio">
          Não há coletas de estado registradas para este serviço no período
          selecionado.
        </p>
      ) : (
        <>
          <ul
            className="linha-tempo-legenda"
            aria-label="Legenda dos estados da linha do tempo"
          >
            {estadosVisiveisLegenda.map((estado) => (
              <li key={estado} className="linha-tempo-legenda-item">
                <span
                  className={`linha-tempo-amostra linha-tempo-amostra--${estado}`}
                  aria-hidden="true"
                />
                <span>{ROTULO_ESTADO_INTERVALO[estado]}</span>
                <span className="linha-tempo-legenda-contagem">
                  (
                  {formatarContagemColetas(
                    resumo.contagemIntervalosPorEstado[estado],
                  )}
                  )
                </span>
              </li>
            ))}
          </ul>

          <div className="linha-tempo-trilha-scroll">
            <div
              className="linha-tempo-barra"
              role="group"
              aria-label="Segmentos de estado por intervalo"
            >
              {resumo.segmentos.map((segmento) => {
                const selecionado =
                  segmentoSelecionado?.inicio === segmento.inicio;
                return (
                  <button
                    key={segmento.inicio}
                    type="button"
                    className={`linha-tempo-segmento linha-tempo-segmento--${segmento.estadoPredominante}${selecionado ? ' linha-tempo-segmento--selecionado' : ''}`}
                    title={segmento.resumoTooltip}
                    aria-label={segmento.resumoTooltip}
                    aria-pressed={selecionado}
                    onClick={() =>
                      setInicioSelecionado((atual) =>
                        atual === segmento.inicio ? null : segmento.inicio,
                      )
                    }
                  />
                );
              })}
            </div>
          </div>

          {primeiroSegmento && (
            <div className="linha-tempo-marcos" aria-hidden="true">
              <span>{primeiroSegmento.horarioCurto}</span>
              <span>Horário de Brasília</span>
              {ultimoSegmento && <span>{ultimoSegmento.horarioCurto}</span>}
            </div>
          )}

          <div
            className="linha-tempo-detalhe"
            aria-live="polite"
            aria-atomic="true"
          >
            {segmentoSelecionado ? (
              <div className="linha-tempo-detalhe-card">
                <div className="linha-tempo-detalhe-topo">
                  <div>
                    <p className="linha-tempo-detalhe-rotulo">
                      Intervalo selecionado (horário de Brasília)
                    </p>
                    <h3 className="linha-tempo-detalhe-horario">
                      {segmentoSelecionado.horarioCompleto}
                    </h3>
                  </div>
                  <div className="linha-tempo-detalhe-acoes">
                    <span
                      className={`linha-tempo-badge linha-tempo-badge--${segmentoSelecionado.estadoPredominante}`}
                    >
                      <span
                        className={`linha-tempo-amostra linha-tempo-amostra--${segmentoSelecionado.estadoPredominante}`}
                        aria-hidden="true"
                      />
                      Predominante: {segmentoSelecionado.rotuloEstado}
                    </span>
                    <button
                      type="button"
                      className="linha-tempo-fechar"
                      onClick={() => setInicioSelecionado(null)}
                    >
                      Fechar detalhe
                    </button>
                  </div>
                </div>

                <dl className="linha-tempo-contagens">
                  <div>
                    <dt>Ativo</dt>
                    <dd>
                      {formatarContagemColetas(segmentoSelecionado.ativo)}
                    </dd>
                  </div>
                  <div>
                    <dt>Indisponível</dt>
                    <dd>
                      {formatarContagemColetas(
                        segmentoSelecionado.indisponivel,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Sem métricas</dt>
                    <dd>
                      {formatarContagemColetas(segmentoSelecionado.semMetricas)}
                    </dd>
                  </div>
                  <div>
                    <dt>Total de coletas</dt>
                    <dd>
                      {formatarContagemColetas(
                        segmentoSelecionado.totalColetas,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="linha-tempo-dica">
                Clique em um segmento da barra para ver o horário e a contagem
                de coletas por estado.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
