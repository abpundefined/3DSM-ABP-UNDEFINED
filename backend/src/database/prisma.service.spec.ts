const prismaPg = jest.fn();

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation((config: unknown) => {
    prismaPg(config);
    return {};
  }),
}));

jest.mock("../generated/prisma/client", () => ({
  PrismaClient: class PrismaClient {},
}));

jest.mock("@nestjs/config", () => ({
  ConfigService: class ConfigService {},
}));

import { ConfigService } from "@nestjs/config";
import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  const criarPrismaServiceComMocks = () => {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    const connect = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const queryRaw = jest.fn();
    Object.assign(service, {
      $connect: connect,
      $disconnect: disconnect,
      $queryRaw: queryRaw,
    });

    return { service, connect, disconnect, queryRaw };
  };

  it("abre as conexões com o fuso UTC, independentemente do fuso do servidor PostgreSQL", () => {
    const config = {
      getOrThrow: jest
        .fn()
        .mockReturnValue("postgresql://usuario@banco/greener"),
    } as unknown as ConfigService;

    new PrismaService(config);

    expect(prismaPg).toHaveBeenCalledWith({
      connectionString: "postgresql://usuario@banco/greener",
      options: "-c TimeZone=UTC",
    });
  });

  it("conecta e desconecta durante o ciclo de vida do módulo", async () => {
    const { service, connect, disconnect } = criarPrismaServiceComMocks();

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("verifica o schema e termina sem erro quando todas as tabelas existem", async () => {
    const { service, connect, queryRaw } = criarPrismaServiceComMocks();
    queryRaw.mockResolvedValue([{ missing: [] }]);

    await expect(service.verifySchema()).resolves.toBeUndefined();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("informa quais tabelas estão ausentes no schema", async () => {
    const { service, queryRaw } = criarPrismaServiceComMocks();
    queryRaw.mockResolvedValue([{ missing: ["Coleta", "Usuario"] }]);

    await expect(service.verifySchema()).rejects.toThrow(
      "tabelas ausentes: Coleta, Usuario",
    );
  });
});
