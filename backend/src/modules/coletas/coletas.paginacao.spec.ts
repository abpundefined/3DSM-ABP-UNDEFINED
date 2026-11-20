jest.mock("@nestjs/jwt", () => ({ JwtService: class JwtService {} }));
jest.mock("./coletas.service", () => ({
  ColetasService: class ColetasService {},
}));

import { INestApplication, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { Server } from "node:http";
import * as request from "supertest";
import { ColetasController } from "./coletas.controller";
import { ColetasService } from "./coletas.service";

describe("Paginação de GET /coletas", () => {
  let app: INestApplication;
  const listarHistorico = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ColetasController],
      providers: [
        { provide: ColetasService, useValue: { listarHistorico } },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    listarHistorico.mockReset();
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => app.close());

  it("usa página 1 e tamanho 20 quando não informados", async () => {
    const pagina = {
      itens: [],
      pagina: 1,
      tamanho: 20,
      total: 0,
      totalPaginas: 0,
    };
    listarHistorico.mockResolvedValue(pagina);
    await request(app.getHttpServer() as Server)
      .get("/coletas")
      .expect(200)
      .expect(pagina);
    expect(listarHistorico).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, tamanho: 20 }),
    );
  });

  it("transforma os parâmetros e preserva filtros existentes", async () => {
    listarHistorico.mockResolvedValue({
      itens: [],
      pagina: 3,
      tamanho: 100,
      total: 0,
      totalPaginas: 0,
    });
    await request(app.getHttpServer() as Server)
      .get(
        "/coletas?pagina=3&tamanho=100&servicoId=7&dataInicio=2026-11-01T00:00:00Z",
      )
      .expect(200);
    expect(listarHistorico).toHaveBeenCalledWith(
      expect.objectContaining({
        pagina: 3,
        tamanho: 100,
        servicoId: 7,
        dataInicio: new Date("2026-11-01T00:00:00Z"),
      }),
    );
  });

  it.each([
    "pagina=0",
    "pagina=-1",
    "pagina=abc",
    "pagina=1.5",
    "pagina=",
    "tamanho=0",
    "tamanho=-1",
    "tamanho=101",
    "tamanho=abc",
    "tamanho=2.5",
    "tamanho=",
    "pagina=1&pagina=2",
    "tamanho=10&tamanho=20",
  ])("retorna 400 antes de consultar o histórico: %s", async (query) => {
    await request(app.getHttpServer() as Server)
      .get(`/coletas?${query}`)
      .expect(400);
    expect(listarHistorico).not.toHaveBeenCalled();
  });
});
