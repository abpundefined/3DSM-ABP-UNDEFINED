jest.mock("@nestjs/config", () => ({ ConfigService: class ConfigService {} }));
jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { ConfigService } from "@nestjs/config";
import { ConfiguracaoRepository } from "./configuracao.repository";
import { ConfiguracaoService } from "./configuracao.service";

describe("ConfiguracaoService", () => {
  const configuracaoRepository = { findAtual: jest.fn(), salvar: jest.fn() };
  let env: Record<string, string | undefined>;

  const criarService = () =>
    new ConfiguracaoService(
      configuracaoRepository as unknown as ConfiguracaoRepository,
      { get: (chave: string) => env[chave] } as unknown as ConfigService,
    );

  beforeEach(() => {
    configuracaoRepository.findAtual.mockReset();
    configuracaoRepository.salvar.mockReset();
    env = { METRICS_POLL_INTERVAL_MS: "30000" };
  });

  it("retorna a configuração salva no banco", async () => {
    const atualizadaEm = new Date("2026-11-08T03:00:00Z");
    configuracaoRepository.findAtual.mockResolvedValue({
      id: 1,
      intervaloDescobertaSegundos: 120,
      intervaloColetaSegundos: 60,
      metaMensalKgCo2e: null,
      atualizadaEm,
    });

    await expect(criarService().obter()).resolves.toEqual({
      intervaloDescobertaSegundos: 120,
      intervaloColetaSegundos: 60,
      metaMensalKgCo2e: null,
      atualizadaEm,
      padrao: false,
    });
  });

  it("usa o intervalo do ambiente quando ainda não há configuração salva", async () => {
    configuracaoRepository.findAtual.mockResolvedValue(null);

    await expect(criarService().obter()).resolves.toEqual({
      intervaloDescobertaSegundos: 30,
      intervaloColetaSegundos: 30,
      metaMensalKgCo2e: null,
      atualizadaEm: null,
      padrao: true,
    });
  });

  it("usa 30 segundos quando a variável de ambiente não existe", async () => {
    env = {};
    configuracaoRepository.findAtual.mockResolvedValue(null);

    const resultado = await criarService().obter();

    expect(resultado.intervaloColetaSegundos).toBe(30);
    expect(resultado.metaMensalKgCo2e).toBeNull();
    expect(resultado.padrao).toBe(true);
  });

  it.each([500.5, null])(
    "salva a configuração com meta mensal %s",
    async (metaMensalKgCo2e) => {
      const dto = {
        intervaloDescobertaSegundos: 300,
        intervaloColetaSegundos: 45,
        metaMensalKgCo2e,
      };
      const atualizadaEm = new Date("2026-11-08T03:10:00Z");
      configuracaoRepository.salvar.mockResolvedValue({
        id: 1,
        ...dto,
        atualizadaEm,
      });

      await expect(criarService().atualizar(dto)).resolves.toEqual({
        ...dto,
        atualizadaEm,
        padrao: false,
      });
      expect(configuracaoRepository.salvar).toHaveBeenCalledWith(dto);
    },
  );
});
