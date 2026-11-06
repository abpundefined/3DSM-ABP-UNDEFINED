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
