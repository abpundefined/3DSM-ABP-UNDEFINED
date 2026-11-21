import type { ServicoNoMapa, ServicoSemCoordenadas } from '../types/mapa';

export type RegiaoAlvoMapa = {
  codigo: string;
  local: string;
  latitude: number;
  longitude: number;
  intensidadeGCo2ePorKwh: number | null;
  quantidadeServicos: number;
};

export type SimulacaoRegiaoMapa = {
  servicoId: number;
  servicoNome: string;
  regiaoOrigemCodigo: string;
  regiaoOrigemLocal: string;
  regiaoDestinoCodigo: string;
  regiaoDestinoLocal: string;
  latitudeDestino: number;
  longitudeDestino: number;
  energiaKwh: number | null;
  intensidadeDestinoGCo2ePorKwh: number | null;
  emissaoAtualGCo2e: number | null;
  emissaoSimuladaGCo2e: number | null;
  diferencaGCo2e: number | null;
  diferencaPercentual: number | null;
};

export type PosicaoNoMapa = {
  latitude: number;
  longitude: number;
};

const RAIO_TERRA_KM = 6371;
const DESLOCAMENTO_GRAUS_CO_LOCALIZADOS = 1.1;

const formatoGramas = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoPercentual = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

const formatoIntensidade = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

function grausParaRadianos(graus: number) {
  return (graus * Math.PI) / 180;
}

export function distanciaKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const deltaLat = grausParaRadianos(latitudeB - latitudeA);
  const deltaLng = grausParaRadianos(longitudeB - longitudeA);
  const latA = grausParaRadianos(latitudeA);
  const latB = grausParaRadianos(latitudeB);

  const senoLat = Math.sin(deltaLat / 2);
  const senoLng = Math.sin(deltaLng / 2);
  const a =
    senoLat * senoLat + Math.cos(latA) * Math.cos(latB) * senoLng * senoLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return RAIO_TERRA_KM * c;
}

export function extrairRegioesAlvoMapa(
  servicos: readonly ServicoNoMapa[],
  semCoordenadas: readonly ServicoSemCoordenadas[] = [],
): RegiaoAlvoMapa[] {
  type Acumulado = {
    codigo: string;
    local: string;
    somaLat: number;
    somaLng: number;
    pontosComCoordenada: number;
    quantidadeServicos: number;
    energiaKwh: number;
    emissaoGCo2e: number;
  };

  const acumulados = new Map<string, Acumulado>();

  const somarTotais = (
    acumulado: Acumulado,
    energiaKwh: number | null,
    emissaoGCo2e: number | null,
  ) => {
    if (
      energiaKwh === null ||
      emissaoGCo2e === null ||
      !Number.isFinite(energiaKwh) ||
      !Number.isFinite(emissaoGCo2e) ||
      energiaKwh <= 0 ||
      emissaoGCo2e < 0
    ) {
      return;
    }

    acumulado.energiaKwh += energiaKwh;
    acumulado.emissaoGCo2e += emissaoGCo2e;
  };

  for (const servico of servicos) {
    let acumulado = acumulados.get(servico.regiaoCodigo);
    if (!acumulado) {
      acumulado = {
        codigo: servico.regiaoCodigo,
        local: servico.local,
        somaLat: 0,
        somaLng: 0,
        pontosComCoordenada: 0,
        quantidadeServicos: 0,
        energiaKwh: 0,
        emissaoGCo2e: 0,
      };
      acumulados.set(servico.regiaoCodigo, acumulado);
    }

    acumulado.somaLat += servico.latitude;
    acumulado.somaLng += servico.longitude;
    acumulado.pontosComCoordenada += 1;
    acumulado.quantidadeServicos += 1;
    somarTotais(
      acumulado,
      servico.totais.energiaKwh,
      servico.totais.emissaoGCo2e,
    );
  }

  for (const servico of semCoordenadas) {
    const acumulado = acumulados.get(servico.regiaoCodigo);
    if (!acumulado) {
      continue;
    }

    acumulado.quantidadeServicos += 1;
    somarTotais(
      acumulado,
      servico.totais.energiaKwh,
      servico.totais.emissaoGCo2e,
    );
  }

  return [...acumulados.values()]
    .map((item) => ({
      codigo: item.codigo,
      local: item.local,
      latitude: item.somaLat / item.pontosComCoordenada,
      longitude: item.somaLng / item.pontosComCoordenada,
      intensidadeGCo2ePorKwh:
        item.energiaKwh > 0 ? item.emissaoGCo2e / item.energiaKwh : null,
      quantidadeServicos: item.quantidadeServicos,
    }))
    .sort((a, b) => a.local.localeCompare(b.local, 'pt-BR'));
}

