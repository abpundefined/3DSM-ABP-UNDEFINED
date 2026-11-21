import { Link, useSearchParams } from 'react-router';
import FeedbackPanel from '../components/common/FeedbackPanel';
import Icon from '../components/common/Icon';
import MethodologyLink from '../components/common/MethodologyLink';
import PeriodSelector from '../components/common/PeriodSelector';
import VariacaoPeriodo from '../components/common/VariacaoPeriodo';
import ComparisonSelectionBar from '../components/comparacao/ComparisonSelectionBar';
import CorridaDeBarras from '../components/ranking/CorridaDeBarras';
import GraficoEnergiaEmissao from '../components/ranking/GraficoEnergiaEmissao';
import GraficoRanking from '../components/ranking/GraficoRanking';
import ListaSemDados from '../components/ranking/ListaSemDados';
import ParticipacaoEmissoes from '../components/ranking/ParticipacaoEmissoes';
import TabelaRanking from '../components/ranking/TabelaRanking';
import TabelaVariacao from '../components/ranking/TabelaVariacao';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import useRanking, { type EstadoDoRanking } from '../hooks/useRanking';
import { rankingDemo } from '../mocks/ranking';
import type {
  AgrupamentoRanking,
  MetricaRanking,
  RespostaRanking,
} from '../types/ranking';
import { ehModoDemo } from '../utils/modoDemo';
import {
  AGRUPAMENTOS,
  LIMITE_DO_RANKING,
  METRICAS,
  agruparItensRanking,
  consultaDoRanking,
  escreverAgrupamento,
  escreverMetrica,
  formatarPeriodoConsiderado,
  lerAgrupamento,
  lerMetrica,
} from '../utils/ranking';
import '../components/ranking/ranking.css';
import '../components/comparacao/comparacao.css';

const metricas = Object.keys(METRICAS) as MetricaRanking[];
const agrupamentos = Object.keys(AGRUPAMENTOS) as AgrupamentoRanking[];

function ConteudoDoRanking({
  dados,
  atualizando,
  isDemo,
  grupo,
}: {
  dados: RespostaRanking;
  atualizando: boolean;
  isDemo: boolean;
  grupo: AgrupamentoRanking;
}) {
  const { periodo, metrica, itens, semDados } = dados;
  const itensExibidos = agruparItensRanking(itens, grupo, metrica);

  if (
    itens.length === 0 &&
    semDados.length === 0 &&
    !dados.variacaoPorServico?.length
  ) {
    return (
      <FeedbackPanel
        kind="empty"
        title="Nenhum serviço monitorado"
        description="Quando o backend descobrir serviços, eles aparecem no ranking."
      />
    );
  }

  const variacaoGlobal = dados.variacaoPercentual ? (
    <section className="ranking-bloco" aria-label="Variação global">
      <h2>Em relação ao período anterior</h2>
      <p>
        Energia:{' '}
        <VariacaoPeriodo
          valor={dados.variacaoPercentual.energiaKwh}
          periodo={periodo}
        />
      </p>
      <p>
        Emissão:{' '}
        <VariacaoPeriodo
          valor={dados.variacaoPercentual.emissaoGCo2e}
          periodo={periodo}
        />
      </p>
      <p className="ranking-resumo">
        Totais de todos os serviços, não apenas os do top 10.
      </p>
    </section>
  ) : null;

  return (
    <div className="ranking-conteudo" aria-busy={atualizando || undefined}>
      <p className="ranking-periodo">
        Dados de {formatarPeriodoConsiderado(periodo)}, no horário de Brasília.
      </p>
      {itens.length === 0 ? (
        <>
          <FeedbackPanel
            kind="empty"
            title="Nenhuma coleta no período"
            description="Nenhum serviço teve coletas válidas neste período. Escolha um período maior ou aguarde as próximas coletas."
          />
          {!isDemo && <PeriodSelector />}
          {variacaoGlobal}
        </>
      ) : (
        <>
          <GraficoRanking
            itens={itensExibidos}
            metrica={metrica}
            grupo={grupo}
          />
          {!isDemo && <PeriodSelector />}
          {variacaoGlobal}
          <GraficoEnergiaEmissao itens={itensExibidos} grupo={grupo} />
          <ParticipacaoEmissoes isDemo={isDemo} />
          <TabelaRanking
            itens={itensExibidos}
            metrica={metrica}
            grupo={grupo}
          />
        </>
      )}
      {!!dados.variacaoPorServico?.length && (
        <TabelaVariacao itens={dados.variacaoPorServico} />
      )}
      {semDados.length > 0 && <ListaSemDados servicos={semDados} />}
    </div>
  );
}

