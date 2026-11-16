import { validarAmbiente } from "./validar-ambiente";

const JWT_SECRET_VALIDO = "a".repeat(32);

describe("validarAmbiente", () => {
  it("aceita JWT_SECRET com 32 caracteres e sem ADMIN_PASSWORD", () => {
    const config = { JWT_SECRET: JWT_SECRET_VALIDO };

    expect(validarAmbiente(config)).toBe(config);
  });

  it("aceita ADMIN_PASSWORD com 12 caracteres", () => {
    const config = {
      JWT_SECRET: JWT_SECRET_VALIDO,
      ADMIN_PASSWORD: "senha-forte1",
    };

    expect(validarAmbiente(config)).toBe(config);
  });

  it("ignora ADMIN_PASSWORD vazio, como o seed do administrador", () => {
    expect(() =>
      validarAmbiente({ JWT_SECRET: JWT_SECRET_VALIDO, ADMIN_PASSWORD: "" }),
    ).not.toThrow();
  });

  it.each([
    ["ausente", {}],
    ["curto", { JWT_SECRET: "a".repeat(31) }],
    ["valor de exemplo", { JWT_SECRET: "change-me-to-a-strong-secret" }],
  ])("recusa JWT_SECRET %s", (_caso, config) => {
    expect(() => validarAmbiente(config)).toThrow(/JWT_SECRET/);
  });

  it.each([
    ["curto", "senha-curta"],
    ["valor de exemplo", "troque-esta-senha"],
  ])("recusa ADMIN_PASSWORD %s", (_caso, senha) => {
    expect(() =>
      validarAmbiente({ JWT_SECRET: JWT_SECRET_VALIDO, ADMIN_PASSWORD: senha }),
    ).toThrow(/ADMIN_PASSWORD/);
  });

  it("informa todos os problemas de uma vez", () => {
    expect(() =>
      validarAmbiente({ JWT_SECRET: "curto", ADMIN_PASSWORD: "curta" }),
    ).toThrow(/JWT_SECRET[\s\S]*ADMIN_PASSWORD/);
  });
});
