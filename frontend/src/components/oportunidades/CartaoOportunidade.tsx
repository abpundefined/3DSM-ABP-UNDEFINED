import { Link } from 'react-router';
import type { OportunidadeReducao } from '../../types/oportunidades';
import { formatEmission } from '../../utils/formatters';
import {
  formatarEconomiaPercentual,
  rotuloTipoOportunidade,
} from '../../utils/oportunidades';
import Icon from '../common/Icon';

type CartaoOportunidadeProps = {
  oportunidade: OportunidadeReducao;
  linkSearch: string;
  nivelTitulo?: 'h2' | 'h3';
};

export default function CartaoOportunidade({
  oportunidade,
  linkSearch,
  nivelTitulo = 'h3',
}: CartaoOportunidadeProps) {
  const Titulo = nivelTitulo;
  const destino = `${oportunidade.linkDetalhe}${linkSearch}`;

  return (
    <article
      className="oportunidade-card"
      aria-labelledby={`oportunidade-${oportunidade.id}`}
    >
      <header className="oportunidade-card-topo">
        <span
          className={`oportunidade-tipo oportunidade-tipo--${oportunidade.tipo.toLowerCase()}`}
        >
          {rotuloTipoOportunidade(oportunidade.tipo)}
        </span>
        <span
          className="oportunidade-economia"
          aria-label={`Economia estimada de ${formatEmission(oportunidade.economiaEstimadaGCo2e)} (${formatarEconomiaPercentual(oportunidade.economiaPercentual)})`}
        >
          −{formatEmission(oportunidade.economiaEstimadaGCo2e)} (
          {formatarEconomiaPercentual(oportunidade.economiaPercentual)})
        </span>
      </header>

      <div className="oportunidade-card-corpo">
        <p className="oportunidade-servico">{oportunidade.servicoNome}</p>
        <Titulo
          id={`oportunidade-${oportunidade.id}`}
          className="oportunidade-titulo"
        >
          {oportunidade.titulo}
        </Titulo>
        <p className="oportunidade-explicacao">{oportunidade.explicacao}</p>
      </div>

      <footer className="oportunidade-card-rodape">
        <Link to={destino} className="oportunidade-link">
          Ver detalhe de {oportunidade.servicoNome}
          <Icon name="arrow" />
        </Link>
      </footer>
    </article>
  );
}
