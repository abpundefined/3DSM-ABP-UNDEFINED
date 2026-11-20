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
    return {
      inicio,
      energiaKwh: emissaoGCo2e === null ? null : energyPerInterval,
      emissaoGCo2e,
      componentes: emissaoGCo2e === null ? null : demoComponentes,
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
