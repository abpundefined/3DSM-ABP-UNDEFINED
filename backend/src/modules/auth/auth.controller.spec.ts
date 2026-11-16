jest.mock("./auth.service", () => ({
  AuthService: class AuthService {},
}));

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import { Server } from "node:http";
import * as request from "supertest";
import { HttpExceptionFilter } from "../../common/filters/http-exception.filter";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OPCOES_LIMITE_LOGIN } from "./limite-login";

describe("AuthController — limite de tentativas de login", () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn().mockResolvedValue({ accessToken: "token" }),
  };

  beforeEach(async () => {
    const modulo = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(OPCOES_LIMITE_LOGIN)],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const tentarLogin = () =>
    request(app.getHttpServer() as Server)
      .post("/auth/login")
      .send({ email: "gestor@example.com", senha: "segredo" });

  it("permite 5 tentativas por minuto", async () => {
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      const resposta = await tentarLogin();
      expect(resposta.status).toBe(200);
    }
  });

  it("bloqueia a 6ª tentativa no mesmo minuto com 429 e mensagem em português", async () => {
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      await tentarLogin();
    }

    const resposta = await tentarLogin();

    expect(resposta.status).toBe(429);
    expect(JSON.stringify(resposta.body)).toContain(
      "Muitas tentativas de login",
    );
  });

  it("conta também as tentativas com dados inválidos", async () => {
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      await request(app.getHttpServer() as Server)
        .post("/auth/login")
        .send({ email: "invalido", senha: "" });
    }

    const resposta = await tentarLogin();

    expect(resposta.status).toBe(429);
  });
});
