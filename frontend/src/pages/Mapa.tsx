import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import FeedbackPanel from '../components/common/FeedbackPanel';
import GloboInterativo from '../components/mapa/GloboInterativo';
import PeriodSelector from '../components/common/PeriodSelector';
import LegendaEmissao from '../components/mapa/LegendaEmissao';
import LinhaDoTempo from '../components/mapa/LinhaDoTempo';
import ListaSemCoordenadas from '../components/mapa/ListaSemCoordenadas';
import MapaLeaflet, { type FocoDoMapa } from '../components/mapa/MapaLeaflet';
import TabelaMapa from '../components/mapa/TabelaMapa';
import useMapa, { type EstadoDoMapa } from '../hooks/useMapa';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { mapaDemo } from '../mocks/mapa';
import type { RespostaMapa } from '../types/mapa';
import {
  RAIOS_NO_GLOBO,
  agruparPorLocal,
  type LocalNoGlobo,
} from '../utils/globo';
import {
  rotuloDoIntervalo,
  somarNoMomento,
  somasDosIntervalos,
  type Momento,
} from '../utils/linhaDoTempo';
import { criarEscalaEmissao, maiorEmissao } from '../utils/mapaEscala';
import '../components/mapa/mapa.css';

type Visao = 'globo' | 'mapa';

function ConteudoDoMapa({ dados }: { dados: RespostaMapa }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const visao: Visao = searchParams.get('visao') === 'mapa' ? 'mapa' : 'globo';
  const [foco, setFoco] = useState<FocoDoMapa | null>(null);
  const [indice, setIndice] = useState<number | null>(null);

  const trocarVisao = (proxima: Visao, novoFoco: FocoDoMapa | null = null) => {
    setFoco(novoFoco);
    setSearchParams(
      (atuais) => {
        const parametros = new URLSearchParams(atuais);
        if (proxima === 'mapa') {
          parametros.set('visao', 'mapa');
        } else {
          parametros.delete('visao');
        }
        return parametros;
      },
      { replace: true },
    );
  };

  const aproximar = (local: LocalNoGlobo) =>
    trocarVisao('mapa', {
      latitude: local.latitude,
      longitude: local.longitude,
      servicoIds: local.servicos.map(({ servicoId }) => servicoId),
    });

  const escalaDoPeriodo = useMemo(
    () =>
      criarEscalaEmissao(
        maiorEmissao(dados.servicos.map(({ totais }) => totais.emissaoGCo2e)),
      ),
    [dados.servicos],
  );
  const escalaDosIntervalos = useMemo(
    () =>
      criarEscalaEmissao(
        maiorEmissao(
          somasDosIntervalos(
            dados.servicos.map((servico) => [servico]),
            dados.intervalos.length,
          ),
        ),
      ),
    [dados.servicos, dados.intervalos.length],
  );
  const locais = useMemo(
    () => agruparPorLocal(dados.servicos),
    [dados.servicos],
  );
  const porIntervalo = indice !== null;
  const escalaDoGlobo = useMemo(
    () =>
      criarEscalaEmissao(
        maiorEmissao(
          porIntervalo
            ? somasDosIntervalos(
                locais.map(({ servicos }) => servicos),
                dados.intervalos.length,
              )
            : locais.map(({ totais }) => totais.emissaoGCo2e),
        ),
        RAIOS_NO_GLOBO,
      ),
    [dados.intervalos.length, locais, porIntervalo],
  );
  const rotulos = useMemo(
    () =>
      dados.intervalos.map((intervalo) =>
        rotuloDoIntervalo(intervalo, dados.granularidade),
      ),
    [dados.intervalos, dados.granularidade],
  );
  const escala = porIntervalo ? escalaDosIntervalos : escalaDoPeriodo;
  const momento = useMemo<Momento | null>(
    () => (indice === null ? null : { indice, rotulo: rotulos[indice] }),
    [indice, rotulos],
  );
  const referenciaEmissao = useMemo(
    () =>
      maiorEmissao(
        [...dados.servicos, ...dados.semCoordenadas].map(
          ({ totais }) => totais.emissaoGCo2e,
        ),
      ),
    [dados.servicos, dados.semCoordenadas],
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
      <div className="mapa-barra">
        <p className="mapa-resumo">
          {dados.servicos.length} de {total} serviços com localização no mapa
        </p>
        <div className="mapa-visoes" role="group" aria-label="Visualização">
          <button
            type="button"
            aria-pressed={visao === 'globo'}
            onClick={() => trocarVisao('globo')}
          >
            Globo
          </button>
          <button
            type="button"
            aria-pressed={visao === 'mapa'}
            onClick={() => trocarVisao('mapa')}
          >
            Mapa
          </button>
        </div>
      </div>
      {rotulos.length > 0 && dados.servicos.length > 0 && (
        <LinhaDoTempo
          rotulos={rotulos}
          indice={indice}
          emissaoNoMomento={somarNoMomento(dados.servicos, indice)}
          onMudar={setIndice}
        />
      )}
      <div className="mapa-conteudo">
        {visao === 'globo' ? (
          <GloboInterativo
            servicos={dados.servicos}
            escala={escalaDoGlobo}
            momento={momento}
            onSelecionar={aproximar}
          />
        ) : (
          <MapaLeaflet
            servicos={dados.servicos}
            escala={escala}
            momento={momento}
            foco={foco}
          />
        )}
        <aside
          className="mapa-laterais"
          aria-label="Legenda e serviços fora do mapa"
        >
          <LegendaEmissao
            escala={visao === 'globo' ? escalaDoGlobo : escala}
            porIntervalo={porIntervalo}
            porLocal={visao === 'globo'}
          />
          <ListaSemCoordenadas
            servicos={dados.semCoordenadas}
            referenciaEmissao={referenciaEmissao}
          />
        </aside>
      </div>
      <TabelaMapa
        servicos={dados.servicos}
        semCoordenadas={dados.semCoordenadas}
        referenciaEmissao={referenciaEmissao}
      />
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
