import { Link } from 'react-router';
import Icon from '../components/common/Icon';
import usePageTitle from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Página não encontrada');
  return (
    <div className="not-found-page">
      <div className="not-found-number" aria-hidden="true">
        4
        <span>
          <Icon name="leaf" />
        </span>
        4
      </div>
      <p className="eyebrow">ENDEREÇO NÃO ENCONTRADO</p>
      <h1>Vamos voltar ao caminho certo?</h1>
      <p>
        Esta página não existe ou o endereço foi alterado.
        <br className="desktop-break" /> Seus indicadores começam no dashboard.
      </p>
      <Link to="/" className="button button--accent">
        Voltar ao dashboard
        <Icon name="arrow" />
      </Link>
      <span className="not-found-caption">
        GreenER · uma perspectiva mais verde para sua tecnologia
      </span>
    </div>
  );
}
