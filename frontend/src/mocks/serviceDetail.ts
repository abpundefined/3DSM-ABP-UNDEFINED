import type {
  BackendCollection,
  BackendService,
} from '../components/dashboard/liveTypes';
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
  const history = mapaDemo.intervalos.map((inicio, index) => {
    const emissaoGCo2e = service.serie[index];
    return {
      inicio,
      energiaKwh: emissaoGCo2e === null ? null : energyPerInterval,
      emissaoGCo2e,
    };
  });
  const lastValidIndex = service.serie.findLastIndex((value) => value !== null);

  const [pais, cidade] = service.local.split(' · ');
  const backendService: BackendService = {
    id: service.servicoId,
    idExterno: `demo-${service.servicoId}`,
    nome: service.nome,
    regiaoCodigo: service.regiaoCodigo,
    localizacao: {
      pais,
      cidade,
    },
    estadoAtual: service.estado,
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
