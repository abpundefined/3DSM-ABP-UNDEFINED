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
