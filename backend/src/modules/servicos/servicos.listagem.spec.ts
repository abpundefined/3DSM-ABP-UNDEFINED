jest.mock("@nestjs/config", () => ({ ConfigService: class ConfigService {} }));
jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { ServicosService } from "./servicos.service";

describe("ServicosService.listarServicos", () => {
  const findMany = jest.fn();
  const service = new ServicosService(
    { servico: { findMany } } as unknown as PrismaService,
    {} as ConfigService,
  );

  const servicoBase = {
    id: 1,
    idExterno: "billing-api",
    nome: "Billing API",
    regiaoCodigo: "br-sudeste",
    caminhoMetricas: "/metrics/billing-api",
    estadoAtual: "DISPONIVEL",
    descobertoEm: new Date("2026-11-01T00:00:00.000Z"),
    ultimaVezListadoEm: new Date("2026-11-08T00:00:00.000Z"),
    atualizadoEm: new Date("2026-11-08T00:00:00.000Z"),
  };

  const regiaoSudeste = {
    codigo: "br-sudeste",
    pais: "Brasil",
    regiao: "Sudeste",
    cidade: "São Paulo",
    latitude: -23.55,
    longitude: -46.63,
    atualizadaEm: new Date("2026-11-08T00:00:00.000Z"),
  };

  beforeEach(() => {
    findMany.mockReset();
  });

  it("busca os serviços com a região, do mais recente ao mais antigo", async () => {
    findMany.mockResolvedValue([]);

    await service.listarServicos();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { atualizadoEm: "desc" },
      include: { regiao: true },
    });
  });

  it("devolve país, região e cidade de cada serviço", async () => {
    findMany.mockResolvedValue([{ ...servicoBase, regiao: regiaoSudeste }]);

    const [servico] = await service.listarServicos();

    expect(servico).toEqual({
      ...servicoBase,
      localizacao: {
        codigo: "br-sudeste",
        pais: "Brasil",
        regiao: "Sudeste",
        cidade: "São Paulo",
        latitude: -23.55,
        longitude: -46.63,
      },
    });
    expect(servico).not.toHaveProperty("regiao");
  });

  it("mantém a cidade e as coordenadas como null quando a API não informa", async () => {
    findMany.mockResolvedValue([
      {
        ...servicoBase,
        regiaoCodigo: "us-east",
        regiao: {
          ...regiaoSudeste,
          codigo: "us-east",
          pais: "Estados Unidos",
          regiao: "Virgínia",
          cidade: null,
          latitude: null,
          longitude: null,
        },
      },
    ]);

    const [servico] = await service.listarServicos();

    expect(servico.localizacao).toEqual({
      codigo: "us-east",
      pais: "Estados Unidos",
      regiao: "Virgínia",
      cidade: null,
      latitude: null,
      longitude: null,
    });
  });
});
