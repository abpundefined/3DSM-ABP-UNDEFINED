import type { EstadoColeta } from "../../generated/prisma/enums";

export interface ContagemColetas {
  estado: EstadoColeta;
  quantidade: number;
}

export interface ResumoColetas {
  total: number;
  falhas: number;
  taxaFalha: number | null;
}

const CASAS_DECIMAIS = 10_000;

export const resumirColetas = (contagens: ContagemColetas[]): ResumoColetas => {
  const total = contagens.reduce((soma, item) => soma + item.quantidade, 0);
  const falhas = contagens
    .filter((item) => item.estado === "FALHA")
    .reduce((soma, item) => soma + item.quantidade, 0);

  return {
    total,
    falhas,
    taxaFalha:
      total === 0
        ? null
        : Math.round((falhas / total) * CASAS_DECIMAIS) / CASAS_DECIMAIS,
  };
};
