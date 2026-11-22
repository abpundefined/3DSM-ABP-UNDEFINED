import type {
  BackendCollection,
  BackendService,
} from '../components/dashboard/liveTypes';
import { calcularComponentesPorMetricas } from '../utils/composicaoEnergia';
import { mapaDemo } from './mapa';
import type { ServiceDetailData } from '../services/serviceDetail';

export function getDemoServiceDetail(
  serviceId: number,
): ServiceDetailData | null {
  const service = mapaDemo.servicos.find(
    (item) => item.servicoId === serviceId,
  );
  if (!service) {
    return null;
  }

  const validEmissionCount = service.serie.filter(
    (value) => value !== null,
  ).length;
  const energyPerInterval =
    service.totais.energiaKwh === null || validEmissionCount === 0
      ? null
      : service.totais.energiaKwh / validEmissionCount;
  const demoComponentes =
    validEmissionCount === 0
      ? null
      : calcularComponentesPorMetricas({
          cpuPercent: 32 + ((serviceId * 11) % 45),
          memoryGb: 1.2 + (serviceId % 4) * 0.6,
          diskGb: 14 + (serviceId % 5) * 6,
          networkGb: 2.5 + (serviceId % 3) * 1.5,
        });
  const history = mapaDemo.intervalos.map((inicio, index) => {
    const emissaoGCo2e = service.serie[index];
    if (emissaoGCo2e === null) {
      const indisponivel = service.estado === 'INDISPONIVEL' ? 12 : 0;
      const semMetricas = service.estado === 'SEM_METRICAS' ? 12 : 0;
      const coletas = indisponivel + semMetricas;
      return {
        inicio,
        energiaKwh: null,
        emissaoGCo2e: null,
        selo: '—',
        componentes: null,
        coletas: coletas === 0 ? null : coletas,
        ativo: 0,
        indisponivel,
        semMetricas,
      };
    }

    const intervaloComFalha =
      service.serie.length >= 6 && index === service.serie.length - 4;
    const intervaloSemMetricas =
      service.serie.length >= 8 && index === service.serie.length - 2;
    const ativo = intervaloComFalha ? 4 : intervaloSemMetricas ? 9 : 12;
    const indisponivel = intervaloComFalha ? 8 : 0;
    const semMetricas = intervaloSemMetricas ? 3 : 0;

    return {
      inicio,
      energiaKwh: energyPerInterval,
      emissaoGCo2e,
      selo: 'A',
      componentes: demoComponentes,
      coletas: ativo + indisponivel + semMetricas,
      ativo,
      indisponivel,
      semMetricas,
    };
  });
  const lastValidIndex = service.serie.findLastIndex((value) => value !== null);

  const [pais, cidade] = service.local.split(' · ');
  const backendService: BackendService = {
    id: service.servicoId,
    idExterno: `demo-${service.servicoId}`,
    nome: service.nome,
    regiaoCodigo: service.regiaoCodigo,
    selo: lastValidIndex < 0 ? '—' : 'A',
    localizacao: {
      pais,
      cidade,
    },
    estadoAtual: service.estado,
    componentes: demoComponentes,
  };
  const latestCollection: BackendCollection | null =
    lastValidIndex < 0
      ? null
      : {
          iniciadaEm: mapaDemo.intervalos[lastValidIndex],
          cpuPercent: null,
          memoryGb: null,
          diskGb: null,
          networkGb: null,
          energiaKwh: null,
          emissaoGCo2e: null,
        };

  return { service: backendService, latestCollection, history };
}
