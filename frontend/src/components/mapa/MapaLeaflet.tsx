import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import L from './leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import usePeriod from '../../hooks/usePeriod';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import type { ServicoNoMapa } from '../../types/mapa';
import {
  formatarEnergia,
  limitesDosServicos,
  rotuloEstado,
  zoomMinimoDoMapa,
} from '../../utils/mapaDados';
import { emissaoNoMomento, type Momento } from '../../utils/linhaDoTempo';
import { formatarEmissao, type EscalaEmissao } from '../../utils/mapaEscala';

const URL_DOS_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const VISTA_INICIAL: L.LatLngTuple = [20, 0];
const LIMITES_DO_MUNDO: L.LatLngBoundsExpression = [
  [-85.0511, -180],
  [85.0511, 180],
];
const ZOOM_INICIAL = 2;
const ZOOM_MAXIMO_AO_AJUSTAR = 6;
const ZOOM_DE_CHEGADA = 4;
const ZOOM_DO_FOCO = 8;
const DURACAO_DO_VOO_S = 1.2;

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
};

type Marcador = { servico: ServicoNoMapa; camada: L.CircleMarker };

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
}: MapaLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const grupoRef = useRef<L.MarkerClusterGroup | null>(null);
  const marcadoresRef = useRef<Marcador[]>([]);
  const escalaRef = useRef(escala);
  const momentoRef = useRef<Momento | null>(momento);
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
      maxBounds: LIMITES_DO_MUNDO,
      maxBoundsViscosity: 1,
      zoomControl: false,
    });
    L.control
      .zoom({ zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' })
      .addTo(mapa);
    L.tileLayer(URL_DOS_TILES, {
      attribution: ATRIBUICAO,
      maxZoom: 18,
      noWrap: true,
      bounds: LIMITES_DO_MUNDO,
    }).addTo(mapa);
    mapa.attributionControl.setPrefix(false);

    const grupo = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      iconCreateFunction: criarIconeDoGrupo,
    });
    grupo.addTo(mapa);

    const observador = new ResizeObserver(() => {
      mapa.invalidateSize();
      mapa.setMinZoom(
        zoomMinimoDoMapa(container.clientWidth, container.clientHeight),
      );
    });
    observador.observe(container);

    mapaRef.current = mapa;
    grupoRef.current = grupo;

    return () => {
      observador.disconnect();
      mapa.remove();
      mapaRef.current = null;
      grupoRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    const grupo = grupoRef.current;
    if (!mapa || !grupo) {
      return;
    }

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
  }, [foco, linkSearch, movimentoReduzido, navigate, servicos]);

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

  return (
    <div
      ref={containerRef}
      className="mapa-leaflet"
      role="region"
      aria-label="Mapa dos serviços monitorados"
    />
  );
}
