jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import {
  ImpactoPorIntervalo,
  MapaRepository,
  ServicoComRegiao,
} from "./mapa.repository";
import { MapaService } from "./mapa.service";

const SAO_PAULO = {
  pais: "Brasil",
  regiao: "Sudeste",
  cidade: "São Paulo",
  latitude: -23.5505,
  longitude: -46.6333,
};

function servico(
  id: number,
  dados: Partial<Omit<ServicoComRegiao, "regiao">> & {
    regiao?: Partial<ServicoComRegiao["regiao"]>;
  } = {},
): ServicoComRegiao {
  return {
    id,
    nome: `Serviço ${id}`,
    estadoAtual: "DISPONIVEL",
    regiaoCodigo: "br-sudeste",
    ...dados,
    regiao: { ...SAO_PAULO, ...dados.regiao },
  };
}

function impacto(
  servicoId: number,
  inicioIntervalo: string,
  energiaKwh: number | null,
  emissaoGCo2e: number | null,
): ImpactoPorIntervalo {
  return {
    servicoId,
    inicioIntervalo: new Date(inicioIntervalo),
    energiaKwh,
    emissaoGCo2e,
  };
}

describe("MapaService", () => {
  const inicio = new Date("2026-11-10T12:00:00.000Z");
  const fim = new Date("2026-11-10T14:59:59.999Z");
  const repository = {
    listarServicosComRegiao: jest.fn(),
    somarImpactoPorIntervalo: jest.fn(),
  };
  const service = new MapaService(repository as unknown as MapaRepository);

  function configurar(
    servicos: ServicoComRegiao[],
    impactos: ImpactoPorIntervalo[] = [],
  ) {
    repository.listarServicosComRegiao.mockReset().mockResolvedValue(servicos);
    repository.somarImpactoPorIntervalo.mockReset().mockResolvedValue(impactos);
  }

  it("devolve o período, a granularidade e os intervalos usados", async () => {
    configurar([]);

    await expect(service.obter(inicio, fim)).resolves.toEqual({
      periodo: {
        inicio: "2026-11-10T12:00:00.000Z",
        fim: "2026-11-10T14:59:59.999Z",
      },
      granularidade: "hora",
      intervalos: [
        "2026-11-10T12:00:00.000Z",
        "2026-11-10T13:00:00.000Z",
        "2026-11-10T14:00:00.000Z",
      ],
      servicos: [],
      semCoordenadas: [],
    });
    expect(repository.somarImpactoPorIntervalo).toHaveBeenCalledWith(
      inicio,
      fim,
      "hora",
    );
  });

  it("alinha a série com os intervalos e mantém nulo onde não houve coleta", async () => {
    configurar(
      [servico(1, { nome: "Auth Service" })],
      [
        impacto(1, "2026-11-10T12:00:00.000Z", 0.001, 0.1),
        impacto(1, "2026-11-10T14:00:00.000Z", 0.003, 0.3),
      ],
    );

    const { servicos } = await service.obter(inicio, fim);

    expect(servicos).toEqual([
      {
        servicoId: 1,
        nome: "Auth Service",
        estado: "DISPONIVEL",
        regiaoCodigo: "br-sudeste",
        latitude: -23.5505,
        longitude: -46.6333,
        local: "Brasil · São Paulo",
        totais: { energiaKwh: 0.004, emissaoGCo2e: 0.4 },
        serie: [0.1, null, 0.3],
      },
    ]);
  });

  it("usa totais nulos e série vazia para serviço sem coleta calculada", async () => {
    configurar([servico(1, { estadoAtual: "SEM_METRICAS" })]);

    const { servicos } = await service.obter(inicio, fim);

    expect(servicos[0].totais).toEqual({
      energiaKwh: null,
      emissaoGCo2e: null,
    });
    expect(servicos[0].serie).toEqual([null, null, null]);
  });

  it("separa serviços sem coordenadas válidas", async () => {
    configurar(
      [
        servico(1),
        servico(2, { regiao: { latitude: null } }),
        servico(3, { regiao: { longitude: null } }),
        servico(4, { regiao: { latitude: 91 } }),
        servico(5, { regiao: { longitude: Number.NaN } }),
      ],
      [impacto(2, "2026-11-10T13:00:00.000Z", 0.002, 0.25)],
    );

    const { servicos, semCoordenadas } = await service.obter(inicio, fim);

    expect(servicos.map(({ servicoId }) => servicoId)).toEqual([1]);
    expect(semCoordenadas.map(({ servicoId }) => servicoId)).toEqual([
      2, 3, 4, 5,
    ]);
    expect(semCoordenadas[0]).toEqual({
      servicoId: 2,
      nome: "Serviço 2",
      estado: "DISPONIVEL",
      regiaoCodigo: "br-sudeste",
      totais: { energiaKwh: 0.002, emissaoGCo2e: 0.25 },
    });
  });

  it("mostra serviço removido apenas se ele teve coleta no período", async () => {
    configurar(
      [
        servico(1, { estadoAtual: "REMOVIDO" }),
        servico(2, { estadoAtual: "REMOVIDO" }),
      ],
      [impacto(2, "2026-11-10T12:00:00.000Z", 0.001, 0.1)],
    );

    const { servicos } = await service.obter(inicio, fim);

    expect(servicos.map(({ servicoId }) => servicoId)).toEqual([2]);
    expect(servicos[0].estado).toBe("REMOVIDO");
  });

  it("ignora linhas fora dos intervalos e valores nulos ao somar", async () => {
    configurar(
      [servico(1)],
      [
        impacto(1, "2026-11-10T12:00:00.000Z", null, null),
        impacto(1, "2026-11-10T13:00:00.000Z", 0.002, 0.2),
        impacto(1, "2026-11-09T00:00:00.000Z", 5, 500),
      ],
    );

    const { servicos } = await service.obter(inicio, fim);

    expect(servicos[0].serie).toEqual([null, 0.2, null]);
    expect(servicos[0].totais).toEqual({
      energiaKwh: 0.002,
      emissaoGCo2e: 0.2,
    });
  });

  it("usa granularidade diária acima de 48 horas", async () => {
    configurar([servico(1)], [impacto(1, "2026-11-02T03:00:00.000Z", 0.01, 1)]);

    const resposta = await service.obter(
      new Date("2026-11-01T03:00:00.000Z"),
      new Date("2026-11-08T02:59:59.999Z"),
    );

    expect(resposta.granularidade).toBe("dia");
    expect(resposta.intervalos).toHaveLength(7);
    expect(resposta.servicos[0].serie).toEqual([
      null,
      1,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it.each([
    [{ cidade: null }, "Brasil · Sudeste"],
    [{ pais: "Desconhecida", cidade: "Dublin" }, "Dublin"],
    [
      { pais: "Desconhecida", regiao: "desconhecido", cidade: null },
      "Localização não informada",
    ],
  ])("formata o local %#", async (regiao, esperado) => {
    configurar([servico(1, { regiao })]);

    const { servicos } = await service.obter(inicio, fim);

    expect(servicos[0].local).toBe(esperado);
  });
});
