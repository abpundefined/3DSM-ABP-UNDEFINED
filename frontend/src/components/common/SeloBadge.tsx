import { getSeloColor, getSeloTooltip, normalizarSelo } from '../../utils/selo';
import './selo-badge.css';

export default function SeloBadge({
  selo,
  className = '',
}: {
  selo?: unknown;
  className?: string;
}) {
  const seloNormalizado = normalizarSelo(selo);
  const tooltip = getSeloTooltip(seloNormalizado);

  return (
    <span
      className={`selo-badge${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`Selo de eficiência ${seloNormalizado}: ${tooltip}`}
      title={tooltip}
      style={{ backgroundColor: getSeloColor(seloNormalizado) }}
    >
      {seloNormalizado}
    </span>
  );
}
