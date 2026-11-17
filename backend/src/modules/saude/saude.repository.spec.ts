jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { SaudeRepository } from "./saude.repository";

describe("SaudeRepository", () => {
  it("conta as coletas por estado a partir do instante informado", async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { estadoColeta: "SUCESSO", _count: { _all: 8 } },
      { estadoColeta: "FALHA", _count: { _all: 2 } },
    ]);
    const repository = new SaudeRepository({
      coleta: { groupBy },
    } as unknown as PrismaService);
    const inicio = new Date("2026-11-17T11:00:00.000Z");

    const resultado = await repository.contarColetasDesde(inicio);

    expect(groupBy).toHaveBeenCalledWith({
      by: ["estadoColeta"],
      where: { iniciadaEm: { gte: inicio } },
      _count: { _all: true },
    });
    expect(resultado).toEqual([
      { estado: "SUCESSO", quantidade: 8 },
      { estado: "FALHA", quantidade: 2 },
    ]);
  });

  it("conta os serviços por estado atual", async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { estadoAtual: "DISPONIVEL", _count: { _all: 5 } },
      { estadoAtual: "SEM_METRICAS", _count: { _all: 1 } },
    ]);
    const repository = new SaudeRepository({
      servico: { groupBy },
    } as unknown as PrismaService);

    const resultado = await repository.contarServicosPorEstado();

    expect(groupBy).toHaveBeenCalledWith({
      by: ["estadoAtual"],
      _count: { _all: true },
    });
    expect(resultado).toEqual([
      { estado: "DISPONIVEL", quantidade: 5 },
      { estado: "SEM_METRICAS", quantidade: 1 },
    ]);
  });
});
