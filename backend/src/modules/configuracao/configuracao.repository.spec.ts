jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { ConfiguracaoRepository } from "./configuracao.repository";

describe("ConfiguracaoRepository", () => {
  const findFirst = jest.fn();
  const update = jest.fn();
  const create = jest.fn();
  const repository = new ConfiguracaoRepository({
    configuracaoMonitoramento: { findFirst, update, create },
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("busca a configuração mais antiga", async () => {
    const configuracao = { id: 1 };
    findFirst.mockResolvedValue(configuracao);

    await expect(repository.findAtual()).resolves.toBe(configuracao);
    expect(findFirst).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });

  it("atualiza a configuração existente", async () => {
    const atual = { id: 3 };
    const dto = {
      intervaloDescobertaSegundos: 120,
      intervaloColetaSegundos: 30,
    };
    const atualizada = { id: 3, ...dto };
    findFirst.mockResolvedValue(atual);
    update.mockResolvedValue(atualizada);

    await expect(repository.salvar(dto)).resolves.toBe(atualizada);
    expect(update).toHaveBeenCalledWith({ where: { id: 3 }, data: dto });
    expect(create).not.toHaveBeenCalled();
  });

  it("cria a configuração quando ainda não existe uma salva", async () => {
    const dto = {
      intervaloDescobertaSegundos: 120,
      intervaloColetaSegundos: 30,
    };
    const criada = { id: 1, ...dto };
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(criada);

    await expect(repository.salvar(dto)).resolves.toBe(criada);
    expect(create).toHaveBeenCalledWith({ data: dto });
    expect(update).not.toHaveBeenCalled();
  });
});
