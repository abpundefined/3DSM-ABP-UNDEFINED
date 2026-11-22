export type TipoOportunidade =
  "MIGRAR_REGIAO" | "SUPERDIMENSIONAMENTO" | "MUDAR_HORARIO";

export const LIMIARES_OPORTUNIDADES = {
  reducaoMinimaMigrarRegiaoPercentual: 20,
  cpuMaximaSuperdimensionamentoPercentual: 15,
  reducaoEstimadaSuperdimensionamentoPercentual: 30,
  reducaoMinimaMudarHorarioPercentual: 20,
  duracaoJanelaHorarioHoras: 3,
} as const;

export const AVISO_ESTIMATIVA_OPORTUNIDADES =
  "As oportunidades listadas são sugestões estimadas a partir do histórico do período selecionado e não representam garantia de economia.";

export interface ServicoParaOportunidade {
  servicoId: number;
  nome: string;
  estadoAtual: string;
  regiaoCodigo: string;
  energiaKwh: number | null;
  emissaoGCo2e: number | null;
  cpuMediaPercent: number | null;
}

export interface RegiaoParaOportunidade {
  codigo: string;
  rotulo: string;
  intensidadeMediaGCo2ePorKwh: number | null;
}

export interface CelulaHorarioRegiao {
  diaSemana: number;
  hora: number;
  media: number;
  quantidadeAmostras: number;
}

export interface OportunidadeReducao {
  id: string;
  servicoId: number;
  servicoNome: string;
  regiaoCodigo: string;
  tipo: TipoOportunidade;
  titulo: string;
  explicacao: string;
  economiaEstimadaGCo2e: number;
  economiaPercentual: number;
  emissaoAtualGCo2e: number;
  linkDetalhe: string;
}

export interface ResultadoOportunidades {
  resumo: {
    totalOportunidades: number;
    reducaoPotencialGCo2e: number;
    porTipo: Record<TipoOportunidade, number>;
  };
  limiares: typeof LIMIARES_OPORTUNIDADES;
  aviso: string;
  oportunidades: OportunidadeReducao[];
}

const DIAS_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

function numeroPositivo(valor: number | null | undefined): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0;
}

function numeroNaoNegativo(valor: number | null | undefined): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0;
}

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function formatarDecimalPt(valor: number, casas = 1): string {
  return valor.toFixed(casas).replace(".", ",");
}

function formatarHora(hora: number): string {
  return `${String(hora % 24).padStart(2, "0")}h`;
}

export function calcularMedianaEnergia(
  valores: readonly (number | null | undefined)[],
): number | null {
  const validos = valores
    .filter((valor): valor is number => numeroPositivo(valor))
    .sort((a, b) => a - b);

  if (validos.length === 0) {
    return null;
  }

  const meio = Math.floor(validos.length / 2);
  if (validos.length % 2 === 1) {
    return validos[meio];
  }

  return (validos[meio - 1] + validos[meio]) / 2;
}

export function avaliarMigracaoRegiao(
  servico: ServicoParaOportunidade,
  regioes: readonly RegiaoParaOportunidade[],
): OportunidadeReducao | null {
  if (!numeroPositivo(servico.emissaoGCo2e)) {
    return null;
  }

  const atual = regioes.find((item) => item.codigo === servico.regiaoCodigo);
  if (!atual || !numeroPositivo(atual.intensidadeMediaGCo2ePorKwh)) {
    return null;
  }

  const candidatas = regioes
    .filter(
      (
        item,
      ): item is RegiaoParaOportunidade & {
        intensidadeMediaGCo2ePorKwh: number;
      } =>
        item.codigo !== servico.regiaoCodigo &&
        numeroNaoNegativo(item.intensidadeMediaGCo2ePorKwh),
    )
    .sort(
      (a, b) =>
        a.intensidadeMediaGCo2ePorKwh - b.intensidadeMediaGCo2ePorKwh ||
        a.codigo.localeCompare(b.codigo),
    );

  const melhor = candidatas[0];
  if (!melhor) {
    return null;
  }

  const fracaoReducao =
    1 - melhor.intensidadeMediaGCo2ePorKwh / atual.intensidadeMediaGCo2ePorKwh;
  const economiaPercentual = fracaoReducao * 100;

  if (
    economiaPercentual <=
    LIMIARES_OPORTUNIDADES.reducaoMinimaMigrarRegiaoPercentual
  ) {
    return null;
  }

  const economiaEstimadaGCo2e = servico.emissaoGCo2e * fracaoReducao;

  return {
    id: `${servico.servicoId}:MIGRAR_REGIAO`,
    servicoId: servico.servicoId,
    servicoNome: servico.nome,
    regiaoCodigo: servico.regiaoCodigo,
    tipo: "MIGRAR_REGIAO",
    titulo: `Migrar ${servico.nome} para ${melhor.rotulo}`,
    explicacao: `Sugestão estimada: mover de ${atual.rotulo} (${formatarDecimalPt(atual.intensidadeMediaGCo2ePorKwh)} gCO₂e/kWh) para ${melhor.rotulo} (${formatarDecimalPt(melhor.intensidadeMediaGCo2ePorKwh)} gCO₂e/kWh) reduziria cerca de ${formatarDecimalPt(economiaPercentual)}% das emissões do período. Não considera latência, custo ou restrições regulatórias.`,
    economiaEstimadaGCo2e: arredondar(economiaEstimadaGCo2e, 4),
    economiaPercentual: arredondar(economiaPercentual, 1),
    emissaoAtualGCo2e: arredondar(servico.emissaoGCo2e, 4),
    linkDetalhe: `/servicos/${servico.servicoId}`,
  };
}

