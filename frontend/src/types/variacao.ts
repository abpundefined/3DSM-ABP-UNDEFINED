export type VariacaoPercentual = {
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
};

export type VariacaoPorServico = {
  servicoId: number;
  nome: string;
  selo: string;
  emissaoAtualGCo2e: number | null;
  emissaoAnteriorGCo2e: number | null;
  diferencaGCo2e: number | null;
  variacaoPercentual: number | null;
};
