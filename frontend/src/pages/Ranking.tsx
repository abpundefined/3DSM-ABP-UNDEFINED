import ChartExample from '../components/charts/ChartExample';
import PlaceholderPage from '../components/common/PlaceholderPage';

export default function Ranking() {
  return (
    <PlaceholderPage
      eyebrow="ANÁLISE"
      title="Ranking"
      description="Os serviços que mais consomem energia e mais emitem CO₂e no período."
      issue="#91"
    >
      <ChartExample />
    </PlaceholderPage>
  );
}
