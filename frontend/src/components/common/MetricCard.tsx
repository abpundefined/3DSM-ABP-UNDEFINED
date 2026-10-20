import Icon, { type IconName } from './Icon';

type MetricCardProps = {
  label: string;
  value?: number;
  unit?: string;
  description: string;
  icon: IconName;
  tone: 'forest' | 'leaf' | 'olive';
};

export default function MetricCard({
  label,
  value,
  unit,
  description,
  icon,
  tone,
}: MetricCardProps) {
  const formattedValue =
    value === undefined
      ? '—'
      : new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: unit ? 2 : 0,
          maximumFractionDigits: unit ? 2 : 0,
        }).format(value);
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon name={icon} />
        </span>
      </div>
      <p className="metric-value">
        <span
          aria-label={value === undefined ? 'Dado indisponível' : undefined}
        >
          {formattedValue}
        </span>
        {unit && <span className="metric-unit">{unit}</span>}
      </p>
      <p className="metric-description">{description}</p>
    </div>
  );
}
