const regionNames: Record<string, string> = {
  'br-sudeste': 'Brasil (Sudeste)',
  'us-east': 'Estados Unidos (Virgínia)',
  'us-east-1': 'Estados Unidos (Virgínia)',
  'eu-west': 'Irlanda (Leinster)',
  'eu-west-1': 'Irlanda (Leinster)',
  'ca-central': 'Canadá (Ontário)',
  'jp-east': 'Japão (Tóquio)',
};

const unknownRegionCodes = new Set([
  'desconhecida',
  'desconhecido',
  'unknown',
  'unknown-region',
]);

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

export function formatRegionName(regionCode: string | null | undefined) {
  const normalizedCode = regionCode?.trim().toLowerCase();

  if (!normalizedCode || unknownRegionCodes.has(normalizedCode)) {
    return 'Localização não informada';
  }

  const knownName = regionNames[normalizedCode];
  if (knownName) {
    return knownName;
  }

  return normalizedCode
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) =>
      part.length <= 2
        ? part.toLocaleUpperCase('pt-BR')
        : `${part[0].toLocaleUpperCase('pt-BR')}${part.slice(1)}`,
    )
    .join(' ');
}

export type ServiceLocation = {
  pais?: string | null;
  regiao?: string | null;
  cidade?: string | null;
};

const unknownLocationNames = new Set(['desconhecida', 'desconhecido']);

function knownLocationPart(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  if (
    !trimmedValue ||
    unknownLocationNames.has(trimmedValue.toLocaleLowerCase('pt-BR'))
  ) {
    return null;
  }

  return trimmedValue;
}

export function formatServiceLocation(
  location: ServiceLocation | null | undefined,
  regionCode: string | null | undefined,
) {
  if (!location) {
    return { area: formatRegionName(regionCode), city: null };
  }

  const area = [location.pais, location.regiao]
    .map(knownLocationPart)
    .filter((part): part is string => part !== null)
    .join(' · ');

  return {
    area: area || formatRegionName(regionCode),
    city: knownLocationPart(location.cidade),
  };
}
