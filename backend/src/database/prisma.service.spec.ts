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
});