export function encontrarRegiaoMaisProxima(
  latitude: number,
  longitude: number,
  regioes: readonly RegiaoAlvoMapa[],
  raioMaximoKm = Number.POSITIVE_INFINITY,
): RegiaoAlvoMapa | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    regioes.length === 0
  ) {
    return null;
  }

  let maisProxima: RegiaoAlvoMapa | null = null;
  let menorDistancia = Number.POSITIVE_INFINITY;

  for (const regiao of regioes) {
    const distancia = distanciaKm(
      latitude,
      longitude,
      regiao.latitude,
      regiao.longitude,
    );
    if (distancia <= raioMaximoKm && distancia < menorDistancia) {
      menorDistancia = distancia;
      maisProxima = regiao;
    }
  }

  return maisProxima;
}

export function simularMudancaRegiaoNoMapa(
  servico: ServicoNoMapa,
  regiaoDestino: RegiaoAlvoMapa,
): SimulacaoRegiaoMapa {
  const energiaKwh = servico.totais.energiaKwh;
  const emissaoAtualGCo2e = servico.totais.emissaoGCo2e;
  const intensidadeDestino = regiaoDestino.intensidadeGCo2ePorKwh;

  const podeCalcular =
    energiaKwh !== null &&
    Number.isFinite(energiaKwh) &&
    energiaKwh > 0 &&
    intensidadeDestino !== null &&
    Number.isFinite(intensidadeDestino) &&
    intensidadeDestino >= 0;

  const emissaoSimuladaGCo2e = podeCalcular
    ? energiaKwh * intensidadeDestino
    : null;

  const diferencaGCo2e =
    emissaoSimuladaGCo2e !== null && emissaoAtualGCo2e !== null
      ? emissaoSimuladaGCo2e - emissaoAtualGCo2e
      : null;

  const diferencaPercentual =
    diferencaGCo2e !== null &&
    emissaoAtualGCo2e !== null &&
    emissaoAtualGCo2e > 0
      ? (diferencaGCo2e / emissaoAtualGCo2e) * 100
      : null;

  return {
    servicoId: servico.servicoId,
    servicoNome: servico.nome,
    regiaoOrigemCodigo: servico.regiaoCodigo,
    regiaoOrigemLocal: servico.local,
    regiaoDestinoCodigo: regiaoDestino.codigo,
    regiaoDestinoLocal: regiaoDestino.local,
    latitudeDestino: regiaoDestino.latitude,
    longitudeDestino: regiaoDestino.longitude,
    energiaKwh,
    intensidadeDestinoGCo2ePorKwh: intensidadeDestino,
    emissaoAtualGCo2e,
    emissaoSimuladaGCo2e,
    diferencaGCo2e,
    diferencaPercentual,
  };
}

export function aplicarSimulacoesNoMapa(
  servicos: readonly ServicoNoMapa[],
  simulacoes: ReadonlyMap<number, SimulacaoRegiaoMapa>,
): ServicoNoMapa[] {
  if (simulacoes.size === 0) {
    return [...servicos];
  }

  return servicos.map((servico) => {
    const simulacao = simulacoes.get(servico.servicoId);
    if (!simulacao) {
      return servico;
    }

    return {
      ...servico,
      regiaoCodigo: simulacao.regiaoDestinoCodigo,
      local: simulacao.regiaoDestinoLocal,
      latitude: simulacao.latitudeDestino,
      longitude: simulacao.longitudeDestino,
      totais: {
        ...servico.totais,
        emissaoGCo2e:
          simulacao.emissaoSimuladaGCo2e ?? servico.totais.emissaoGCo2e,
      },
    };
  });
}

