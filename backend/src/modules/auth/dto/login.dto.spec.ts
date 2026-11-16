import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "./login.dto";

async function errosDe(dados: Record<string, unknown>) {
  const erros = await validate(plainToInstance(LoginDto, dados));
  return erros.map((erro) => erro.property);
}

describe("LoginDto", () => {
  it("aceita e-mail e senha válidos", async () => {
    await expect(
      errosDe({ email: "gestor@example.com", senha: "segredo" }),
    ).resolves.toEqual([]);
  });

  it("aceita senha com 128 caracteres", async () => {
    await expect(
      errosDe({ email: "gestor@example.com", senha: "s".repeat(128) }),
    ).resolves.toEqual([]);
  });

  it("recusa senha com mais de 128 caracteres", async () => {
    await expect(
      errosDe({ email: "gestor@example.com", senha: "s".repeat(129) }),
    ).resolves.toEqual(["senha"]);
  });
});
