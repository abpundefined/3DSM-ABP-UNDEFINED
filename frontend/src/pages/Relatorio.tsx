import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import EmissionEquivalences from '../components/common/EmissionEquivalences';
import FeedbackPanel from '../components/common/FeedbackPanel';
import Icon from '../components/common/Icon';
import PeriodSelector from '../components/common/PeriodSelector';
import RelatorioTendencia from '../components/relatorio/RelatorioTendencia';
import { FONTE_EQUIVALENCIAS } from '../constants/equivalencias';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { relatorioDemo } from '../mocks/relatorio';
import { buscarDadosRelatorio } from '../services/relatorio';
import type { DadosRelatorio } from '../types/relatorio';
import { formatEmission, formatEnergy } from '../utils/formatters';
import { formatarPeriodoConsiderado } from '../utils/ranking';
import {
  formatarContagemComConcordancia,
  formatarDataGeracaoRelatorio,
} from '../utils/relatorio';
import './relatorio.css';

type EstadoRelatorio =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; dados: DadosRelatorio };

const contagemFormatador = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

function ConteudoDoRelatorio({
  dados,
  isDemo,
  linkSearch,
}: {
  dados: DadosRelatorio;
  isDemo: boolean;
  linkSearch: string;
}) {
  const { indicadores, serie, topEmissores } = dados;
  const periodo = indicadores.periodo ?? serie.periodo;
  const dataGeracao = formatarDataGeracaoRelatorio(indicadores.geradoEm);
  const metodologiaTo = isDemo ? '/metodologia?demo=1' : '/metodologia';

  return (
    <div className="relatorio-sheet">
      <section
        className="relatorio-banner"
        aria-label="Identificação do período"
      >
        <div>
          <p className="relatorio-banner-eyebrow">
            GREEN-ER · PERÍODO CONSOLIDADO
          </p>
          <p className="relatorio-banner-period">
            Dados de <strong>{formatarPeriodoConsiderado(periodo)}</strong>, no
            horário de Brasília.
          </p>
        </div>
        {isDemo && (
          <span className="relatorio-demo-badge">
            Modo demonstração · dados ilustrativos
          </span>
        )}
      </section>

      <section className="relatorio-section" aria-label="Resumo do período">
        <h2>Totais do período e equivalências</h2>
        <p className="relatorio-section-description">
          Consolidação das coletas com cálculo concluído no intervalo analisado.
        </p>
        <div className="relatorio-summary-grid">
          <div className="relatorio-metric">
            <span className="relatorio-metric-label">Consumo energético</span>
            <strong className="relatorio-metric-value">
              {formatEnergy(indicadores.energiaTotalKwh)}
            </strong>
            <p className="relatorio-metric-note">
              Soma das estimativas de energia no período
            </p>
          </div>
          <div className="relatorio-metric">
            <span className="relatorio-metric-label">Emissão de CO₂e</span>
            <strong className="relatorio-metric-value">
              {formatEmission(indicadores.emissaoTotalGCo2e)}
            </strong>
            <EmissionEquivalences
              emissaoGCo2e={indicadores.emissaoTotalGCo2e}
            />
          </div>
          <div className="relatorio-metric">
            <span className="relatorio-metric-label">Coletas calculadas</span>
            <strong className="relatorio-metric-value">
              {contagemFormatador.format(indicadores.coletasCalculadas)}
            </strong>
            <p className="relatorio-metric-note">
              Amostras válidas consideradas nos totais
            </p>
          </div>
          <div className="relatorio-metric">
            <span className="relatorio-metric-label">Serviços monitorados</span>
            <strong className="relatorio-metric-value">
              {contagemFormatador.format(indicadores.servicos.monitorados)}
            </strong>
            <p className="relatorio-metric-note">
              {formatarContagemComConcordancia(
                indicadores.servicos.disponiveis,
                'ativo',
                'ativos',
              )}{' '}
              ·{' '}
              {formatarContagemComConcordancia(
                indicadores.servicos.indisponiveis,
                'indisponível',
                'indisponíveis',
              )}
            </p>
          </div>
        </div>
      </section>

      <RelatorioTendencia serie={serie} />

      <section
        className="relatorio-section"
        aria-labelledby="relatorio-top5-title"
      >
        <div className="relatorio-section-head">
          <div>
            <h2 id="relatorio-top5-title">Os 5 serviços que mais emitiram</h2>
            <p className="relatorio-section-description">
              Ordenados pela emissão estimada acumulada no período.
            </p>
          </div>
        </div>
        {topEmissores.length === 0 ? (
          <p className="relatorio-empty-note" role="status">
            Nenhuma coleta válida registrada no período para compor os 5
            serviços que mais emitiram.
          </p>
        ) : (
          <div className="relatorio-table-wrap">
            <table
              className="relatorio-top-table"
              aria-label="Os 5 serviços que mais emitiram no período"
            >
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  <th scope="col">Serviço</th>
                  <th scope="col">Emissão</th>
                  <th scope="col">Energia</th>
                  <th scope="col">Coletas</th>
                </tr>
              </thead>
              <tbody>
                {topEmissores.map((item) => (
                  <tr key={item.servicoId}>
                    <td>{item.posicao}º</td>
                    <td>
                      <Link
                        to={
                          isDemo
                            ? `/servicos/${item.servicoId}?demo=1`
                            : {
                                pathname: `/servicos/${item.servicoId}`,
                                search: linkSearch,
                              }
                        }
                      >
                        {item.nome}
                      </Link>
                    </td>
                    <td>{formatEmission(item.emissaoGCo2e)}</td>
                    <td>{formatEnergy(item.energiaKwh)}</td>
                    <td>{contagemFormatador.format(item.coletasValidas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="relatorio-section" aria-label="Nota de metodologia">
        <h2>Nota de metodologia</h2>
        <div className="relatorio-methodology-note">
          <p>
            Os resultados apresentados são{' '}
            <strong>estimativas operacionais</strong> calculadas a partir da
            telemetria de CPU, memória RAM, disco e rede durante o intervalo de
            coleta, multiplicada pela intensidade de carbono regional. Não
            substituem medições em wattímetro nem inventários auditados.
          </p>
          <p>
            As equivalências de CO₂e são aproximações baseadas nos fatores da{' '}
            {FONTE_EQUIVALENCIAS.nome} (consultada em{' '}
            {FONTE_EQUIVALENCIAS.consultadoEm}).
          </p>
          <Link
            to={metodologiaTo}
            className="relatorio-methodology-link relatorio-no-print"
          >
            Consultar detalhes completos em Como calculamos
          </Link>
        </div>
      </section>

      <footer className="relatorio-footer" aria-label="Metadados do relatório">
        <p>Gerado em: {dataGeracao} (horário de Brasília)</p>
        <p>
          Cálculo conforme a página{' '}
          <Link to={metodologiaTo}>Como calculamos</Link>
        </p>
      </footer>
    </div>
  );
}

export default function Relatorio() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
  const { apiQuery, linkSearch } = usePeriod();
  const [tentativas, setTentativas] = useState(0);
  const chaveConsulta = `${apiQuery}:${tentativas}`;
  const [resultado, setResultado] = useState<{
    chave: string;
    estado: EstadoRelatorio;
  } | null>(null);

  usePageTitle(
    isDemo ? 'Relatório do período · demonstração' : 'Relatório do período',
  );

  useEffect(() => {
    if (isDemo) {
      return;
    }

    const controller = new AbortController();
    void buscarDadosRelatorio(apiQuery, controller.signal)
      .then((dados) => {
        setResultado({
          chave: chaveConsulta,
          estado: { status: 'pronto', dados },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResultado({
          chave: chaveConsulta,
          estado: {
            status: 'erro',
            mensagem:
              error instanceof Error
                ? error.message
                : 'Não foi possível gerar o relatório do período.',
          },
        });
      });

    return () => controller.abort();
  }, [apiQuery, chaveConsulta, isDemo]);

  const exibido: EstadoRelatorio = isDemo
    ? { status: 'pronto', dados: relatorioDemo() }
    : resultado?.chave === chaveConsulta
      ? resultado.estado
      : { status: 'carregando' };

  return (
    <div className="relatorio-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">RELATÓRIO EXECUTIVO</p>
          <h1>Relatório do período</h1>
          <p className="page-subtitle">
            Síntese pronta para impressão ou exportação em PDF com totais,
            tendência, maiores emissores e metodologia.
          </p>
        </div>
        <div className="relatorio-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => window.print()}
            disabled={exibido.status !== 'pronto'}
          >
            <Icon name="printer" />
            Imprimir / salvar PDF
          </button>
          <Link
            to={isDemo ? '/?demo=1' : { pathname: '/', search: linkSearch }}
            className="button button--secondary"
          >
            <Icon name="back" />
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      {!isDemo && <PeriodSelector />}

      {exibido.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          title="Gerando o relatório"
          description="Consolidando indicadores, tendência e serviços do período."
        />
      )}

      {exibido.status === 'erro' && (
        <FeedbackPanel
          kind="error"
          title="Não foi possível gerar o relatório"
          description={exibido.mensagem}
        >
          <button
            type="button"
            className="button button--primary"
            onClick={() => setTentativas((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </FeedbackPanel>
      )}

      {exibido.status === 'pronto' && (
        <ConteudoDoRelatorio
          dados={exibido.dados}
          isDemo={isDemo}
          linkSearch={linkSearch}
        />
      )}
    </div>
  );
}