export function avaliarSuperdimensionamento(
  servico: ServicoParaOportunidade,
  medianaEnergiaKwh: number | null,
): OportunidadeReducao | null {
  if (
    !numeroNaoNegativo(servico.cpuMediaPercent) ||
    !numeroPositivo(servico.energiaKwh) ||
    !numeroPositivo(servico.emissaoGCo2e) ||
    !numeroPositivo(medianaEnergiaKwh)
  ) {
    return null;
  }

  if (
    servico.cpuMediaPercent >=
      LIMIARES_OPORTUNIDADES.cpuMaximaSuperdimensionamentoPercentual ||
    servico.energiaKwh <= medianaEnergiaKwh
  ) {
    return null;
  }

  const economiaPercentual =
    LIMIARES_OPORTUNIDADES.reducaoEstimadaSuperdimensionamentoPercentual;
  const economiaEstimadaGCo2e =
    servico.emissaoGCo2e * (economiaPercentual / 100);

  return {
    id: `${servico.servicoId}:SUPERDIMENSIONAMENTO`,
    servicoId: servico.servicoId,
    servicoNome: servico.nome,
    regiaoCodigo: servico.regiaoCodigo,
    tipo: "SUPERDIMENSIONAMENTO",
    titulo: `Revisar dimensionamento de ${servico.nome}`,
    explicacao: `Sugestão estimada: CPU média de ${formatarDecimalPt(servico.cpuMediaPercent)}% (abaixo de ${LIMIARES_OPORTUNIDADES.cpuMaximaSuperdimensionamentoPercentual}%) com consumo energético acima da mediana dos serviços no período. Ajustar recursos alocados pode reduzir cerca de ${economiaPercentual}% das emissões, sem garantia de ganho real.`,
    economiaEstimadaGCo2e: arredondar(economiaEstimadaGCo2e, 4),
    economiaPercentual,
    emissaoAtualGCo2e: arredondar(servico.emissaoGCo2e, 4),
    linkDetalhe: `/servicos/${servico.servicoId}`,
  };
}

