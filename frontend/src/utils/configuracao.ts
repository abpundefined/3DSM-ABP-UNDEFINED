export type IntervalField =
  | 'intervaloColetaSegundos'
  | 'intervaloDescobertaSegundos';
export type IntervalValues = Record<IntervalField, string>;
export type IntervalErrors = Partial<Record<IntervalField, string>>;

export const INTERVAL_FIELDS = [
  {
    field: 'intervaloColetaSegundos',
    name: 'coleta',
    description: 'Frequência de leitura das métricas dos serviços.',
    min: 10,
    max: 3600,
  },
  {
    field: 'intervaloDescobertaSegundos',
    name: 'descoberta',
    description: 'Frequência de busca por serviços novos ou removidos.',
    min: 10,
    max: 86400,
  },
] as const satisfies readonly {
  field: IntervalField;
  name: string;
  description: string;
  min: number;
  max: number;
}[];

export function validateIntervals(values: IntervalValues): IntervalErrors {
  const errors: IntervalErrors = {};

  for (const { field, name, min, max } of INTERVAL_FIELDS) {
    const text = values[field].trim();
    const value = Number(text);

    if (!text) {
      errors[field] = `Informe o intervalo de ${name}.`;
    } else if (!Number.isInteger(value)) {
      errors[field] =
        `O intervalo de ${name} deve ser um número inteiro de segundos.`;
    } else if (value < min || value > max) {
      errors[field] =
        `O intervalo de ${name} deve ficar entre ${min} e ${max} segundos.`;
    }
  }

  return errors;
}

export function toIntervalPayload(values: IntervalValues) {
  return {
    intervaloColetaSegundos: Number(values.intervaloColetaSegundos),
    intervaloDescobertaSegundos: Number(values.intervaloDescobertaSegundos),
  };
}