export function posicoesSemSobreposicao(
  servicos: readonly Pick<
    ServicoNoMapa,
    'servicoId' | 'latitude' | 'longitude'
  >[],
): Map<number, PosicaoNoMapa> {
  const grupos = new Map<
    string,
    Pick<ServicoNoMapa, 'servicoId' | 'latitude' | 'longitude'>[]
  >();

  for (const servico of servicos) {
    const chave = `${servico.latitude.toFixed(3)},${servico.longitude.toFixed(3)}`;
    const lista = grupos.get(chave);
    if (lista) {
      lista.push(servico);
    } else {
      grupos.set(chave, [servico]);
    }
  }

  const posicoes = new Map<number, PosicaoNoMapa>();
  for (const grupo of grupos.values()) {
    if (grupo.length === 1) {
      const unico = grupo[0];
      posicoes.set(unico.servicoId, {
        latitude: unico.latitude,
        longitude: unico.longitude,
      });
      continue;
    }

    grupo.forEach((servico, indice) => {
      const angulo = (2 * Math.PI * indice) / grupo.length - Math.PI / 2;
      const latitude = Math.max(
        -82,
        Math.min(
          82,
          servico.latitude +
            Math.sin(angulo) * DESLOCAMENTO_GRAUS_CO_LOCALIZADOS,
        ),
      );
      const fatorLongitude = Math.max(
        0.35,
        Math.cos(grausParaRadianos(servico.latitude)),
      );
      const longitude = Math.max(
        -178,
        Math.min(
          178,
          servico.longitude +
            (Math.cos(angulo) * DESLOCAMENTO_GRAUS_CO_LOCALIZADOS) /
              fatorLongitude,
        ),
      );
      posicoes.set(servico.servicoId, { latitude, longitude });
    });
  }

  return posicoes;
}

export function formatarGramasSimulacao(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) {
    return 'Sem dados';
  }
  if (valor > 0 && valor < 0.01) {
    return '< 0,01 gCO₂e';
  }
  return `${formatoGramas.format(valor)} gCO₂e`;
}

export function formatarDiferencaGramas(valor: number | null): string | null {
  if (valor === null || !Number.isFinite(valor)) {
    return null;
  }
  const absoluto = Math.abs(valor);
  if (absoluto === 0) {
    return '0,00 gCO₂e';
  }
  const sinal = valor < 0 ? '−' : '+';
  const magnitude = absoluto < 0.01 ? '< 0,01' : formatoGramas.format(absoluto);
  return `${sinal}${magnitude} gCO₂e`;
}

export function formatarDiferencaPercentual(
  valor: number | null,
): string | null {
  if (valor === null || !Number.isFinite(valor)) {
    return null;
  }
  return `${formatoPercentual.format(valor).replace('-', '−')}%`;
}

export function formatarIntensidadeAlvo(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) {
    return 'sem dados de intensidade';
  }
  return `${formatoIntensidade.format(valor)} gCO₂e/kWh`;
}

export function descreverResultadoSimulacaoMapa(
  simulacao: SimulacaoRegiaoMapa,
): string {
  if (simulacao.intensidadeDestinoGCo2ePorKwh === null) {
    return `Sem dados de intensidade de carbono em ${simulacao.regiaoDestinoLocal} para recalcular a emissão.`;
  }
  if (simulacao.emissaoSimuladaGCo2e === null) {
    return `${simulacao.servicoNome} não tem dados de energia suficientes no período para simular outra região.`;
  }
  if (simulacao.diferencaGCo2e === null) {
    return `Emissão estimada em ${simulacao.regiaoDestinoLocal}: ${formatarGramasSimulacao(simulacao.emissaoSimuladaGCo2e)}.`;
  }
  if (simulacao.diferencaGCo2e === 0) {
    return `Mesma emissão estimada (${formatarGramasSimulacao(simulacao.emissaoSimuladaGCo2e)}, 0%) em relação a ${simulacao.regiaoOrigemLocal}.`;
  }

  const diffGramas = formatarDiferencaGramas(simulacao.diferencaGCo2e);
  const diffPct = formatarDiferencaPercentual(simulacao.diferencaPercentual);
  const sentido = simulacao.diferencaGCo2e < 0 ? 'redução' : 'aumento';
  const partePct = diffPct ? ` (${diffPct})` : '';

  return `${sentido === 'redução' ? 'Redução' : 'Aumento'} estimado de ${diffGramas}${partePct} em relação a ${simulacao.regiaoOrigemLocal}.`;
}
