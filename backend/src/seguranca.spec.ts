import { Controller, Get, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Server } from "node:http";
import * as request from "supertest";
import { configurarSeguranca, lerOrigensPermitidas } from "./seguranca";

@Controller("teste")
class TesteController {
  @Get()
  responder() {
    return { ok: true };
  }
}

describe("lerOrigensPermitidas", () => {
  it("usa o frontend local quando a variável não está definida", () => {
    expect(lerOrigensPermitidas(undefined)).toEqual(["http://localhost:5173"]);
    expect(lerOrigensPermitidas("  ")).toEqual(["http://localhost:5173"]);
  });

  it("separa várias origens por vírgula e ignora espaços e itens vazios", () => {
    expect(
      lerOrigensPermitidas(" http://localhost:5173, https://greener.app ,"),
    ).toEqual(["http://localhost:5173", "https://greener.app"]);
  });
});

describe("configurarSeguranca", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [TesteController],
    }).compile();
    app = modulo.createNestApplication();
    configurarSeguranca(app, ["http://localhost:5173"]);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("envia os cabeçalhos de segurança e oculta o X-Powered-By", async () => {
    const resposta = await request(app.getHttpServer() as Server).get("/teste");

    expect(resposta.headers["x-content-type-options"]).toBe("nosniff");
    expect(resposta.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(resposta.headers["strict-transport-security"]).toBeDefined();
    expect(resposta.headers["x-powered-by"]).toBeUndefined();
  });

  it("aplica CSP sem forçar HTTPS, pois a API é servida por HTTP na rede local", async () => {
    const resposta = await request(app.getHttpServer() as Server).get("/teste");
    const csp = resposta.headers["content-security-policy"];

    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("libera CORS para a origem permitida", async () => {
    const resposta = await request(app.getHttpServer() as Server)
      .get("/teste")
      .set("Origin", "http://localhost:5173");

    expect(resposta.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("não libera CORS para outra origem", async () => {
    const resposta = await request(app.getHttpServer() as Server)
      .get("/teste")
      .set("Origin", "https://site-malicioso.example");

    expect(resposta.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
