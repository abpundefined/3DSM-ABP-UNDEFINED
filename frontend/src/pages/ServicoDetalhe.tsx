import { useParams } from 'react-router';
import PlaceholderPage from '../components/common/PlaceholderPage';

export default function ServicoDetalhe() {
  const { id } = useParams();

  return (
    <PlaceholderPage
      eyebrow="SERVIÇO"
      title={`Serviço ${id}`}
      description="Histórico de consumo, emissão e estado deste serviço."
      issue="#99"
    />
  );
}
