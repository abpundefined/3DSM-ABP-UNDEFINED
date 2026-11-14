import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import FeedbackPanel from '../components/common/FeedbackPanel';
import PeriodSelector from '../components/common/PeriodSelector';
import MapaLeaflet from '../components/mapa/MapaLeaflet';
import useMapa, { type EstadoDoMapa } from '../hooks/useMapa';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { mapaDemo } from '../mocks/mapa';
import type { RespostaMapa } from '../types/mapa';
import { criarEscalaEmissao, maiorEmissao } from '../utils/mapaEscala';
import '../components/mapa/mapa.css';

function ConteudoDoMapa({ dados }: { dados: RespostaMapa }) {
  const escala = useMemo(
    () =>
      criarEscalaEmissao(
        maiorEmissao(dados.servicos.map(({ totais }) => totais.emissaoGCo2e)),
      ),
    [dados.servicos],
  );
  const total = dados.servicos.length + dados.semCoordenadas.length;

  if (total === 0) {
    return (
      <FeedbackPanel
        kind="empty"
        title="Nenhum serviço monitorado"
        description="Quando houver serviços cadastrados, eles aparecem no mapa pela região onde rodam."
      />
    );
  }

  return (
    <section className="mapa-painel" aria-label="Mapa de emissões">
      <p className="mapa-resumo">
        {dados.servicos.length} de {total} serviços com localização no mapa
      </p>
      <MapaLeaflet servicos={dados.servicos} escala={escala} />
    </section>
  );
}

export default function Mapa() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';
  const { apiQuery } = usePeriod();
  const { estado, recarregar } = useMapa(apiQuery, !isDemo);
  usePageTitle(isDemo ? 'Mapa de emissões · demonstração' : 'Mapa de emissões');

  const exibido: EstadoDoMapa = isDemo
    ? { status: 'pronto', dados: mapaDemo }
    : estado;

  return (
    <div className="mapa-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">LOCALIZAÇÃO</p>
          <h1>Mapa de emissões</h1>
          <p className="page-subtitle">
            Onde cada serviço roda e quanto ele emite em cada região.
          </p>
        </div>
      </div>
      {!isDemo && <PeriodSelector />}
      {exibido.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          title="Carregando o mapa"
          description="Buscando a localização e a emissão dos serviços no período."
        />
      )}
      {exibido.status === 'erro' && (
        <FeedbackPanel
          kind="error"
          title="Não foi possível carregar o mapa"
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
      {exibido.status === 'pronto' && <ConteudoDoMapa dados={exibido.dados} />}
    </div>
  );
}
