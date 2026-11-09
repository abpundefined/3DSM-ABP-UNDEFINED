jest.mock("@nestjs/jwt", () => ({ JwtService: class JwtService {} }));
jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { UsuariosRepository } from "./usuarios.repository";

describe("AuthService", () => {
  let service: AuthService;
  let senhaHash: string;

  const usuariosRepository = { findByEmail: jest.fn() };
  const jwtService = { signAsync: jest.fn() };

  beforeAll(async () => {
    senhaHash = await bcrypt.hash("senha123", 4);
  });

  beforeEach(async () => {
    usuariosRepository.findByEmail.mockReset();
    jwtService.signAsync.mockReset().mockResolvedValue("token-teste");

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosRepository, useValue: usuariosRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it("retorna o token quando e-mail e senha estão corretos", async () => {
    usuariosRepository.findByEmail.mockResolvedValue({
      id: 1,
      nome: "Admin",
      email: "admin@greener.dev",
      senhaHash,
    });

    await expect(
      service.login({ email: "admin@greener.dev", senha: "senha123" }),
    ).resolves.toEqual({ accessToken: "token-teste" });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: "admin@greener.dev",
    });
  });

  it("rejeita senha incorreta sem gerar token", async () => {
    usuariosRepository.findByEmail.mockResolvedValue({
      id: 1,
      nome: "Admin",
      email: "admin@greener.dev",
      senhaHash,
    });

    await expect(
      service.login({ email: "admin@greener.dev", senha: "errada" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it("rejeita e-mail inexistente com a mesma resposta da senha incorreta", async () => {
    usuariosRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: "naoexiste@greener.dev", senha: "senha123" }),
    ).rejects.toThrow("Credenciais inválidas.");

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
