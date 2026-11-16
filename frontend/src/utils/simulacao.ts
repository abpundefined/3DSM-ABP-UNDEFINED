import type { RegiaoSimulada, RespostaSimulacao } from '../types/simulacao';
import { formatEmission, formatRegionName } from './formatters.ts';

const percentual = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const intensidade = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null;

const numeroOuNulo = (valor: unknown) =>
  valor === null || typeof valor === 'number';

function ehRegiaoSimulada(valor: unknown): valor is RegiaoSimulada {
  return (
    ehObjeto(valor) &&
    typeof valor.codigo === 'string' &&
    numeroOuNulo(valor.intensidadeGCo2ePorKwh) &&
    numeroOuNulo(valor.emissaoEstimadaGCo2e) &&
    numeroOuNulo(valor.diferencaGCo2e) &&
    numeroOuNulo(valor.diferencaPercentual) &&
    typeof valor.atual === 'boolean' &&
    typeof valor.menorEmissao === 'boolean'
  );
}

export function ehRespostaSimulacao(
  valor: unknown,
): valor is RespostaSimulacao {
  return (
    ehObjeto(valor) &&
    ehObjeto(valor.servico) &&
    typeof valor.servico.regiaoCodigo === 'string' &&
    numeroOuNulo(valor.energiaKwh) &&
    numeroOuNulo(valor.emissaoAtualGCo2e) &&
    Array.isArray(valor.regioes) &&
    valor.regioes.every(ehRegiaoSimulada)
  );
}

export function regiaoSugerida(dados: RespostaSimulacao): string | null {
  const melhor = dados.regioes.find(
    (regiao) => regiao.codigo === dados.melhorRegiaoCodigo && !regiao.atual,
  );
  const alternativa = dados.regioes.find(
    (regiao) => !regiao.atual && regiao.emissaoEstimadaGCo2e !== null,
  );

  return (melhor ?? alternativa)?.codigo ?? null;
}

export function formatarIntensidade(valor: number | null) {
  return valor === null
    ? 'sem dados no período'
    : `${intensidade.format(valor)} gCO₂e/kWh`;
}

export function descreverDiferenca(
  regiao: RegiaoSimulada,
  codigoAtual: string,
) {
  if (regiao.atual) {
    return 'É a região atual do serviço.';
  }
  if (regiao.diferencaGCo2e === null) {
    return 'Sem dados suficientes para comparar com a região atual.';
  }

  const referencia = `que em ${formatRegionName(codigoAtual)}`;
  if (regiao.diferencaGCo2e === 0) {
    return `Mesma emissão estimada ${referencia}`;
  }

  const sentido = regiao.diferencaGCo2e < 0 ? 'a menos' : 'a mais';
  const emPercentual =
    regiao.diferencaPercentual === null
      ? ''
      : ` (${percentual.format(regiao.diferencaPercentual).replace('-', '−')}%)`;

  return `${formatEmission(Math.abs(regiao.diferencaGCo2e))} ${sentido}${emPercentual} ${referencia}`;
}
