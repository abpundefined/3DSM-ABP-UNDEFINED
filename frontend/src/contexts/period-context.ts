import { createContext } from 'react';
import type { Period } from '../utils/period';

export interface PeriodContextValue {
  period: Period;
  setPeriod: (period: Period) => void;
  linkSearch: string;
  apiQuery: string;
}

export const PeriodContext = createContext<PeriodContextValue | null>(null);
