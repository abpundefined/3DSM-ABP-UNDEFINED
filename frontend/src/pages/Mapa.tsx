import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import FeedbackPanel from '../components/common/FeedbackPanel';
import GraficoIntensidadeRegiao from '../components/mapa/GraficoIntensidadeRegiao';
import GloboInterativo, {
  ZOOM_DE_RETORNO,
  type CentroDoGlobo,
} from '../components/mapa/GloboInterativo';
import PeriodSelector from '../components/common/PeriodSelector';
import MelhorHorario from '../components/horarios/MelhorHorario';
import LegendaEmissao from '../components/mapa/LegendaEmissao';
import LinhaDoTempo from '../components/mapa/LinhaDoTempo';
import ListaSemCoordenadas from '../components/mapa/ListaSemCoordenadas';
import MapaLeaflet, { type FocoDoMapa } from '../components/mapa/MapaLeaflet';
import SimulacaoMapaPainel from '../components/mapa/SimulacaoMapaPainel';
import TabelaMapa from '../components/mapa/TabelaMapa';
import useMapa, { type EstadoDoMapa } from '../hooks/useMapa';
import usePageTitle from '../hooks/usePageTitle';
import usePeriod from '../hooks/usePeriod';
import { mapaDemo } from '../mocks/mapa';
import type { RespostaMapa } from '../types/mapa';
import {
  RAIOS_NO_GLOBO,
  agruparPorLocal,
  centralizar,
  type LocalNoGlobo,
  type Rotacao,
} from '../utils/globo';
import {
  rotuloDoIntervalo,
  somarNoMomento,
  somasDosIntervalos,
  type Momento,
} from '../utils/linhaDoTempo';
import { filtrarPorRegiao, regioesDoMapa } from '../utils/mapaDados';
import { criarEscalaEmissao, maiorEmissao } from '../utils/mapaEscala';
import { ehModoDemo } from '../utils/modoDemo';
import { estaEmModoTv, MEDIA_MODO_TV_DESKTOP } from '../utils/modoTv';
import {
  aplicarSimulacoesNoMapa,
  extrairRegioesAlvoMapa,
  simularMudancaRegiaoNoMapa,
  type SimulacaoRegiaoMapa,
} from '../utils/simulacaoMapa';
import '../components/mapa/mapa.css';

const Globo3dModoTv = lazy(() => import('../components/mapa/Globo3dModoTv'));

type Visao = 'globo' | 'mapa';

