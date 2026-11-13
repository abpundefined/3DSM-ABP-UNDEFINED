import { useState, type ChangeEvent, type FormEvent } from 'react';
import usePeriod from '../../hooks/usePeriod';
import {
  PRESET_LABELS,
  defaultCustomRange,
  describePeriod,
  validateCustomRange,
  type PeriodPreset,
} from '../../utils/period';

const CUSTOM = 'personalizado';
const presets = Object.keys(PRESET_LABELS) as PeriodPreset[];

export default function PeriodSelector() {
  const { period, setPeriod, linkSearch } = usePeriod();
  const [isCustomOpen, setIsCustomOpen] = useState(period.kind === 'custom');
  const [inicio, setInicio] = useState(
    period.kind === 'custom' ? period.inicio : '',
  );
  const [fim, setFim] = useState(period.kind === 'custom' ? period.fim : '');
  const [error, setError] = useState<string | null>(null);
  const [syncedSearch, setSyncedSearch] = useState(linkSearch);

  if (syncedSearch !== linkSearch) {
    setSyncedSearch(linkSearch);
    setIsCustomOpen(period.kind === 'custom');
    setInicio(period.kind === 'custom' ? period.inicio : '');
    setFim(period.kind === 'custom' ? period.fim : '');
    setError(null);
  }

  const selectValue =
    isCustomOpen || period.kind === 'custom' ? CUSTOM : period.preset;

  function handleSelect(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    setError(null);

    if (value === CUSTOM) {
      setIsCustomOpen(true);
      if (!inicio && !fim) {
        const range = defaultCustomRange(new Date());
        setInicio(range.inicio);
        setFim(range.fim);
      }
      return;
    }

    setIsCustomOpen(false);
    setPeriod({ kind: 'preset', preset: value as PeriodPreset });
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateCustomRange(inicio, fim);
    setError(message);

    if (!message) {
      setPeriod({ kind: 'custom', inicio, fim });
    }
  }

  return (
    <section className="period-selector" aria-label="Seletor de período">
      <div className="period-field">
        <label htmlFor="period-select">Período</label>
        <select id="period-select" value={selectValue} onChange={handleSelect}>
          {presets.map((preset) => (
            <option key={preset} value={preset}>
              {PRESET_LABELS[preset]}
            </option>
          ))}
          <option value={CUSTOM}>Personalizado</option>
        </select>
      </div>

      {isCustomOpen && (
        <form className="period-custom" onSubmit={handleApply} noValidate>
          <div className="period-field">
            <label htmlFor="period-start">Início</label>
            <input
              id="period-start"
              type="date"
              value={inicio}
              onChange={(event) => setInicio(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'period-error' : undefined}
            />
          </div>
          <div className="period-field">
            <label htmlFor="period-end">Fim</label>
            <input
              id="period-end"
              type="date"
              value={fim}
              onChange={(event) => setFim(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'period-error' : undefined}
            />
          </div>
          <button className="button button--primary" type="submit">
            Aplicar
          </button>
        </form>
      )}

      <p className="period-summary" aria-live="polite">
        Período analisado: <strong>{describePeriod(period, new Date())}</strong>
      </p>

      {error && (
        <p id="period-error" className="period-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
