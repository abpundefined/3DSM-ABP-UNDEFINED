export type VariacaoPercentual = {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
};

export type VariacaoPorServico = {
  servicoId: number;
  nome: string;
  emissaoAtualGCo2e: number;
  emissaoAnteriorGCo2e: number | null;
  diferencaGCo2e: number | null;
  variacaoPercentual: number | null;
};
