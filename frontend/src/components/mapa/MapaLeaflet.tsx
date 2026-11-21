import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import L from './leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import usePeriod from '../../hooks/usePeriod';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { ESTILO_DO_MAPA } from '../../utils/estiloDoMapa';
import type { ServicoNoMapa } from '../../types/mapa';
import {
  formatarEnergia,
  limitesDosServicos,
  rotuloEstado,
  zoomMinimoDoMapa,
} from '../../utils/mapaDados';
import { emissaoNoMomento, type Momento } from '../../utils/linhaDoTempo';
import { formatarEmissao, type EscalaEmissao } from '../../utils/mapaEscala';
import {
  encontrarRegiaoMaisProxima,
  formatarIntensidadeAlvo,
  posicoesSemSobreposicao,
  type RegiaoAlvoMapa,
  type SimulacaoRegiaoMapa,
} from '../../utils/simulacaoMapa';
import ControlesDeZoom from './ControlesDeZoom';

const URL_DOS_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ATRIBUICAO_VETORIAL = `<a href="https://openfreemap.org">OpenFreeMap</a> · &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> · ${ATRIBUICAO}`;
const VISTA_INICIAL: L.LatLngTuple = [20, 0];
const ZOOM_MAXIMO = 18;
const LIMITES_DO_MUNDO: L.LatLngBoundsExpression = [
  [-85.0511, -180],
  [85.0511, 180],
];
const ZOOM_INICIAL = 2;
const ZOOM_MAXIMO_AO_AJUSTAR = 6;
const ZOOM_DE_CHEGADA = 4;
const ZOOM_DO_FOCO = 8;
const DURACAO_DO_VOO_S = 1.2;
const ROLAGEM_PARA_O_GLOBO = 300;
const ESPERA_DA_ROLAGEM_MS = 500;

export type FocoDoMapa = {
  latitude: number;
  longitude: number;
  servicoIds: number[];
  zoom?: number;
};

type MapaLeafletProps = {
  servicos: ServicoNoMapa[];
  escala: EscalaEmissao;
  momento?: Momento | null;
  foco?: FocoDoMapa | null;
  onVoltarAoGlobo?: (centro: { latitude: number; longitude: number }) => void;
  modoSimular?: boolean;
  regioesAlvo?: readonly RegiaoAlvoMapa[];
  simulacoes?: ReadonlyMap<number, SimulacaoRegiaoMapa>;
  onSimularArrasto?: (servicoId: number, regiaoDestinoCodigo: string) => void;
};

type EstadoDoZoom = { atual: number; minimo: number; maximo: number };

type Marcador = { servico: ServicoNoMapa; camada: L.CircleMarker };

function siglaDoServico(nome: string) {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0);
  if (palavras.length >= 2) {
    return `${palavras[0][0]}${palavras[1][0]}`.toLocaleUpperCase('pt-BR');
  }
  return nome.trim().slice(0, 2).toLocaleUpperCase('pt-BR') || 'SV';
}

function criarIconeArrastavel(
  servico: ServicoNoMapa,
  valor: number | null,
  escala: EscalaEmissao,
  simulado: boolean,
) {
  const faixa = escala.faixa(valor);
  const tamanho = Math.max(26, Math.round(escala.raio(valor) * 2));
  const classeFaixa =
    faixa === null
      ? 'mapa-marcador-arrastavel--sem-dados'
      : `mapa-marcador-arrastavel--faixa-${faixa}`;
  const classeSimulado = simulado ? ' mapa-marcador-arrastavel--simulado' : '';
  const sigla = siglaDoServico(servico.nome);

  return L.divIcon({
    html: `<span class="mapa-marcador-arrastavel-sigla" data-servico-id="${servico.servicoId}" aria-hidden="true">${sigla}</span>`,
    className: `mapa-marcador-arrastavel ${classeFaixa}${classeSimulado}`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  });
}

function criarElemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe: string,
  texto?: string,
) {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  if (texto !== undefined) {
    elemento.textContent = texto;
  }
  return elemento;
}

function formatarEmissaoOuVazio(valor: number | null) {
  return valor === null ? 'Sem dados' : formatarEmissao(valor);
}

function estilizar(
  camada: L.CircleMarker,
  valor: number | null,
  escala: EscalaEmissao,
) {
  const faixa = escala.faixa(valor);
  const classe = `mapa-marcador ${faixa === null ? 'mapa-marcador--sem-dados' : `mapa-marcador--faixa-${faixa}`}`;

  camada.setRadius(escala.raio(valor));
  camada.options.className = classe;
  camada.getElement()?.setAttribute('class', `${classe} leaflet-interactive`);
}

