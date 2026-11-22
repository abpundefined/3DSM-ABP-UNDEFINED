export type IntervalField =
  'intervaloColetaSegundos' | 'intervaloDescobertaSegundos';
export type ConfigFormField = IntervalField | 'metaMensalKgCo2e';
export type IntervalValues = Record<IntervalField, string> & {
  metaMensalKgCo2e?: string;
};
export type IntervalErrors = Partial<Record<ConfigFormField, string>>;

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

function parseMetaNumber(text: string): number {
  return Number(text.trim().replace(',', '.'));
}

export function validateMetaMensal(rawValue: string): string | undefined {
  const text = rawValue.trim();
  if (!text) {
    return undefined;
  }

  const value = parseMetaNumber(text);
  if (!Number.isFinite(value)) {
    return 'A meta mensal deve ser um número válido em kgCO₂e.';
  }
  if (value <= 0) {
    return 'A meta mensal deve ser maior que zero, ou deixe em branco para remover.';
  }

  return undefined;
}

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

  if (values.metaMensalKgCo2e !== undefined) {
    const metaError = validateMetaMensal(values.metaMensalKgCo2e);
    if (metaError) {
      errors.metaMensalKgCo2e = metaError;
    }
  }

  return errors;
}

export function toIntervalPayload(
  values: IntervalValues,
  metaInicial: number | null = null,
) {
  const payload: {
    intervaloColetaSegundos: number;
    intervaloDescobertaSegundos: number;
    metaMensalKgCo2e?: number | null;
  } = {
    intervaloColetaSegundos: Number(values.intervaloColetaSegundos),
    intervaloDescobertaSegundos: Number(values.intervaloDescobertaSegundos),
  };

  if (values.metaMensalKgCo2e !== undefined) {
    const text = values.metaMensalKgCo2e.trim();
    if (text) {
      payload.metaMensalKgCo2e = parseMetaNumber(text);
    } else if (metaInicial !== null) {
      payload.metaMensalKgCo2e = null;
    }
  }

  return payload;
}
