import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import L from './leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import usePeriod from '../../hooks/usePeriod';
import type { ServicoNoMapa } from '../../types/mapa';
import {
  formatarEnergia,
  limitesDosServicos,
  rotuloEstado,
} from '../../utils/mapaDados';
import { formatarEmissao, type EscalaEmissao } from '../../utils/mapaEscala';

const URL_DOS_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const VISTA_INICIAL: L.LatLngTuple = [20, 0];
const ZOOM_INICIAL = 2;
const ZOOM_MINIMO = 0;
const ZOOM_MAXIMO_AO_AJUSTAR = 6;

type MapaLeafletProps = {
  servicos: ServicoNoMapa[];
  escala: EscalaEmissao;
};

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

function criarIconeDoGrupo(grupo: L.MarkerCluster) {
  const quantidade = grupo.getChildCount();
  const tamanho = quantidade < 10 ? 36 : 44;

  return L.divIcon({
    html: `<span>${quantidade}</span>`,
    className: 'mapa-grupo',
    iconSize: [tamanho, tamanho],
  });
}

export default function MapaLeaflet({ servicos, escala }: MapaLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const grupoRef = useRef<L.MarkerClusterGroup | null>(null);
  const navigate = useNavigate();
  const { linkSearch } = usePeriod();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const mapa = L.map(container, {
      center: VISTA_INICIAL,
      zoom: ZOOM_INICIAL,
      minZoom: ZOOM_MINIMO,
      worldCopyJump: true,
      zoomControl: false,
    });
    L.control
      .zoom({ zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' })
      .addTo(mapa);
    L.tileLayer(URL_DOS_TILES, { attribution: ATRIBUICAO, maxZoom: 18 }).addTo(
      mapa,
    );
    mapa.attributionControl.setPrefix(false);

    const grupo = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      iconCreateFunction: criarIconeDoGrupo,
    });
    grupo.addTo(mapa);

    const observador = new ResizeObserver(() => mapa.invalidateSize());
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
      for (const [rotulo, valor] of [
        ['Estado', rotuloEstado(servico.estado)],
        ['Energia', formatarEnergia(servico.totais.energiaKwh)],
        [
          'Emissão',
          servico.totais.emissaoGCo2e === null
            ? 'Sem dados'
            : formatarEmissao(servico.totais.emissaoGCo2e),
        ],
      ]) {
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
    for (const servico of servicos) {
      const emissao = servico.totais.emissaoGCo2e;
      const faixa = escala.faixa(emissao);
      const marcador = L.circleMarker([servico.latitude, servico.longitude], {
        radius: escala.raio(emissao),
        className: `mapa-marcador ${faixa === null ? 'mapa-marcador--sem-dados' : `mapa-marcador--faixa-${faixa}`}`,
        weight: 2,
      });
      marcador.bindTooltip(servico.nome, { direction: 'top', offset: [0, -6] });
      marcador.bindPopup(() => criarPopup(servico), { maxWidth: 260 });
      grupo.addLayer(marcador);
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
  }, [escala, linkSearch, navigate, servicos]);

  return (
    <div
      ref={containerRef}
      className="mapa-leaflet"
      role="region"
      aria-label="Mapa dos serviços monitorados"
    />
  );
}
