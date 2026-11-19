import { Link } from 'react-router';
import useComparisonSelection from '../../hooks/useComparisonSelection';
import usePeriod from '../../hooks/usePeriod';
import {
  buildComparisonLinkSearch,
  MAX_SERVICES_TO_COMPARE,
} from '../../utils/comparacao';

export default function ComparisonSelectionBar() {
  const { linkSearch } = usePeriod();
  const { serviceIds, selectionWarning, clearSelection } =
    useComparisonSelection();

  if (serviceIds.length === 0 && !selectionWarning) {
    return null;
  }

  const canCompare =
    serviceIds.length >= 2 &&
    serviceIds.length <= MAX_SERVICES_TO_COMPARE &&
    !selectionWarning;

  return (
    <section
      className="comparison-selection-bar"
      aria-label="Seleção de serviços para comparação"
    >
      <p className="comparison-selection-count" role="status">
        {serviceIds.length} selecionado{serviceIds.length === 1 ? '' : 's'}
        {canCompare && <span aria-hidden="true"> · </span>}
        {canCompare && (
          <Link
            to={`/comparar${buildComparisonLinkSearch(serviceIds, linkSearch)}`}
          >
            Ver comparação
          </Link>
        )}
      </p>
      <div className="comparison-selection-actions">
        {!canCompare && (
          <button type="button" disabled>
            Ver comparação
          </button>
        )}
        <button type="button" onClick={clearSelection}>
          Limpar seleção
        </button>
      </div>
      {serviceIds.length === 1 && !selectionWarning && (
        <p className="comparison-selection-message">
          Selecione ao menos mais um serviço.
        </p>
      )}
      {selectionWarning && (
        <p className="comparison-selection-warning" role="alert">
          {selectionWarning}
        </p>
      )}
    </section>
  );
}