function ConteudoDoMapa({ dados }: { dados: RespostaMapa }) {
  const { search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const visao: Visao = searchParams.get('visao') === 'mapa' ? 'mapa' : 'globo';
  const [foco, setFoco] = useState<FocoDoMapa | null>(null);
  const [retornoAoGlobo, setRetornoAoGlobo] = useState<Rotacao | null>(null);
  const [indice, setIndice] = useState<number | null>(null);
  const [modoSimular, setModoSimular] = useState(false);
  const [simulacoes, setSimulacoes] = useState<
    Map<number, SimulacaoRegiaoMapa>
  >(() => new Map());
  const [ultimoServicoSimuladoId, setUltimoServicoSimuladoId] = useState<
    number | null
  >(null);
  const [fallback2dTv, setFallback2dTv] = useState(false);
  const [ehDesktopTv, setEhDesktopTv] = useState(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return true;
    }
    return window.matchMedia(MEDIA_MODO_TV_DESKTOP).matches;
  });

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const media = window.matchMedia(MEDIA_MODO_TV_DESKTOP);
    const atualizar = (evento: MediaQueryListEvent) =>
      setEhDesktopTv(evento.matches);
    media.addEventListener('change', atualizar);
    return () => media.removeEventListener('change', atualizar);
  }, []);

  const modoTvAtivo = ehDesktopTv && estaEmModoTv(search);
  const regioesAlvo = useMemo(
    () => extrairRegioesAlvoMapa(dados.servicos, dados.semCoordenadas),
    [dados.servicos, dados.semCoordenadas],
  );
  const podeSimularNoMapa = !modoTvAtivo && regioesAlvo.length >= 2;
  const simulacaoAtiva = podeSimularNoMapa && modoSimular;
  const usarGlobo3dTv = modoTvAtivo && visao === 'globo' && !fallback2dTv;
  const mostrarMapa2d =
    simulacaoAtiva ||
    visao === 'mapa' ||
    (modoTvAtivo && visao === 'globo' && fallback2dTv);

  const regioes = useMemo(
    () => regioesDoMapa(dados.servicos),
    [dados.servicos],
  );
  const regiaoPedida = searchParams.get('regiao');
  const regiao = regioes.find(({ codigo }) => codigo === regiaoPedida) ?? null;
  const codigoDaRegiao = regiao?.codigo ?? null;
  const servicos = useMemo(
    () => filtrarPorRegiao(dados.servicos, codigoDaRegiao),
    [codigoDaRegiao, dados.servicos],
  );
  const semCoordenadas = useMemo(
    () => filtrarPorRegiao(dados.semCoordenadas, codigoDaRegiao),
    [codigoDaRegiao, dados.semCoordenadas],
  );

  const atualizarParametro = (nome: string, valor: string | null) =>
    setSearchParams(
      (atuais) => {
        const parametros = new URLSearchParams(atuais);
        if (valor === null) {
          parametros.delete(nome);
        } else {
          parametros.set(nome, valor);
        }
        return parametros;
      },
      { replace: true },
    );

  const trocarVisao = (proxima: Visao, novoFoco: FocoDoMapa | null = null) => {
    if (proxima === 'globo') {
      setModoSimular(false);
      setSimulacoes(new Map());
      setUltimoServicoSimuladoId(null);
    }
    setFoco(novoFoco);
    setRetornoAoGlobo(null);
    atualizarParametro('visao', proxima === 'mapa' ? 'mapa' : null);
  };

  const fecharSimulacao = () => {
    setModoSimular(false);
    setSimulacoes(new Map());
    setUltimoServicoSimuladoId(null);
  };

  const alternarModoSimular = () => {
    if (simulacaoAtiva) {
      fecharSimulacao();
      return;
    }
    setModoSimular(true);
    setIndice(null);
    setFoco(null);
    setRetornoAoGlobo(null);
    setSearchParams(
      (atuais) => {
        const parametros = new URLSearchParams(atuais);
        parametros.set('visao', 'mapa');
        parametros.delete('regiao');
        return parametros;
      },
      { replace: true },
    );
  };

  const simularServico = (servicoId: number, regiaoDestinoCodigo: string) => {
    const servico = dados.servicos.find((item) => item.servicoId === servicoId);
    const destino = regioesAlvo.find(
      (item) => item.codigo === regiaoDestinoCodigo,
    );
    if (!servico || !destino) {
      return;
    }

    setSimulacoes((atuais) => {
      const proximo = new Map(atuais);
      if (destino.codigo === servico.regiaoCodigo) {
        proximo.delete(servicoId);
      } else {
        proximo.set(servicoId, simularMudancaRegiaoNoMapa(servico, destino));
      }
      return proximo;
    });
    setUltimoServicoSimuladoId(servicoId);
  };

  const desfazerSimulacao = (servicoId: number) => {
    setSimulacoes((atuais) => {
      if (!atuais.has(servicoId)) {
        return atuais;
      }
      const proximo = new Map(atuais);
      proximo.delete(servicoId);
      return proximo;
    });
  };

  const desfazerTodasSimulacoes = () => {
    setSimulacoes(new Map());
    setUltimoServicoSimuladoId(null);
  };

  const entrarNoMapa = ({ latitude, longitude, zoom }: CentroDoGlobo) =>
    trocarVisao('mapa', { latitude, longitude, servicoIds: [], zoom });

  const voltarAoGlobo = ({
    latitude,
    longitude,
  }: {
    latitude: number;
    longitude: number;
  }) => {
    trocarVisao('globo');
    setRetornoAoGlobo(centralizar(longitude, latitude));
  };

  const trocarRegiao = (codigo: string) => {
    setFoco(null);
    setRetornoAoGlobo(null);
    atualizarParametro('regiao', codigo === '' ? null : codigo);
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
  const servicosNoMapa2d = useMemo(
    () =>
      simulacaoAtiva
        ? aplicarSimulacoesNoMapa(dados.servicos, simulacoes)
        : servicos,
    [dados.servicos, servicos, simulacaoAtiva, simulacoes],
  );
  const escalaSimulada = useMemo(
    () =>
      criarEscalaEmissao(
        maiorEmissao(
          [...dados.servicos, ...servicosNoMapa2d].map(
            ({ totais }) => totais.emissaoGCo2e,
          ),
        ),
      ),
    [dados.servicos, servicosNoMapa2d],
  );
  const escalaDoMapa2d = simulacaoAtiva ? escalaSimulada : escala;
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
  const rotacaoDaRegiao = regiao
    ? centralizar(servicos[0].longitude, servicos[0].latitude)
    : undefined;

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
      {simulacaoAtiva && (
        <SimulacaoMapaPainel
          servicos={dados.servicos}
          regioesAlvo={regioesAlvo}
          simulacoes={simulacoes}
          ultimoServicoSimuladoId={ultimoServicoSimuladoId}
          onSimular={simularServico}
          onDesfazer={desfazerSimulacao}
          onDesfazerTudo={desfazerTodasSimulacoes}
          onFechar={fecharSimulacao}
        />
      )}
      <div className="mapa-conteudo">
        {usarGlobo3dTv ? (
          <Suspense
            fallback={
              <GloboInterativo
                key={codigoDaRegiao ?? 'todas'}
                servicos={servicos}
                escala={escalaDoGlobo}
                momento={momento}
                rotacaoInicial={retornoAoGlobo ?? rotacaoDaRegiao}
                zoomInicial={retornoAoGlobo ? ZOOM_DE_RETORNO : undefined}
                onSelecionar={aproximar}
                onEntrarNoMapa={entrarNoMapa}
              />
            }
          >
            <Globo3dModoTv
              servicos={servicos}
              escala={escalaDoGlobo}
              momento={momento}
              onFallback2d={() => setFallback2dTv(true)}
            />
          </Suspense>
        ) : mostrarMapa2d ? (
          <MapaLeaflet
            servicos={servicosNoMapa2d}
            escala={escalaDoMapa2d}
            momento={simulacaoAtiva ? null : momento}
            foco={simulacaoAtiva ? null : foco}
            onVoltarAoGlobo={simulacaoAtiva ? undefined : voltarAoGlobo}
            modoSimular={simulacaoAtiva}
            regioesAlvo={regioesAlvo}
            simulacoes={simulacoes}
            onSimularArrasto={simularServico}
          />
        ) : (
          <GloboInterativo
            key={codigoDaRegiao ?? 'todas'}
            servicos={servicos}
            escala={escalaDoGlobo}
            momento={momento}
            rotacaoInicial={retornoAoGlobo ?? rotacaoDaRegiao}
            zoomInicial={retornoAoGlobo ? ZOOM_DE_RETORNO : undefined}
            onSelecionar={aproximar}
            onEntrarNoMapa={entrarNoMapa}
          />
        )}
        <aside
          className="mapa-laterais"
          aria-label="Legenda e serviços fora do mapa"
        >
          <LegendaEmissao
            escala={mostrarMapa2d ? escalaDoMapa2d : escalaDoGlobo}
            porIntervalo={!simulacaoAtiva && porIntervalo}
            porLocal={!mostrarMapa2d}
          />
          <ListaSemCoordenadas
            servicos={semCoordenadas}
            referenciaEmissao={referenciaEmissao}
          />
          {modoTvAtivo && fallback2dTv && (
            <p className="mapa-tv-fallback-nota" role="status">
              Mapa 2D ativado automaticamente para manter o desempenho no modo
              TV.
            </p>
          )}
        </aside>
      </div>
      {!simulacaoAtiva && rotulos.length > 0 && servicos.length > 0 && (
        <LinhaDoTempo
          rotulos={rotulos}
          indice={indice}
          emissaoNoMomento={somarNoMomento(servicos, indice)}
          onMudar={setIndice}
        />
      )}
      <div className="mapa-barra">
        <p className="mapa-resumo">
          {regiao && !simulacaoAtiva
            ? `${servicos.length} ${servicos.length === 1 ? 'serviço' : 'serviços'} em ${regiao.local}`
            : `${dados.servicos.length} de ${total} serviços com localização no mapa`}
        </p>
        {regioes.length > 0 && !simulacaoAtiva && (
          <label className="mapa-regiao">
            <span>Região</span>
            <select
              value={codigoDaRegiao ?? ''}
              onChange={(evento) => trocarRegiao(evento.target.value)}
            >
              <option value="">Todas as regiões</option>
              {regioes.map(({ codigo, local }) => (
                <option key={codigo} value={codigo}>
                  {local}
                </option>
              ))}
            </select>
          </label>
        )}
        {podeSimularNoMapa && (
          <button
            type="button"
            className="mapa-simular-botao"
            aria-pressed={simulacaoAtiva}
            onClick={alternarModoSimular}
          >
            Simular
          </button>
        )}
        <div className="mapa-visoes" role="group" aria-label="Visualização">
          <button
            type="button"
            aria-pressed={!simulacaoAtiva && visao === 'globo'}
            onClick={() => trocarVisao('globo')}
          >
            Globo
          </button>
          <button
            type="button"
            aria-pressed={simulacaoAtiva || visao === 'mapa'}
            onClick={() => trocarVisao('mapa')}
          >
            Mapa
          </button>
        </div>
      </div>
      <TabelaMapa
        servicos={servicos}
        semCoordenadas={semCoordenadas}
        referenciaEmissao={referenciaEmissao}
      />
    </section>
  );
}

