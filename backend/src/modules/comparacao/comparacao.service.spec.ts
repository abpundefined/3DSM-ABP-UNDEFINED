jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ComparacaoRepository } from "./comparacao.repository";
import { ComparacaoService } from "./comparacao.service";

describe("ComparacaoService", () => {
  const listarServicos = jest.fn();
  const obterTotais = jest.fn();
  const obterSerie = jest.fn();
  const service = new ComparacaoService({
    listarServicos,
    obterTotais,
    obterSerie,
  } as unknown as ComparacaoRepository);
  const inicio = "2026-11-10T12:15:00.000Z";
  const fim = "2026-11-10T15:00:00.000Z";

  beforeEach(() => {
    jest.resetAllMocks();
    listarServicos.mockResolvedValue([
      { id: 2, nome: "worker" },
      { id: 1, nome: "api" },
    ]);
    obterTotais.mockResolvedValue([
      {
        servicoId: 1,
        energiaKwh: 0.01,
        emissaoGCo2e: 0.85,
        cpuMedia: 12.5,
        memoriaMediaMb: 256,
        coletasValidas: 40,
      },
    ]);
    obterSerie.mockResolvedValue([
      {
        servicoId: 1,
        inicio: new Date("2026-11-10T13:00:00.000Z"),
        energiaKwh: 0.0004,
        emissaoGCo2e: 0.03,
      },
      {
        servicoId: 2,
        inicio: new Date("2026-11-10T14:00:00.000Z"),
        energiaKwh: 0,
        emissaoGCo2e: null,
      },
    ]);
  });

  it("alinha todos os intervalos, preserva zeros e preenche lacunas com null", async () => {
    const resultado = await service.obter({ servicos: "1,2", inicio, fim });

    expect(resultado.periodo).toEqual({ inicio, fim });
    expect(resultado.granularidade).toBe("hora");
    expect(resultado.servicos.map((s) => s.servicoId)).toEqual([1, 2]);
    expect(resultado.servicos[0].totais).toEqual({
      energiaKwh: 0.01,
      emissaoGCo2e: 0.85,
      cpuMedia: 12.5,
      memoriaMediaMb: 256,
      coletasValidas: 40,
    });
    expect(resultado.servicos[1].totais).toEqual({
      energiaKwh: null,
      emissaoGCo2e: null,
      cpuMedia: null,
      memoriaMediaMb: null,
      coletasValidas: 0,
    });
    expect(resultado.servicos.map((s) => s.serie)).toEqual([
      [
        {
          inicio: "2026-11-10T12:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
        {
          inicio: "2026-11-10T13:00:00.000Z",
          energiaKwh: 0.0004,
          emissaoGCo2e: 0.03,
        },
        {
          inicio: "2026-11-10T14:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
        {
          inicio: "2026-11-10T15:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
      ],
      [
        {
          inicio: "2026-11-10T12:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
        {
          inicio: "2026-11-10T13:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
        {
          inicio: "2026-11-10T14:00:00.000Z",
          energiaKwh: 0,
          emissaoGCo2e: null,
        },
        {
          inicio: "2026-11-10T15:00:00.000Z",
          energiaKwh: null,
          emissaoGCo2e: null,
        },
      ],
    ]);
    expect(obterSerie).toHaveBeenCalledWith(
      [1, 2],
      new Date(inicio),
      new Date(fim),
      "hora",
    );
  });

  it.each([
    ["2026-11-12T12:15:00.000Z", "hora"],
    ["2026-11-12T12:15:00.001Z", "dia"],
  ] as const)(
    "seleciona granularidade para fim %s",
    async (fimPeriodo, esperado) => {
      const resultado = await service.obter({
        servicos: "1,2",
        inicio,
        fim: fimPeriodo,
      });
      expect(resultado.granularidade).toBe(esperado);
      expect(obterSerie).toHaveBeenCalledWith(
        [1, 2],
        new Date(inicio),
        new Date(fimPeriodo),
        esperado,
      );
    },
  );

  it.each([
    "",
    "1",
    "1,2,3,4,5,6",
    "1,1",
    "1,01",
    "1,abc",
    "1,0",
    "1,-2",
    "1,2.5",
    "1,,2",
    "1,2147483648",
  ])("rejeita lista inválida %s sem consultar o banco", async (servicos) => {
    await expect(
      service.obter({ servicos, inicio, fim }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listarServicos).not.toHaveBeenCalled();
  });

  it("informa o serviço inexistente com 404", async () => {
    listarServicos.mockResolvedValue([{ id: 1, nome: "api" }]);
    await expect(
      service.obter({ servicos: "1,2", inicio, fim }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.obter({ servicos: "1,2", inicio, fim }),
    ).rejects.toThrow("2");
    expect(obterTotais).not.toHaveBeenCalled();
  });
});
