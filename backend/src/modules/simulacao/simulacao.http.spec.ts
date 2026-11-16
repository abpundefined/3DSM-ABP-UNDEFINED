jest.mock("../../database/prisma.service", () => ({
  PrismaService: class PrismaService {},
}));

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Server } from "node:http";
import * as request from "supertest";
import { configurarSwagger } from "../../swagger";
import { SimulacaoController } from "./simulacao.controller";
import { SimulacaoRepository } from "./simulacao.repository";
import { SimulacaoService } from "./simulacao.service";

describe("GET /servicos/:id/simulacao-regiao", () => {
  let app: INestApplication;
  const repository = {
    buscarServico: jest.fn(),
    somarEnergia: jest.fn(),
    listarRegioes: jest.fn(),
    mediaIntensidadePorRegiao: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SimulacaoController],
      providers: [
        SimulacaoService,
        { provide: SimulacaoRepository, useValue: repository },
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
    repository.buscarServico.mockResolvedValue({
      id: 1,
      nome: "api",
      regiaoCodigo: "us-east",
    });
    repository.somarEnergia.mockResolvedValue({ energiaKwh: 1, coletas: 3 });
    repository.listarRegioes.mockResolvedValue([
      {
        codigo: "us-east",
        pais: "Estados Unidos",
        regiao: "Virgínia",
        cidade: null,
      },
    ]);
    repository.mediaIntensidadePorRegiao.mockResolvedValue([
      { regiaoCodigo: "us-east", intensidadeMedia: 380, amostras: 3 },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  const servidor = () => app.getHttpServer() as Server;

  it("responde 200 com a simulação no período pedido", async () => {
    const response = await request(servidor())
      .get("/servicos/1/simulacao-regiao")
      .query({ periodo: "7d" })
      .expect(200);

    const corpo = response.body as {
      periodo: { inicio: string; fim: string };
      emissaoAtualGCo2e: number;
    };
    expect(corpo.emissaoAtualGCo2e).toBe(380);
    expect(
      new Date(corpo.periodo.fim).getTime() -
        new Date(corpo.periodo.inicio).getTime(),
    ).toBe(7 * 24 * 60 * 60 * 1000);
    expect(repository.buscarServico).toHaveBeenCalledWith(1);
  });

  it.each(["abc", "0", "99999999999"])(
    "responde 400 para id inválido (%s) sem consultar o banco",
    async (id) => {
      await request(servidor())
        .get(`/servicos/${id}/simulacao-regiao`)
        .expect(400);
      expect(repository.buscarServico).not.toHaveBeenCalled();
    },
  );

  it("responde 400 para período inválido", async () => {
    await request(servidor())
      .get("/servicos/1/simulacao-regiao")
      .query({ periodo: "7d", inicio: "2026-11-01T00:00:00Z" })
      .expect(400);
  });

  it("responde 404 para serviço inexistente", async () => {
    repository.buscarServico.mockResolvedValue(null);

    const response = await request(servidor())
      .get("/servicos/99/simulacao-regiao")
      .expect(404);

    expect((response.body as { message: string }).message).toBe(
      "Serviço não encontrado.",
    );
  });

  it("documenta a rota no Swagger com o período e as respostas", async () => {
    const response = await request(servidor()).get("/docs-json").expect(200);
    const operacao = (
      response.body as {
        paths: Record<
          string,
          {
            get: {
              parameters: { name: string }[];
              responses: Record<string, unknown>;
            };
          }
        >;
      }
    ).paths["/servicos/{id}/simulacao-regiao"].get;

    expect(operacao.parameters.map((p) => p.name)).toEqual(
      expect.arrayContaining(["id", "periodo", "inicio", "fim"]),
    );
    expect(Object.keys(operacao.responses)).toEqual(
      expect.arrayContaining(["200", "400", "404"]),
    );
  });
});
