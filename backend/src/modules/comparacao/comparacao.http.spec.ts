jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Server } from "node:http";
import * as request from "supertest";
import { configurarSwagger } from "../../swagger";
import { ComparacaoController } from "./comparacao.controller";
import { ComparacaoRepository } from "./comparacao.repository";
import { ComparacaoService } from "./comparacao.service";

describe("GET /comparacao", () => {
  let app: INestApplication;
  const repository = {
    listarServicos: jest.fn(),
    obterTotais: jest.fn(),
    obterSerie: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ComparacaoController],
      providers: [
        ComparacaoService,
        { provide: ComparacaoRepository, useValue: repository },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    configurarSwagger(app);
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    repository.listarServicos.mockResolvedValue([
      { id: 1, nome: "api" },
      { id: 2, nome: "worker" },
    ]);
    repository.obterTotais.mockResolvedValue([]);
    repository.obterSerie.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app.close();
  });

  it("retorna os serviços selecionados para o período solicitado", async () => {
    const response = await request(app.getHttpServer() as Server)
      .get("/comparacao")
      .query({
        servicos: "1,2",
        inicio: "2026-11-10T12:15:00Z",
        fim: "2026-11-10T13:15:00Z",
      })
      .expect(200);
    expect(response.body).toMatchObject({
      periodo: {
        inicio: "2026-11-10T12:15:00.000Z",
        fim: "2026-11-10T13:15:00.000Z",
      },
      granularidade: "hora",
      servicos: [{ servicoId: 1 }, { servicoId: 2 }],
    });
  });

  it.each([
    {},
    { servicos: "1,1" },
    { servicos: "1,2", periodo: "7d", inicio: "2026-11-10T12:00:00Z" },
    { servicos: "1,2", inicio: "2026-11-10T12:00:00Z" },
    { servicos: ["1,2", "3,4"] },
  ])("retorna 400 para parâmetros inválidos: %j", async (query) => {
    await request(app.getHttpServer() as Server)
      .get("/comparacao")
      .query(query)
      .expect(400);
  });

  it("retorna 404 para serviço inexistente", async () => {
    repository.listarServicos.mockResolvedValue([{ id: 1, nome: "api" }]);
    const response = await request(app.getHttpServer() as Server)
      .get("/comparacao?servicos=1,2")
      .expect(404);
    expect(response.body).toMatchObject({
      message: expect.stringContaining("2") as unknown,
    });
  });

  it("documenta parâmetros, sucesso e erros no Swagger", async () => {
    const response = await request(app.getHttpServer() as Server)
      .get("/docs-json")
      .expect(200);
    const document = response.body as {
      paths: Record<
        string,
        Record<
          string,
          {
            parameters: { name: string }[];
            responses: Record<string, unknown>;
          }
        >
      >;
    };
    const operacao = document.paths["/comparacao"].get;
    expect(operacao.parameters.map((p) => p.name)).toEqual(
      expect.arrayContaining(["servicos", "periodo", "inicio", "fim"]),
    );
    expect(operacao.responses).toHaveProperty("200");
    expect(operacao.responses).toHaveProperty("400");
    expect(operacao.responses).toHaveProperty("404");
  });
});
