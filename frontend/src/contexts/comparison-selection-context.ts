import { createContext } from 'react';

export type ComparisonSelectionContextValue = {
  serviceIds: number[];
  invalidSelection: boolean;
  selectionWarning: string | null;
  toggleService: (serviceId: number) => void;
  setServiceIds: (serviceIds: number[]) => void;
  clearSelection: () => void;
};

export const ComparisonSelectionContext =
  createContext<ComparisonSelectionContextValue | null>(null);