function HorariosDoMapa({ dados }: { dados: RespostaMapa }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
  const { apiQuery, linkSearch } = usePeriod();
  const regioes = useMemo(
    () => regioesDoMapa(dados.servicos),
    [dados.servicos],
  );
  const codigoDoMapa =
    regioes.find(({ codigo }) => codigo === searchParams.get('regiao'))
      ?.codigo ?? null;
  const pedida = searchParams.get('horarios');
  const regiao =
    pedida === 'todas'
      ? null
      : (regioes.find(({ codigo }) => codigo === pedida)?.codigo ??
        codigoDoMapa);

  return (
    <MelhorHorario
      regioes={regioes.map(({ codigo, local }) => ({ codigo, rotulo: local }))}
      regiao={regiao}
      onTrocarRegiao={(codigo) =>
        setSearchParams(
          (atuais) => {
            const parametros = new URLSearchParams(atuais);
            parametros.set('horarios', codigo ?? 'todas');
            return parametros;
          },
          { replace: true },
        )
      }
      periodQuery={apiQuery}
      isDemo={isDemo}
      linkMetodologia={`/metodologia${isDemo ? '?demo=1' : linkSearch}`}
    />
  );
}

export default function Mapa() {
  const [searchParams] = useSearchParams();
  const isDemo = ehModoDemo(searchParams);
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
      {exibido.status === 'carregando' && (
        <FeedbackPanel
          kind="loading"
          skeleton="chart"
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
      {!isDemo && <PeriodSelector />}
      {exibido.status === 'pronto' &&
        exibido.dados.servicos.length + exibido.dados.semCoordenadas.length >
          0 && (
          <>
            <GraficoIntensidadeRegiao
              servicos={exibido.dados.servicos}
              semCoordenadas={exibido.dados.semCoordenadas}
            />
            <HorariosDoMapa dados={exibido.dados} />
          </>
        )}
    </div>
  );
}
