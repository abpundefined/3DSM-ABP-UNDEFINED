export interface IntensidadeDaRegiao {
  codigo: string;
  intensidadeGCo2ePorKwh: number | null;
}

export interface RegiaoSimulada extends IntensidadeDaRegiao {
  emissaoEstimadaGCo2e: number | null;
  diferencaGCo2e: number | null;
  diferencaPercentual: number | null;
  atual: boolean;
  menorEmissao: boolean;
}

export interface ResultadoSimulacao {
  emissaoAtualGCo2e: number | null;
  melhorRegiaoCodigo: string | null;
  regioes: RegiaoSimulada[];
}

function valorValido(valor: number | null): valor is number {
  return valor !== null && Number.isFinite(valor) && valor >= 0;
}

export function estimarEmissao(
  energiaKwh: number | null,
  intensidadeGCo2ePorKwh: number | null,
): number | null {
  if (!valorValido(energiaKwh) || !valorValido(intensidadeGCo2ePorKwh)) {
    return null;
  }

  return energiaKwh * intensidadeGCo2ePorKwh;
}

function compararRegioes(a: IntensidadeDaRegiao, b: IntensidadeDaRegiao) {
  const intensidadeA = valorValido(a.intensidadeGCo2ePorKwh)
    ? a.intensidadeGCo2ePorKwh
    : Number.POSITIVE_INFINITY;
  const intensidadeB = valorValido(b.intensidadeGCo2ePorKwh)
    ? b.intensidadeGCo2ePorKwh
    : Number.POSITIVE_INFINITY;

  return intensidadeA - intensidadeB || a.codigo.localeCompare(b.codigo);
}

function escolherMelhor(
  energiaKwh: number | null,
  regiaoAtual: string,
  ordenadas: IntensidadeDaRegiao[],
): string | null {
  if (!valorValido(energiaKwh) || energiaKwh === 0) {
    return null;
  }

  const candidatas = ordenadas.filter((regiao) =>
    valorValido(regiao.intensidadeGCo2ePorKwh),
  );
  if (candidatas.length === 0) {
    return null;
  }

  const menor = candidatas[0].intensidadeGCo2ePorKwh;
  const atualEmpatada = candidatas.find(
    (regiao) =>
      regiao.codigo === regiaoAtual && regiao.intensidadeGCo2ePorKwh === menor,
  );

  return (atualEmpatada ?? candidatas[0]).codigo;
}

export function simularRegioes(
  energiaKwh: number | null,
  regiaoAtual: string,
  regioes: IntensidadeDaRegiao[],
): ResultadoSimulacao {
  const ordenadas = [...regioes].sort(compararRegioes);
  const intensidadeAtual =
    regioes.find((regiao) => regiao.codigo === regiaoAtual)
      ?.intensidadeGCo2ePorKwh ?? null;
  const emissaoAtualGCo2e = estimarEmissao(energiaKwh, intensidadeAtual);
  const melhorRegiaoCodigo = escolherMelhor(energiaKwh, regiaoAtual, ordenadas);

  return {
    emissaoAtualGCo2e,
    melhorRegiaoCodigo,
    regioes: ordenadas.map((regiao) => {
      const emissaoEstimadaGCo2e = estimarEmissao(
        energiaKwh,
        regiao.intensidadeGCo2ePorKwh,
      );
      const diferencaGCo2e =
        emissaoEstimadaGCo2e === null || emissaoAtualGCo2e === null
          ? null
          : emissaoEstimadaGCo2e - emissaoAtualGCo2e;
      const diferencaPercentual =
        diferencaGCo2e === null || !emissaoAtualGCo2e
          ? null
          : (diferencaGCo2e / emissaoAtualGCo2e) * 100;

      return {
        codigo: regiao.codigo,
        intensidadeGCo2ePorKwh: regiao.intensidadeGCo2ePorKwh,
        emissaoEstimadaGCo2e,
        diferencaGCo2e,
        diferencaPercentual,
        atual: regiao.codigo === regiaoAtual,
        menorEmissao: regiao.codigo === melhorRegiaoCodigo,
      };
    }),
  };
}
