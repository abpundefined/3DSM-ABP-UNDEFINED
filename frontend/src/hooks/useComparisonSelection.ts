import { useContext } from 'react';
import { ComparisonSelectionContext } from '../contexts/comparison-selection-context';

export default function useComparisonSelection() {
  const context = useContext(ComparisonSelectionContext);
  if (context === null) {
    throw new Error(
      'useComparisonSelection deve ser usado dentro de ComparisonSelectionProvider.',
    );
  }

  return context;
}