export default function Ranking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
  const modo = searchParams.get('modo') === 'evolucao' ? 'evolucao' : 'ranking';
  const metrica = lerMetrica(searchParams);
  const grupo = lerAgrupamento(searchParams);
  const { apiQuery, linkSearch } = usePeriod();
  const { estado, recarregar } = useRanking(
    consultaDoRanking(apiQuery, metrica),
    !isDemo && modo === 'ranking',
  );
  usePageTitle(isDemo ? 'Ranking · demonstração' : 'Ranking');

  const exibido: EstadoDoRanking = isDemo
    ? { status: 'pronto', dados: rankingDemo(metrica), atualizando: false }
    : estado;
  const atualizando =
    modo === 'ranking' && exibido.status === 'pronto' && exibido.atualizando;

  const trocarMetrica = (proxima: MetricaRanking) =>
    setSearchParams((atuais) => escreverMetrica(atuais, proxima), {
      replace: true,
    });

  const trocarAgrupamento = (proximo: AgrupamentoRanking) =>
    setSearchParams((atuais) => escreverAgrupamento(atuais, proximo), {
      replace: true,
    });

  const trocarModo = (proximo: 'ranking' | 'evolucao') =>
    setSearchParams(
      (atuais) => {
        const parametros = new URLSearchParams(atuais);
        if (proximo === 'evolucao') {
          parametros.set('modo', 'evolucao');
        } else {
          parametros.delete('modo');
        }
        return parametros;
      },
      { replace: true },
    );

  return (
    <div className="ranking-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ANÁLISE</p>
          <h1>Ranking</h1>
          <p className="page-subtitle">
            Os {LIMITE_DO_RANKING} serviços que mais consomem energia e mais
            emitem CO₂e no período. <MethodologyLink />
          </p>
        </div>
        <Link
          to={
            isDemo
              ? '/relatorio?demo=1'
              : { pathname: '/relatorio', search: linkSearch }
          }
          className="button button--secondary"
        >
          <Icon name="printer" />
          Relatório do período
        </Link>
      </div>
      <ComparisonSelectionBar />
      <div className="ranking-controles-topo">
        <div
          className="ranking-modos"
          role="group"
          aria-label="Modo de exibição do ranking"
        >
          <button
            type="button"
            aria-pressed={modo === 'ranking'}
            onClick={() => trocarModo('ranking')}
          >
            Ranking
          </button>
          <button
            type="button"
            aria-pressed={modo === 'evolucao'}
            onClick={() => trocarModo('evolucao')}
          >
            Evolução
          </button>
        </div>
        {modo === 'ranking' && (
          <>
            <div
              className="ranking-agrupamentos"
              role="group"
              aria-label="Agrupar o ranking por"
            >
              {agrupamentos.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  aria-pressed={opcao === grupo}
                  onClick={() => trocarAgrupamento(opcao)}
                >
                  {AGRUPAMENTOS[opcao].rotulo}
                </button>
              ))}
            </div>
            <div
              className="ranking-metricas"
              role="group"
              aria-label="Ordenar o ranking por"
            >
              {metricas.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  aria-pressed={opcao === metrica}
                  onClick={() => trocarMetrica(opcao)}
                >
                  {METRICAS[opcao].rotulo}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {modo === 'evolucao' ? (
        <>
          <CorridaDeBarras
            isDemo={isDemo}
            apiQuery={apiQuery}
            linkSearch={linkSearch}
          />
          {!isDemo && <PeriodSelector />}
        </>
      ) : (
        <>
          <p className="ranking-status" role="status">
            {atualizando ? 'Atualizando o ranking...' : ''}
          </p>
          {exibido.status === 'carregando' && (
            <>
              <FeedbackPanel
                kind="loading"
                skeleton="table"
                title="Carregando o ranking"
                description="Somando a energia e a emissão de cada serviço no período."
              />
              {!isDemo && <PeriodSelector />}
            </>
          )}
          {exibido.status === 'erro' && (
            <>
              <FeedbackPanel
                kind="error"
                title="Não foi possível carregar o ranking"
                description={exibido.mensagem}
              >
                <button
                  className="button button--primary"
                  type="button"
                  onClick={recarregar}
                >
                  Tentar novamente
                </button>
              </FeedbackPanel>
              {!isDemo && <PeriodSelector />}
            </>
          )}
          {exibido.status === 'pronto' && (
            <ConteudoDoRanking
              dados={exibido.dados}
              atualizando={atualizando}
              isDemo={isDemo}
              grupo={grupo}
            />
          )}
        </>
      )}
    </div>
  );
}