export function avaliarMudancaHorario(
  servico: ServicoParaOportunidade,
  celulasRegiao: readonly CelulaHorarioRegiao[],
  rotuloRegiao = servico.regiaoCodigo,
): OportunidadeReducao | null {
  if (!numeroPositivo(servico.emissaoGCo2e) || celulasRegiao.length === 0) {
    return null;
  }

  const matriz = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({
      media: null as number | null,
      quantidadeAmostras: 0,
    })),
  );

  let somaPonderadaGeral = 0;
  let totalAmostrasGeral = 0;

  for (const celula of celulasRegiao) {
    if (
      celula.diaSemana < 0 ||
      celula.diaSemana > 6 ||
      celula.hora < 0 ||
      celula.hora > 23 ||
      !numeroNaoNegativo(celula.media) ||
      !numeroPositivo(celula.quantidadeAmostras)
    ) {
      continue;
    }

    matriz[celula.diaSemana][celula.hora] = {
      media: celula.media,
      quantidadeAmostras: celula.quantidadeAmostras,
    };
    somaPonderadaGeral += celula.media * celula.quantidadeAmostras;
    totalAmostrasGeral += celula.quantidadeAmostras;
  }

  if (totalAmostrasGeral === 0) {
    return null;
  }

  const mediaGeral = somaPonderadaGeral / totalAmostrasGeral;
  if (!numeroPositivo(mediaGeral)) {
    return null;
  }

  const horasNaSemana = 7 * 24;
  const duracao = LIMIARES_OPORTUNIDADES.duracaoJanelaHorarioHoras;
  let melhorJanela: {
    diaSemana: number;
    horaInicio: number;
    mediaJanela: number;
  } | null = null;

  for (let inicio = 0; inicio < horasNaSemana; inicio += 1) {
    let somaJanela = 0;
    let amostrasJanela = 0;
    let completa = true;

    for (let passo = 0; passo < duracao; passo += 1) {
      const idx = (inicio + passo) % horasNaSemana;
      const slot = matriz[Math.floor(idx / 24)][idx % 24];
      if (slot.media === null || slot.quantidadeAmostras <= 0) {
        completa = false;
        break;
      }
      somaJanela += slot.media * slot.quantidadeAmostras;
      amostrasJanela += slot.quantidadeAmostras;
    }

    if (!completa || amostrasJanela === 0) {
      continue;
    }

    const mediaJanela = somaJanela / amostrasJanela;
    if (melhorJanela === null || mediaJanela < melhorJanela.mediaJanela) {
      melhorJanela = {
        diaSemana: Math.floor(inicio / 24),
        horaInicio: inicio % 24,
        mediaJanela,
      };
    }
  }

  if (!melhorJanela) {
    return null;
  }

  const fracaoReducao = 1 - melhorJanela.mediaJanela / mediaGeral;
  const economiaPercentual = fracaoReducao * 100;

  if (
    economiaPercentual <
    LIMIARES_OPORTUNIDADES.reducaoMinimaMudarHorarioPercentual
  ) {
    return null;
  }

  const economiaEstimadaGCo2e = servico.emissaoGCo2e * fracaoReducao;
  const diaTexto = DIAS_SEMANA[melhorJanela.diaSemana];
  const faixaHoraria = `${formatarHora(melhorJanela.horaInicio)}–${formatarHora(melhorJanela.horaInicio + duracao)}`;

  return {
    id: `${servico.servicoId}:MUDAR_HORARIO`,
    servicoId: servico.servicoId,
    servicoNome: servico.nome,
    regiaoCodigo: servico.regiaoCodigo,
    tipo: "MUDAR_HORARIO",
    titulo: `Agendar cargas de ${servico.nome} para janela mais limpa`,
    explicacao: `Sugestão estimada: em ${rotuloRegiao}, a janela de ${diaTexto} (${faixaHoraria}) registrou intensidade média de ${formatarDecimalPt(melhorJanela.mediaJanela)} gCO₂e/kWh, ${formatarDecimalPt(economiaPercentual)}% abaixo da média da região (${formatarDecimalPt(mediaGeral)} gCO₂e/kWh). Aplicável apenas a cargas flexíveis.`,
    economiaEstimadaGCo2e: arredondar(economiaEstimadaGCo2e, 4),
    economiaPercentual: arredondar(economiaPercentual, 1),
    emissaoAtualGCo2e: arredondar(servico.emissaoGCo2e, 4),
    linkDetalhe: `/servicos/${servico.servicoId}`,
  };
}

export function gerarOportunidades(
  servicos: readonly ServicoParaOportunidade[],
  regioes: readonly RegiaoParaOportunidade[],
  matrizPorRegiao: ReadonlyMap<string, readonly CelulaHorarioRegiao[]>,
): ResultadoOportunidades {
  const elegiveis = servicos.filter(
    (servico) =>
      servico.estadoAtual !== "REMOVIDO" ||
      numeroPositivo(servico.emissaoGCo2e),
  );
  const medianaEnergia = calcularMedianaEnergia(
    elegiveis.map((servico) => servico.energiaKwh),
  );
  const rotulosPorRegiao = new Map(
    regioes.map((regiao) => [regiao.codigo, regiao.rotulo]),
  );

  const oportunidades: OportunidadeReducao[] = [];

  for (const servico of elegiveis) {
    const migracao = avaliarMigracaoRegiao(servico, regioes);
    if (migracao) {
      oportunidades.push(migracao);
    }

    const superdim = avaliarSuperdimensionamento(servico, medianaEnergia);
    if (superdim) {
      oportunidades.push(superdim);
    }

    const horario = avaliarMudancaHorario(
      servico,
      matrizPorRegiao.get(servico.regiaoCodigo) ?? [],
      rotulosPorRegiao.get(servico.regiaoCodigo) ?? servico.regiaoCodigo,
    );
    if (horario) {
      oportunidades.push(horario);
    }
  }

  oportunidades.sort(
    (a, b) =>
      b.economiaEstimadaGCo2e - a.economiaEstimadaGCo2e ||
      b.economiaPercentual - a.economiaPercentual ||
      a.servicoNome.localeCompare(b.servicoNome, "pt-BR"),
  );

  const porTipo: Record<TipoOportunidade, number> = {
    MIGRAR_REGIAO: 0,
    SUPERDIMENSIONAMENTO: 0,
    MUDAR_HORARIO: 0,
  };
  let reducaoPotencialGCo2e = 0;

  for (const item of oportunidades) {
    porTipo[item.tipo] += 1;
    reducaoPotencialGCo2e += item.economiaEstimadaGCo2e;
  }

  return {
    resumo: {
      totalOportunidades: oportunidades.length,
      reducaoPotencialGCo2e: arredondar(reducaoPotencialGCo2e, 4),
      porTipo,
    },
    limiares: LIMIARES_OPORTUNIDADES,
    aviso: AVISO_ESTIMATIVA_OPORTUNIDADES,
    oportunidades,
  };
}
