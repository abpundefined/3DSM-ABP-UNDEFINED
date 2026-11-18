jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from "../../database/prisma.service";
import { UsuariosRepository } from "./usuarios.repository";

describe("UsuariosRepository", () => {
  const findUnique = jest.fn();
  const create = jest.fn();
  const repository = new UsuariosRepository({
    usuario: { findUnique, create },
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("busca usuário pelo e-mail e retorna null quando não encontrado", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      repository.findByEmail("pessoa@example.com"),
    ).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "pessoa@example.com" },
    });
  });

  it("cria usuário usando os dados fornecidos", async () => {
    const data = {
      nome: "Pessoa",
      email: "pessoa@example.com",
      senhaHash: "hash-seguro",
    };
    const usuario = { id: 1, ...data };
    create.mockResolvedValue(usuario);

    await expect(repository.create(data)).resolves.toBe(usuario);
    expect(create).toHaveBeenCalledWith({ data });
  });
});
