export const DURACAO_CONTADOR_MS = 550;
export const DURACAO_TRANSICAO_ORDEM_MS = 260;

export type NumeroFormatadoExtraido = {
  valor: number;
  casasDecimais: number;
};

export type PosicaoElemento = {
  left: number;
  top: number;
};

export function easeOutCubic(progresso: number): number {
  if (!Number.isFinite(progresso)) {
    return 1;
  }
  const t = Math.min(1, Math.max(0, progresso));
  return 1 - (1 - t) ** 3;
}

export function interpolarValor(
  inicio: number,
  fim: number,
  progresso: number,
): number {
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) {
    return fim;
  }
  if (progresso <= 0) {
    return inicio;
  }
  if (progresso >= 1) {
    return fim;
  }
  return inicio + (fim - inicio) * easeOutCubic(progresso);
}

export function extrairNumeroFormatado(
  texto: string,
): NumeroFormatadoExtraido | null {
  const limpo = texto.trim();
  const match = /^(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d+))?$/.exec(limpo);
  if (!match) {
    return null;
  }

  const inteiro = match[1].replace(/\./g, '');
  const fracao = match[2] ?? '';
  const valor = Number(fracao ? `${inteiro}.${fracao}` : inteiro);
  if (!Number.isFinite(valor)) {
    return null;
  }

  return {
    valor,
    casasDecimais: fracao.length,
  };
}

export function formatarNumeroAnimado(
  valor: number,
  casasDecimais: number,
): string {
  const casas = Math.max(0, Math.min(6, Math.floor(casasDecimais)));
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function calcularDeslocamentoFlip(
  anterior: PosicaoElemento,
  atual: PosicaoElemento,
): { dx: number; dy: number } | null {
  const dx = anterior.left - atual.left;
  const dy = anterior.top - atual.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    return null;
  }
  return { dx, dy };
}
