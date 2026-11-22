import { useContext } from 'react';
import { PeriodContext } from '../contexts/period-context';

export default function usePeriod() {
  const context = useContext(PeriodContext);

  if (context === null) {
    throw new Error('usePeriod deve ser usado dentro de PeriodProvider.');
  }

  return context;
}
