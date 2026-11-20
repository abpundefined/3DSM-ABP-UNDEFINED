import useAnimatedNumber from '../../hooks/useAnimatedNumber';
import {
  DURACAO_CONTADOR_MS,
  extrairNumeroFormatado,
  formatarNumeroAnimado,
} from '../../utils/animacao';

type AnimatedMetricValueProps = {
  value: string;
  withUnit?: boolean;
  unit?: string;
  ariaLabel?: string;
  durationMs?: number;
};

export default function AnimatedMetricValue({
  value,
  withUnit = false,
  unit: explicitUnit,
  ariaLabel,
  durationMs = DURACAO_CONTADOR_MS,
}: AnimatedMetricValueProps) {
  const separator = withUnit && !explicitUnit ? value.lastIndexOf(' ') : -1;
  const numberPart = separator < 0 ? value : value.slice(0, separator);
  const resolvedUnit =
    explicitUnit ?? (separator < 0 ? undefined : value.slice(separator + 1));
  const unitSeparator = explicitUnit ? '' : ' ';

  const extraido = extrairNumeroFormatado(numberPart);
  const { valor: valorAnimado, animando } = useAnimatedNumber(
    extraido?.valor ?? null,
    durationMs,
  );

  if (!extraido || !animando || valorAnimado === null) {
    return (
      <>
        <span aria-label={ariaLabel}>{numberPart}</span>
        {resolvedUnit && (
          <span className="metric-unit">
            {unitSeparator}
            {resolvedUnit}
          </span>
        )}
      </>
    );
  }

  const textoFinalAcessivel =
    ariaLabel ??
    (resolvedUnit ? `${numberPart} ${resolvedUnit}`.trim() : numberPart);
  const numeroExibido = formatarNumeroAnimado(
    valorAnimado,
    extraido.casasDecimais,
  );

  return (
    <>
      <span className="sr-only">{textoFinalAcessivel}</span>
      <span aria-hidden="true">{numeroExibido}</span>
      {resolvedUnit && (
        <span className="metric-unit" aria-hidden="true">
          {unitSeparator}
          {resolvedUnit}
        </span>
      )}
    </>
  );
}
