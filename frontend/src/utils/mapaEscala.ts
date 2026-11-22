export const FAIXAS_EMISSAO = 5;
export const RAIO_MINIMO = 6;
export const RAIO_MAXIMO = 26;

const PASSOS_REDONDOS = [1, 2, 2.5, 5, 10];
const GRAMAS_POR_KG = 1000;

export type EscalaEmissao = {
  maximo: number;
  faixas: number;
  raio: (valor: number | null) => number;
  faixa: (valor: number | null) => number | null;
};

export type FaixaDaLegenda = {
  faixa: number;
  de: number;
  ate: number;
  rotulo: string;
};

export type OpcoesEscala = {
  raioMinimo?: number;
  raioMaximo?: number;
  faixas?: number;
};

function valorValido(valor: number | null) {
  if (valor === null || !Number.isFinite(valor)) {
    return null;
  }

  return Math.max(0, valor);
}

export function arredondarParaCima(valor: number) {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0;
  }

  const potencia = 10 ** Math.floor(Math.log10(valor));
  const passo = PASSOS_REDONDOS.find(
    (candidato) => candidato * potencia >= valor * (1 - 1e-12),
  );

  return Number(((passo ?? 10) * potencia).toPrecision(12));
}

export function maiorEmissao(valores: Iterable<number | null>) {
  let maior = 0;

  for (const valor of valores) {
    const valido = valorValido(valor);
    if (valido !== null && valido > maior) {
      maior = valido;
    }
  }

  return maior;
}

export function criarEscalaEmissao(
  maiorValor: number,
  {
    raioMinimo = RAIO_MINIMO,
    raioMaximo = RAIO_MAXIMO,
    faixas = FAIXAS_EMISSAO,
  }: OpcoesEscala = {},
): EscalaEmissao {
  const maximo = arredondarParaCima(maiorValor);

  function proporcao(valor: number) {
    return maximo === 0 ? 0 : Math.min(valor, maximo) / maximo;
  }

  return {
    maximo,
    faixas,
    raio(valor) {
      const valido = valorValido(valor);
      if (valido === null) {
        return raioMinimo;
      }

      return (
        raioMinimo + (raioMaximo - raioMinimo) * Math.sqrt(proporcao(valido))
      );
    },
    faixa(valor) {
      const valido = valorValido(valor);
      if (valido === null) {
        return null;
      }

      return Math.min(faixas, Math.floor(proporcao(valido) * faixas) + 1);
    },
  };
}

const formatoNumero = new Intl.NumberFormat('pt-BR', {
  maximumSignificantDigits: 3,
});

function unidadeEmissao(referenciaGramas: number) {
  return referenciaGramas >= GRAMAS_POR_KG
    ? { divisor: GRAMAS_POR_KG, sigla: 'kgCO₂e' }
    : { divisor: 1, sigla: 'gCO₂e' };
}

export function formatarEmissao(gramas: number, referencia = gramas) {
  const { divisor, sigla } = unidadeEmissao(referencia);
  return `${formatoNumero.format(gramas / divisor)} ${sigla}`;
}

export function criarLegendaEmissao(escala: EscalaEmissao): FaixaDaLegenda[] {
  if (escala.maximo === 0) {
    return [];
  }

  const { divisor, sigla } = unidadeEmissao(escala.maximo);
  const largura = escala.maximo / escala.faixas;

  return Array.from({ length: escala.faixas }, (_, indice) => {
    const de = Number((indice * largura).toPrecision(12));
    const ate = Number(((indice + 1) * largura).toPrecision(12));

    return {
      faixa: indice + 1,
      de,
      ate,
      rotulo: `${formatoNumero.format(de / divisor)} a ${formatoNumero.format(ate / divisor)} ${sigla}`,
    };
  });
}
