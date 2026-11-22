import {
  descreverPlanetaMeta,
  rotuloEstadoPlaneta,
  type EstadoPlanetaMeta,
} from '../../utils/planetaMeta';
import './planeta-meta.css';

type PlanetaMetaCarbonoProps = {
  estado: EstadoPlanetaMeta;
  percentualConsumido: number;
};

export default function PlanetaMetaCarbono({
  estado,
  percentualConsumido,
}: PlanetaMetaCarbonoProps) {
  const descricao = descreverPlanetaMeta(estado, percentualConsumido);
  const rotulo = rotuloEstadoPlaneta(estado);

  return (
    <figure
      className={`planeta-meta planeta-meta--${estado}`}
      data-testid="planeta-meta-carbono"
      data-estado-planeta={estado}
    >
      <svg
        className="planeta-meta-svg"
        viewBox="0 0 160 160"
        role="img"
        aria-label={descricao}
      >
        <title>{descricao}</title>

        {/* Halo atmosférico */}
        <circle className="planeta-meta-halo" cx="80" cy="96" r="54" />

        {/* Corpo do planeta */}
        <circle className="planeta-meta-oceano" cx="80" cy="96" r="44" />

        {/* Continentes estilizados */}
        <path
          className="planeta-meta-terra"
          d="M52 84 C58 70, 74 66, 84 74 C92 80, 88 94, 76 96 C66 98, 50 96, 52 84 Z"
        />
        <path
          className="planeta-meta-terra"
          d="M94 82 C104 78, 116 86, 114 98 C112 110, 98 118, 88 112 C82 108, 86 86, 94 82 Z"
        />
        <path
          className="planeta-meta-terra"
          d="M54 110 C62 106, 74 110, 78 120 C70 128, 56 124, 54 110 Z"
        />

        {/* Sombra sutil de volume */}
        <path
          className="planeta-meta-sombra"
          d="M80 52 A44 44 0 0 1 80 140 A34 44 0 0 0 80 52 Z"
        />

        {/* Planta sobre o planeta que floresce, alerta ou murcha */}
        <g className="planeta-meta-planta">
          <path
            className="planeta-meta-caule"
            d={
              estado === 'acima'
                ? 'M80 54 C80 42, 92 38, 100 44'
                : estado === 'perto'
                  ? 'M80 54 C80 40, 84 32, 87 28'
                  : 'M80 54 C80 40, 80 30, 80 22'
            }
          />
          <path
            className="planeta-meta-folha planeta-meta-folha--esq"
            d="M79 44 C66 42, 60 32, 68 28 C76 26, 80 36, 79 44 Z"
          />
          <path
            className="planeta-meta-folha planeta-meta-folha--dir"
            d="M81 42 C94 40, 100 30, 92 26 C84 24, 80 34, 81 42 Z"
          />

          {/* Flor aberta no estado abaixo da meta */}
          <g className="planeta-meta-flor">
            <circle cx="80" cy="14" r="4.5" className="planeta-meta-petala" />
            <circle cx="87" cy="19" r="4.5" className="planeta-meta-petala" />
            <circle cx="84.5" cy="27" r="4.5" className="planeta-meta-petala" />
            <circle cx="75.5" cy="27" r="4.5" className="planeta-meta-petala" />
            <circle cx="73" cy="19" r="4.5" className="planeta-meta-petala" />
            <circle cx="80" cy="21" r="4" className="planeta-meta-miolo" />
          </g>
        </g>

        {/* Nuvens / partículas de contexto */}
        <g className="planeta-meta-nuvem" aria-hidden="true">
          <path d="M24 58 C24 52, 30 48, 36 50 C40 46, 48 48, 49 54 C53 54, 55 60, 50 62 L28 62 C25 62, 24 60, 24 58 Z" />
          <path d="M112 46 C112 41, 117 38, 122 40 C125 36, 132 38, 133 43 C137 43, 138 48, 134 50 L115 50 C113 50, 112 48, 112 46 Z" />
        </g>

        {/* Brilhos sutis quando floresce */}
        <g className="planeta-meta-brilhos" aria-hidden="true">
          <circle cx="38" cy="36" r="2.2" />
          <circle cx="122" cy="30" r="2.6" />
          <circle cx="132" cy="70" r="1.8" />
        </g>
      </svg>
      <figcaption className="planeta-meta-legenda">{rotulo}</figcaption>
    </figure>
  );
}
