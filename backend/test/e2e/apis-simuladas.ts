import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { PORTA_APIS_SIMULADAS } from "./ambiente";

export interface ServicoExterno {
  id: string;
  name: string;
  location: {
    region_code: string;
    country: string;
    region: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  metrics_path: string;
}

export interface Metricas {
  cpu_percent: number;
  memory_gb: number;
  disk_gb: number;
  network_gb: number;
}

export interface CenarioExterno {
  servicos: ServicoExterno[];
  metricas: Record<string, Metricas | number>;
  intensidades: Record<string, number>;
  intervaloColetaSegundos: number;
}

export interface ApisSimuladas {
  cenario: CenarioExterno;
  requisicoes: string[];
  fechar(): Promise<void>;
}

function responder(res: ServerResponse, status: number, corpo: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(corpo));
}

export async function iniciarApisSimuladas(
  cenario: CenarioExterno,
): Promise<ApisSimuladas> {
  const requisicoes: string[] = [];

  const servidor = createServer((req: IncomingMessage, res: ServerResponse) => {
    const caminho = req.url ?? "";
    requisicoes.push(caminho);

    if (caminho === "/services") {
      return responder(res, 200, { services: cenario.servicos });
    }

    const metricas = /^\/metrics\/([^/]+)$/.exec(caminho);
    if (metricas) {
      const resposta = cenario.metricas[decodeURIComponent(metricas[1])];
      if (resposta === undefined) {
        return responder(res, 404, { error: "not found" });
      }
      if (typeof resposta === "number") {
        return responder(res, resposta, { error: "simulado" });
      }
      return responder(res, 200, {
        collection_interval_seconds: cenario.intervaloColetaSegundos,
        metrics: resposta,
      });
    }

    const intensidade = /^\/regions\/([^/]+)\/carbon-intensity$/.exec(caminho);
    if (intensidade) {
      const valor = cenario.intensidades[decodeURIComponent(intensidade[1])];
      return valor === undefined
        ? responder(res, 404, { error: "região desconhecida" })
        : responder(res, 200, { carbon_intensity_gco2e_per_kwh: valor });
    }

    return responder(res, 404, { error: "rota não simulada" });
  });

  await new Promise<void>((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(PORTA_APIS_SIMULADAS, "127.0.0.1", resolve);
  });

  return {
    cenario,
    requisicoes,
    fechar: () =>
      new Promise<void>((resolve, reject) =>
        servidor.close((erro) => (erro ? reject(erro) : resolve())),
      ),
  };
}
