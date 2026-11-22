jest.mock("@nestjs/config", () => ({
  ConfigService: class ConfigService {},
}));
jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));
jest.mock("../auth/guards/jwt-auth.guard", () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { AtualizarConfiguracaoDto } from "./dto/atualizar-configuracao.dto";
import { ConfiguracaoController } from "./configuracao.controller";
import { ConfiguracaoService } from "./configuracao.service";

describe("ConfiguracaoController", () => {
  const atualizar = jest.fn();
  const controller = new ConfiguracaoController({
    atualizar,
  } as unknown as ConfiguracaoService);
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  const validar = (body: Record<string, unknown>) =>
    pipe.transform(body, {
      type: "body",
      metatype: AtualizarConfiguracaoDto,
    }) as Promise<AtualizarConfiguracaoDto>;

  beforeEach(() => atualizar.mockReset());

  it.each([500.5, null])(
    "aceita e encaminha a configuração com meta mensal %s",
    async (metaMensalKgCo2e) => {
      const dto = await validar({
        intervaloDescobertaSegundos: 300,
        intervaloColetaSegundos: 45,
        metaMensalKgCo2e,
      });

      await controller.atualizar(dto);

      expect(atualizar).toHaveBeenCalledWith(dto);
    },
  );

  it.each(["500.5", -1])(
    "rejeita meta mensal inválida: %s",
    async (metaMensalKgCo2e) => {
      await expect(
        validar({
          intervaloDescobertaSegundos: 300,
          intervaloColetaSegundos: 45,
          metaMensalKgCo2e,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
