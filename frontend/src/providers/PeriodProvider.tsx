import { useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { PeriodContext } from '../contexts/period-context';
import {
  readPeriod,
  toApiQuery,
  toLinkSearch,
  writePeriod,
  type Period,
} from '../utils/period';

export default function PeriodProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = useMemo(() => readPeriod(searchParams), [searchParams]);

  const setPeriod = useCallback(
    (next: Period) => {
      setSearchParams((current) => writePeriod(current, next));
    },
    [setSearchParams],
  );

  const value = useMemo(
    () => ({
      period,
      setPeriod,
      linkSearch: toLinkSearch(period),
      apiQuery: toApiQuery(period),
    }),
    [period, setPeriod],
  );

  return (
    <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
  );
}
