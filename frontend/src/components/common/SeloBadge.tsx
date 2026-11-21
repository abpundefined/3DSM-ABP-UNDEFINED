import { getSeloColor, getSeloTooltip } from '../../utils/selo';
import './selo-badge.css';

export default function SeloBadge({
  selo,
  className = '',
}: {
  selo: string;
  className?: string;
}) {
  const tooltip = getSeloTooltip(selo);

  return (
    <span
      className={`selo-badge${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`Selo de eficiência ${selo}: ${tooltip}`}
      title={tooltip}
      style={{ backgroundColor: getSeloColor(selo) }}
    >
      {selo}
    </span>
  );
}
