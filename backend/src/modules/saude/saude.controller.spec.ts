jest.mock("@nestjs/jwt", () => ({ JwtService: class JwtService {} }));
jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { SaudeController } from "./saude.controller";
import type { SaudeService } from "./saude.service";

describe("SaudeController", () => {
  it("devolve a saúde calculada pelo serviço", async () => {
    const resposta = { geradoEm: "2026-11-17T12:00:00.000Z" };
    const obter = jest.fn().mockResolvedValue(resposta);
    const controller = new SaudeController({
      obter,
    } as unknown as SaudeService);

    await expect(controller.obter()).resolves.toBe(resposta);
    expect(obter).toHaveBeenCalledTimes(1);
  });
});
