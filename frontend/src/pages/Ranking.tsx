import { useSearchParams } from 'react-router';
import FeedbackPanel from '../components/common/FeedbackPanel';
import PeriodSelector from '../components/common/PeriodSelector';
import GraficoEnergiaEmissao from '../components/ranking/GraficoEnergiaEmissao';
import GraficoRanking from '../components/ranking/GraficoRanking';
import ListaSemDados from '../components/ranking/ListaSemDados';
import ParticipacaoEmissoes from '../components/ranking/ParticipacaoEmissoes';
import TabelaRanking from '../components/ranking/TabelaRanking';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import useRanking, { type EstadoDoRanking } from '../hooks/useRanking';
import { rankingDemo } from '../mocks/ranking';
import type { MetricaRanking, RespostaRanking } from '../types/ranking';
import {
  LIMITE_DO_RANKING,
  METRICAS,
  consultaDoRanking,
  escreverMetrica,
  formatarPeriodoConsiderado,
  lerMetrica,
} from '../utils/ranking';
import '../components/ranking/ranking.css';

const metricas = Object.keys(METRICAS) as MetricaRanking[];

function ConteudoDoRanking({
  dados,
  atualizando,
  isDemo,
}: {
  dados: RespostaRanking;
  atualizando: boolean;
  isDemo: boolean;
}) {
  const { periodo, metrica, itens, semDados } = dados;

  if (itens.length === 0 && semDados.length === 0) {
    return (
      <FeedbackPanel
        kind="empty"
        title="Nenhum serviço monitorado"
        description="Quando o backend descobrir serviços, eles aparecem no ranking."
      />
    );
  }

  return (
    <div className="ranking-conteudo" aria-busy={atualizando || undefined}>
      <p className="ranking-periodo">
        Dados de {formatarPeriodoConsiderado(periodo)}, no horário de Brasília.
      </p>
      {itens.length === 0 ? (
        <FeedbackPanel
          kind="empty"
          title="Nenhuma coleta no período"
          description="Nenhum serviço teve coletas válidas neste período. Escolha um período maior ou aguarde as próximas coletas."
        />
      ) : (
        <>
          <GraficoRanking itens={itens} metrica={metrica} />
          <GraficoEnergiaEmissao itens={itens} />
          <ParticipacaoEmissoes isDemo={isDemo} />
          <TabelaRanking itens={itens} metrica={metrica} />
        </>
      )}
      {semDados.length > 0 && <ListaSemDados servicos={semDados} />}
    </div>
  );
}

export default function Ranking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
  const metrica = lerMetrica(searchParams);
  const { apiQuery } = usePeriod();
  const { estado, recarregar } = useRanking(
    consultaDoRanking(apiQuery, metrica),
    !isDemo,
  );
  usePageTitle(isDemo ? 'Ranking · demonstração' : 'Ranking');

  const exibido: EstadoDoRanking = isDemo
    ? { status: 'pronto', dados: rankingDemo(metrica), atualizando: false }
    : estado;
  const atualizando = exibido.status === 'pronto' && exibido.atualizando;

  const trocarMetrica = (proxima: MetricaRanking) =>
    setSearchParams((atuais) => escreverMetrica(atuais, proxima), {
      replace: true,
    });

  return (
    <div className="ranking-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ANÁLISE</p>
          <h1>Ranking</h1>
          <p className="page-subtitle">
            Os {LIMITE_DO_RANKING} serviços que mais consomem energia e mais
            emitem CO₂e no período.
          </p>
        </div>
      </div>
      {!isDemo && <PeriodSelector />}
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
      <p className="ranking-status" role="status">
        {atualizando ? 'Atualizando o ranking...' : ''}
      </p>
      {exibido.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          title="Carregando o ranking"
          description="Somando a energia e a emissão de cada serviço no período."
        />
      )}
      {exibido.status === 'erro' && (
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
      )}
      {exibido.status === 'pronto' && (
        <ConteudoDoRanking
          dados={exibido.dados}
          atualizando={atualizando}
          isDemo={isDemo}
        />
      )}
    </div>
  );
}
