import type { RespostaMapa } from '../types/mapa';

export type ServicoNaParticipacao = {
  servicoId: number;
  nome: string;
  emissaoGCo2e: number;
  percentual: number;
};

export type RegiaoNaParticipacao = {
  codigo: string;
  nome: string;
  emissaoGCo2e: number;
  percentual: number;
  servicos: ServicoNaParticipacao[];
};

export type Participacao = {
  totalGCo2e: number;
  regioes: RegiaoNaParticipacao[];
};

type Comparavel = { nome: string; emissaoGCo2e: number };

const LIMIAR_DE_PARETO = 0.8;
const porcentagem = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const porEmissao = (a: Comparavel, b: Comparavel) =>
  b.emissaoGCo2e - a.emissaoGCo2e || a.nome.localeCompare(b.nome, 'pt-BR');

export function montarParticipacao({
  servicos,
  semCoordenadas,
}: Pick<RespostaMapa, 'servicos' | 'semCoordenadas'>): Participacao {
  const nomes = new Map(
    servicos.map(({ regiaoCodigo, local }) => [regiaoCodigo, local]),
  );
  const grupos = new Map<string, Omit<ServicoNaParticipacao, 'percentual'>[]>();

  for (const { servicoId, nome, regiaoCodigo, totais } of [
    ...servicos,
    ...semCoordenadas,
  ]) {
    const emissaoGCo2e = totais.emissaoGCo2e;
    if (emissaoGCo2e === null || emissaoGCo2e <= 0) {
      continue;
    }
    const grupo = grupos.get(regiaoCodigo) ?? [];
    grupo.push({ servicoId, nome, emissaoGCo2e });
    grupos.set(regiaoCodigo, grupo);
  }

  const totalGCo2e = [...grupos.values()]
    .flat()
    .reduce((soma, { emissaoGCo2e }) => soma + emissaoGCo2e, 0);
  const percentual = (valor: number) => (valor / totalGCo2e) * 100;

  const regioes = [...grupos].map(([codigo, grupo]) => {
    const emissaoGCo2e = grupo.reduce(
      (soma, servico) => soma + servico.emissaoGCo2e,
      0,
    );
    return {
      codigo,
      nome: nomes.get(codigo) ?? codigo,
      emissaoGCo2e,
      percentual: percentual(emissaoGCo2e),
      servicos: grupo
        .map((servico) => ({
          ...servico,
          percentual: percentual(servico.emissaoGCo2e),
        }))
        .sort(porEmissao),
    };
  });

  return { totalGCo2e, regioes: regioes.sort(porEmissao) };
}

export function formatarPercentual(valor: number) {
  return `${porcentagem.format(valor)}%`;
}

export function fraseDePareto({
  totalGCo2e,
  regioes,
}: Participacao): string | null {
  const servicos = regioes
    .flatMap((regiao) => regiao.servicos)
    .sort(porEmissao);
  const maior = servicos.at(0);
  if (!maior) {
    return null;
  }

  let acumulado = 0;
  let quantidade = 0;
  for (const { emissaoGCo2e } of servicos) {
    acumulado += emissaoGCo2e;
    quantidade += 1;
    if (acumulado >= totalGCo2e * LIMIAR_DE_PARETO) {
      break;
    }
  }

  const parte = formatarPercentual((acumulado / totalGCo2e) * 100);
  return quantidade === 1
    ? `${maior.nome} sozinho responde por ${parte} das emissões do período.`
    : `${quantidade} de ${servicos.length} serviços respondem por ${parte} das emissões do período.`;
}

export function fraseDaRegiao({ regioes }: Participacao): string | null {
  const maior = regioes.at(0);
  if (!maior) {
    return null;
  }

  return regioes.length === 1
    ? `Todas as emissões vêm de ${maior.nome}.`
    : `${maior.nome} é a região que mais emite: ${formatarPercentual(maior.percentual)} do total.`;
}
