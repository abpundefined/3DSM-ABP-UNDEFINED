import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { ComparisonSelectionContext } from '../contexts/comparison-selection-context';
import {
  MAX_SERVICES_TO_COMPARE,
  parseComparisonSelection,
} from '../utils/comparacao';

export default function ComparisonSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedSelection = useMemo(
    () => parseComparisonSelection(searchParams.get('servicos')),
    [searchParams],
  );
  const [limitExceeded, setLimitExceeded] = useState(false);

  const writeSelection = useCallback(
    (serviceIds: number[]) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (serviceIds.length === 0) {
            next.delete('servicos');
          } else {
            next.set('servicos', serviceIds.join(','));
          }
          return next;
        },
        { replace: true },
      );
      setLimitExceeded(false);
    },
    [setSearchParams],
  );

  const setServiceIds = useCallback(
    (serviceIds: number[]) => {
      const uniqueIds = [...new Set(serviceIds)].filter(
        (id) => Number.isSafeInteger(id) && id > 0,
      );
      if (uniqueIds.length > MAX_SERVICES_TO_COMPARE) {
        setLimitExceeded(true);
        return;
      }

      writeSelection(uniqueIds);
    },
    [writeSelection],
  );

  const toggleService = useCallback(
    (serviceId: number) => {
      const currentIds = parsedSelection.serviceIds;
      if (currentIds.includes(serviceId)) {
        setServiceIds(currentIds.filter((id) => id !== serviceId));
        return;
      }

      setServiceIds([...currentIds, serviceId]);
    },
    [parsedSelection.serviceIds, setServiceIds],
  );

  const clearSelection = useCallback(() => {
    writeSelection([]);
  }, [writeSelection]);

  const selectionWarning = parsedSelection.invalid
    ? 'A seleção na URL contém IDs inválidos. Limpe a seleção e escolha os serviços novamente.'
    : parsedSelection.serviceIds.length > MAX_SERVICES_TO_COMPARE ||
        limitExceeded
      ? 'É possível comparar no máximo cinco serviços.'
      : null;

  return (
    <ComparisonSelectionContext.Provider
      value={{
        serviceIds: parsedSelection.serviceIds,
        invalidSelection: parsedSelection.invalid,
        selectionWarning,
        toggleService,
        setServiceIds,
        clearSelection,
      }}
    >
      {children}
    </ComparisonSelectionContext.Provider>
  );
}
