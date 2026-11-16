import { useParams, useSearchParams } from 'react-router';
import PeriodSelector from '../components/common/PeriodSelector';
import PlaceholderPage from '../components/common/PlaceholderPage';
import SimuladorRegiao from '../components/servico/SimuladorRegiao';

export default function ServicoDetalhe() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === '1';

  return (
    <PlaceholderPage
      eyebrow="SERVIÇO"
      title={`Serviço ${id}`}
      description="Histórico de consumo, emissão e estado deste serviço."
      issue="#99"
    >
      {!isDemo && <PeriodSelector />}
      <SimuladorRegiao servicoId={Number(id)} />
    </PlaceholderPage>
  );
}