function criarIconeDoGrupo(grupo: L.MarkerCluster) {
  const quantidade = grupo.getChildCount();
  const tamanho = quantidade < 10 ? 36 : 44;

  return L.divIcon({
    html: `<span>${quantidade}</span>`,
    className: 'mapa-grupo',
    iconSize: [tamanho, tamanho],
  });
}

export default function MapaLeaflet({
  servicos,
  escala,
  momento = null,
  foco = null,
  onVoltarAoGlobo,
  modoSimular = false,
  regioesAlvo = [],
  simulacoes,
  onSimularArrasto,
}: MapaLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const grupoRef = useRef<L.MarkerClusterGroup | null>(null);
  const camadaSimulacaoRef = useRef<L.LayerGroup | null>(null);
  const marcadoresRef = useRef<Marcador[]>([]);
  const escalaRef = useRef(escala);
  const momentoRef = useRef<Momento | null>(momento);
  const aoVoltarRef = useRef(onVoltarAoGlobo);
  const regioesAlvoRef = useRef(regioesAlvo);
  const onSimularArrastoRef = useRef(onSimularArrasto);
  const ajusteSimulacaoRef = useRef(false);
  const [zoom, setZoom] = useState<EstadoDoZoom | null>(null);
  const navigate = useNavigate();
  const { linkSearch } = usePeriod();
  const movimentoReduzido = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const mapa = L.map(container, {
      center: VISTA_INICIAL,
      zoom: ZOOM_INICIAL,
      minZoom: zoomMinimoDoMapa(container.clientWidth, container.clientHeight),
      maxZoom: ZOOM_MAXIMO,
      maxBounds: LIMITES_DO_MUNDO,
      maxBoundsViscosity: 1,
      zoomControl: false,
    });
    mapa.attributionControl.setPrefix(false);

    const grupo = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      iconCreateFunction: criarIconeDoGrupo,
    });
    grupo.addTo(mapa);
    const camadaSimulacao = L.layerGroup().addTo(mapa);

    const atualizarZoom = () =>
      setZoom({
        atual: mapa.getZoom(),
        minimo: mapa.getMinZoom(),
        maximo: mapa.getMaxZoom(),
      });
    mapa.on('zoomend moveend zoomlevelschange', atualizarZoom);

    const voltarAoGlobo = () => {
      const centro = mapa.getCenter();
      aoVoltarRef.current?.({ latitude: centro.lat, longitude: centro.lng });
    };
    const noZoomMinimo = () => mapa.getZoom() <= mapa.getMinZoom();
    let rolagemAcumulada = 0;
    let temporizadorDaRolagem = 0;
    const aoRolar = (evento: WheelEvent) => {
      if (!noZoomMinimo() || evento.deltaY <= 0) {
        rolagemAcumulada = 0;
        return;
      }
      const fator = evento.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
      rolagemAcumulada += evento.deltaY * fator;
      window.clearTimeout(temporizadorDaRolagem);
      temporizadorDaRolagem = window.setTimeout(() => {
        rolagemAcumulada = 0;
      }, ESPERA_DA_ROLAGEM_MS);
      if (rolagemAcumulada >= ROLAGEM_PARA_O_GLOBO) {
        rolagemAcumulada = 0;
        voltarAoGlobo();
      }
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      if ((evento.key === '-' || evento.key === '_') && noZoomMinimo()) {
        voltarAoGlobo();
      }
    };
    container.addEventListener('wheel', aoRolar);
    container.addEventListener('keydown', aoTeclar);

    const observador = new ResizeObserver(() => {
      mapa.invalidateSize();
      mapa.setMinZoom(
        zoomMinimoDoMapa(container.clientWidth, container.clientHeight),
      );
    });
    observador.observe(container);

    mapaRef.current = mapa;
    grupoRef.current = grupo;
    camadaSimulacaoRef.current = camadaSimulacao;

    return () => {
      window.clearTimeout(temporizadorDaRolagem);
      container.removeEventListener('wheel', aoRolar);
      container.removeEventListener('keydown', aoTeclar);
      observador.disconnect();
      mapa.remove();
      mapaRef.current = null;
      grupoRef.current = null;
      camadaSimulacaoRef.current = null;
    };
  }, []);

  useEffect(() => {
    escalaRef.current = escala;
  }, [escala]);

  useEffect(() => {
    regioesAlvoRef.current = regioesAlvo;
  }, [regioesAlvo]);

  useEffect(() => {
    onSimularArrastoRef.current = onSimularArrasto;
  }, [onSimularArrasto]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const grupo = grupoRef.current;
    const camadaSimulacao = camadaSimulacaoRef.current;
    if (!mapa || !grupo || !camadaSimulacao) {
      return;
    }

    if (modoSimular) {
      grupo.clearLayers();
      marcadoresRef.current = [];
      camadaSimulacao.clearLayers();

      for (const regiao of regioesAlvo) {
        const alvo = L.circleMarker([regiao.latitude, regiao.longitude], {
          radius: 20,
          weight: 2,
          className: 'mapa-alvo-regiao',
        });
        alvo.on('add', () => {
          alvo.getElement()?.setAttribute('data-regiao-alvo', regiao.codigo);
        });
        alvo.bindTooltip(
          `${regiao.local} · ${formatarIntensidadeAlvo(regiao.intensidadeGCo2ePorKwh)}`,
          { direction: 'bottom', offset: [0, 12] },
        );
        alvo.addTo(camadaSimulacao);
      }

      const posicoes = posicoesSemSobreposicao(servicos);
      for (const servico of servicos) {
        const posicao = posicoes.get(servico.servicoId) ?? {
          latitude: servico.latitude,
          longitude: servico.longitude,
        };
        const simulado = simulacoes?.has(servico.servicoId) ?? false;
        const valor = servico.totais.emissaoGCo2e;
        const marcador = L.marker([posicao.latitude, posicao.longitude], {
          draggable: true,
          keyboard: true,
          title: `${servico.nome} — arraste para simular outra região`,
          alt: `${servico.nome} em ${servico.local}`,
          icon: criarIconeArrastavel(
            servico,
            valor,
            escalaRef.current,
            simulado,
          ),
        });
        marcador.bindTooltip(
          `${servico.nome} · ${servico.local}${simulado ? ' (simulado)' : ''} — arraste para simular outra região`,
          { direction: 'top', offset: [0, -10] },
        );
        marcador.on('dragend', () => {
          const destinoAtual = marcador.getLatLng();
          const regiaoDestino = encontrarRegiaoMaisProxima(
            destinoAtual.lat,
            destinoAtual.lng,
            regioesAlvoRef.current,
          );
          marcador.setLatLng([posicao.latitude, posicao.longitude]);
          if (regiaoDestino) {
            onSimularArrastoRef.current?.(
              servico.servicoId,
              regiaoDestino.codigo,
            );
          }
        });
        marcador.addTo(camadaSimulacao);
      }

      if (!ajusteSimulacaoRef.current) {
        ajusteSimulacaoRef.current = true;
        const limites = limitesDosServicos(servicos);
        if (limites) {
          mapa.fitBounds(limites, {
            padding: [56, 56],
            maxZoom: ZOOM_MAXIMO_AO_AJUSTAR,
            animate: false,
          });
        }
      }
      return;
    }

    ajusteSimulacaoRef.current = false;
    camadaSimulacao.clearLayers();

    const criarPopup = (servico: ServicoNoMapa) => {
      const conteudo = criarElemento('div', 'mapa-popup');
      const href = `/servicos/${servico.servicoId}${linkSearch}`;
      const link = criarElemento('a', 'mapa-popup-link', 'Ver detalhes');
      link.href = href;
      link.addEventListener('click', (evento) => {
        evento.preventDefault();
        navigate(href);
      });

      const lista = criarElemento('dl', 'mapa-popup-dados');
      const linhas = [
        ['Estado', rotuloEstado(servico.estado)],
        ['Energia', formatarEnergia(servico.totais.energiaKwh)],
        ['Emissão', formatarEmissaoOuVazio(servico.totais.emissaoGCo2e)],
      ];
      const atual = momentoRef.current;
      if (atual) {
        linhas.push([
          `Em ${atual.rotulo}`,
          formatarEmissaoOuVazio(emissaoNoMomento(servico, atual.indice)),
        ]);
      }
      for (const [rotulo, valor] of linhas) {
        const linha = criarElemento('div', 'mapa-popup-linha');
        linha.append(criarElemento('dt', '', rotulo));
        linha.append(criarElemento('dd', '', valor));
        lista.append(linha);
      }

      conteudo.append(
        criarElemento('strong', 'mapa-popup-nome', servico.nome),
        criarElemento('span', 'mapa-popup-local', servico.local),
        lista,
        link,
      );
      return conteudo;
    };

    grupo.clearLayers();
    const marcadores = new Map<number, L.CircleMarker>();
    const indice = momentoRef.current?.indice ?? null;
    marcadoresRef.current = servicos.map((servico) => {
      const camada = L.circleMarker([servico.latitude, servico.longitude], {
        weight: 2,
      });
      estilizar(camada, emissaoNoMomento(servico, indice), escalaRef.current);
      camada.bindTooltip(servico.nome, { direction: 'top', offset: [0, -6] });
      camada.bindPopup(() => criarPopup(servico), { maxWidth: 260 });
      marcadores.set(servico.servicoId, camada);
      return { servico, camada };
    });
    grupo.addLayers(marcadoresRef.current.map(({ camada }) => camada));

    if (foco) {
      const destino: L.LatLngTuple = [foco.latitude, foco.longitude];
      const marcadorUnico =
        foco.servicoIds.length === 1
          ? marcadores.get(foco.servicoIds[0])
          : undefined;
      const abrirPopup = () => {
        if (marcadorUnico && mapa.hasLayer(marcadorUnico)) {
          marcadorUnico.openPopup();
        }
      };

      if (foco.servicoIds.length === 0) {
        mapa.setView(destino, foco.zoom ?? ZOOM_DE_CHEGADA, { animate: false });
        return;
      }
      if (movimentoReduzido) {
        mapa.setView(destino, ZOOM_DO_FOCO, { animate: false });
        abrirPopup();
      } else {
        mapa.setView(destino, ZOOM_DE_CHEGADA, { animate: false });
        mapa.once('moveend', abrirPopup);
        mapa.flyTo(destino, ZOOM_DO_FOCO, { duration: DURACAO_DO_VOO_S });
      }
      return () => {
        mapa.off('moveend', abrirPopup);
      };
    }

    const limites = limitesDosServicos(servicos);
    if (limites) {
      mapa.fitBounds(limites, {
        padding: [48, 48],
        maxZoom: ZOOM_MAXIMO_AO_AJUSTAR,
        animate: false,
      });
    } else {
      mapa.setView(VISTA_INICIAL, ZOOM_INICIAL, { animate: false });
    }
  }, [
    foco,
    linkSearch,
    modoSimular,
    movimentoReduzido,
    navigate,
    regioesAlvo,
    servicos,
    simulacoes,
  ]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) {
      return;
    }

    const controle = new AbortController();
    let camada: L.Layer | null = null;
    const usarImagens = () => {
      camada = L.tileLayer(URL_DOS_TILES, {
        attribution: ATRIBUICAO,
        maxZoom: ZOOM_MAXIMO,
        noWrap: true,
        bounds: LIMITES_DO_MUNDO,
      }).addTo(mapa);
    };

    import('./camadaVetorial')
      .then(({ criarCamadaVetorial }) =>
        criarCamadaVetorial(
          ESTILO_DO_MAPA,
          ATRIBUICAO_VETORIAL,
          controle.signal,
        ),
      )
      .then((vetorial) => {
        if (controle.signal.aborted) {
          return;
        }
        camada = vetorial.addTo(mapa);
      })
      .catch(() => {
        if (!controle.signal.aborted) {
          usarImagens();
        }
      });

    return () => {
      controle.abort();
      if (camada) {
        mapa.removeLayer(camada);
      }
    };
  }, []);

  useEffect(() => {
    aoVoltarRef.current = onVoltarAoGlobo;
  }, [onVoltarAoGlobo]);

  useEffect(() => {
    escalaRef.current = escala;
    momentoRef.current = momento;
    const indice = momento?.indice ?? null;

    for (const { servico, camada } of marcadoresRef.current) {
      estilizar(camada, emissaoNoMomento(servico, indice), escala);
      if (camada.isPopupOpen()) {
        camada.getPopup()?.update();
      }
    }
  }, [escala, momento, servicos]);

  const noMinimo = zoom !== null && zoom.atual <= zoom.minimo;
  const podeVoltar = noMinimo && onVoltarAoGlobo !== undefined;

  return (
    <div className="mapa-leaflet-area">
      <div
        ref={containerRef}
        className="mapa-leaflet"
        role="region"
        aria-label="Mapa dos serviços monitorados"
      />
      {zoom && (
        <ControlesDeZoom
          onAproximar={() => mapaRef.current?.zoomIn()}
          onAfastar={() => {
            const mapa = mapaRef.current;
            if (!mapa) {
              return;
            }
            if (podeVoltar) {
              const centro = mapa.getCenter();
              onVoltarAoGlobo({ latitude: centro.lat, longitude: centro.lng });
            } else {
              mapa.zoomOut();
            }
          }}
          aproximarDesabilitado={zoom.atual >= zoom.maximo}
          afastarDesabilitado={noMinimo && !podeVoltar}
          rotuloAfastar={podeVoltar ? 'Voltar ao globo' : 'Afastar'}
        />
      )}
    </div>
  );
}
