jest.mock("@nestjs/jwt", () => ({ JwtService: class JwtService {} }));
jest.mock("./modules/auth/auth.service", () => ({
  AuthService: class AuthService {},
}));
jest.mock("./modules/coletas/coletas.service", () => ({
  ColetasService: class ColetasService {},
}));
jest.mock("./modules/configuracao/configuracao.service", () => ({
  ConfiguracaoService: class ConfiguracaoService {},
}));
jest.mock("./modules/indicadores/indicadores.service", () => ({
  IndicadoresService: class IndicadoresService {},
}));
jest.mock("./modules/indicadores/ranking.service", () => ({
  RankingService: class RankingService {},
}));
jest.mock("./modules/mapa/mapa.service", () => ({
  MapaService: class MapaService {},
}));
jest.mock("./modules/servicos/servicos.service", () => ({
  ServicosService: class ServicosService {},
}));

import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { Server } from "node:http";
import * as request from "supertest";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthController } from "./modules/auth/auth.controller";
import { AuthService } from "./modules/auth/auth.service";
import { ColetasController } from "./modules/coletas/coletas.controller";
import { ColetasService } from "./modules/coletas/coletas.service";
import { ConfiguracaoController } from "./modules/configuracao/configuracao.controller";
import { ConfiguracaoService } from "./modules/configuracao/configuracao.service";
import { IndicadoresController } from "./modules/indicadores/indicadores.controller";
import { IndicadoresService } from "./modules/indicadores/indicadores.service";
import { RankingController } from "./modules/indicadores/ranking.controller";
import { RankingService } from "./modules/indicadores/ranking.service";
import { MapaController } from "./modules/mapa/mapa.controller";
import { MapaService } from "./modules/mapa/mapa.service";
import { ServicosController } from "./modules/servicos/servicos.controller";
import { ServicosService } from "./modules/servicos/servicos.service";
import { configurarSwagger } from "./swagger";

describe("Swagger", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        ColetasController,
        ConfiguracaoController,
        IndicadoresController,
        RankingController,
        MapaController,
        ServicosController,
      ],
      providers: [
        AppService,
        { provide: AuthService, useValue: {} },
        { provide: ColetasService, useValue: {} },
        { provide: ConfiguracaoService, useValue: {} },
        { provide: IndicadoresService, useValue: {} },
        { provide: RankingService, useValue: {} },
        { provide: MapaService, useValue: {} },
        { provide: ServicosService, useValue: {} },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    configurarSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("disponibiliza a interface e o contrato OpenAPI com rotas, DTOs e autenticação", async () => {
    const server = app.getHttpServer() as Server;
    await request(server)
      .get("/docs")
      .expect(200)
      .expect("Content-Type", /html/)
      .expect(/swagger-ui/i);

    await request(server)
      .get("/docs/swagger-ui-init.js")
      .expect(200)
      .expect("Content-Type", /javascript/);

    await request(server)
      .get("/docs/swagger-ui-bundle.js")
      .expect(200)
      .expect("Content-Type", /javascript/);

    const response = await request(server).get("/docs-json").expect(200);
    const document = response.body as {
      paths: Record<
        string,
        Record<
          string,
          {
            parameters?: { name: string }[];
            security?: unknown;
            responses: Record<
              string,
              { content?: Record<string, { schema: unknown }> }
            >;
          }
        >
      >;
      components: {
        schemas: Record<
          string,
          { required?: string[]; properties: Record<string, { type?: string }> }
        >;
        securitySchemes: Record<string, { scheme: string }>;
      };
    };

    for (const [path, method] of [
      ["/", "get"],
      ["/auth/login", "post"],
      ["/servicos", "get"],
      ["/servicos/sync", "post"],
      ["/coletas", "get"],
      ["/coletas", "post"],
      ["/coletas/{id}", "get"],
      ["/coletas/servico/{servicoId}/ultima-valida", "get"],
      ["/indicadores", "get"],
      ["/ranking", "get"],
      ["/mapa", "get"],
      ["/configuracao", "get"],
      ["/configuracao", "put"],
    ]) {
      expect(document.paths[path]?.[method]).toBeDefined();
    }
    expect(document.paths["/indicadores"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "periodo" }),
        expect.objectContaining({ name: "inicio" }),
        expect.objectContaining({ name: "fim" }),
      ]),
    );
    expect(document.paths["/mapa"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "periodo" }),
        expect.objectContaining({ name: "inicio" }),
        expect.objectContaining({ name: "fim" }),
      ]),
    );
    expect(document.paths["/ranking"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "periodo" }),
        expect.objectContaining({ name: "inicio" }),
        expect.objectContaining({ name: "fim" }),
        expect.objectContaining({ name: "metrica" }),
        expect.objectContaining({ name: "limite" }),
      ]),
    );
    const rankingSchema =
      document.paths["/ranking"].get.responses["200"].content?.[
        "application/json"
      ].schema;
    expect(rankingSchema).toHaveProperty("type", "object");
    expect(rankingSchema).toHaveProperty("properties.periodo");
    expect(rankingSchema).toHaveProperty("properties.metrica");
    expect(rankingSchema).toHaveProperty("properties.itens");
    expect(rankingSchema).toHaveProperty("properties.semDados");
    expect(document.components.schemas.LoginDto.required).toEqual(
      expect.arrayContaining(["email", "senha"]),
    );
    expect(document.components.schemas.CreateColetaDto.required).toEqual(
      expect.arrayContaining(["servicoId", "estadoColeta"]),
    );
    expect(
      document.components.schemas.CreateColetaDto.properties
        .regiaoCodigoNaColeta.type,
    ).toBe("string");
    expect(
      document.components.schemas.AtualizarConfiguracaoDto.required,
    ).toEqual(
      expect.arrayContaining([
        "intervaloDescobertaSegundos",
        "intervaloColetaSegundos",
      ]),
    );
    expect(document.components.securitySchemes.bearer.scheme).toBe("bearer");
    expect(document.paths["/configuracao"].put.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths["/configuracao"].get.security).toBeUndefined();
    for (const [path, method] of [
      ["/coletas", "post"],
      ["/servicos/sync", "post"],
    ]) {
      expect(document.paths[path][method].security).toEqual([{ bearer: [] }]);
      expect(document.paths[path][method].responses["401"]).toBeDefined();
    }
    for (const [path, method, status, contentType] of [
      ["/", "get", "200", "text/html"],
      ["/auth/login", "post", "200", "application/json"],
      ["/servicos", "get", "200", "application/json"],
      ["/servicos/sync", "post", "201", "application/json"],
      ["/coletas", "get", "200", "application/json"],
      ["/coletas", "post", "201", "application/json"],
      ["/coletas/{id}", "get", "200", "application/json"],
      [
        "/coletas/servico/{servicoId}/ultima-valida",
        "get",
        "200",
        "application/json",
      ],
      ["/indicadores", "get", "200", "application/json"],
      ["/ranking", "get", "200", "application/json"],
      ["/mapa", "get", "200", "application/json"],
      ["/configuracao", "get", "200", "application/json"],
      ["/configuracao", "put", "200", "application/json"],
    ]) {
      expect(
        document.paths[path][method].responses[status].content?.[contentType]
          ?.schema,
      ).toBeDefined();
    }
    expect(
      document.paths["/coletas"].get.responses["200"].content?.[
        "application/json"
      ].schema,
    ).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/HistoricoColetaRespostaDto" },
    });
    expect(
      document.paths["/servicos/sync"].post.responses["201"].content?.[
        "application/json"
      ].schema,
    ).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/ServicoDescobertoRespostaDto" },
    });
    expect(
      document.components.schemas.ColetaRespostaDto.properties.energiaKwh,
    ).toEqual(expect.objectContaining({ type: "number", nullable: true }));
    expect(
      document.components.schemas.ConfiguracaoRespostaDto.properties
        .atualizadaEm,
    ).toEqual(
      expect.objectContaining({
        type: "string",
        format: "date-time",
        nullable: true,
      }),
    );
    expect(document.components.schemas.IndicadoresRespostaDto.required).toEqual(
      expect.arrayContaining([
        "periodo",
        "energiaTotalKwh",
        "emissaoTotalGCo2e",
        "servicos",
      ]),
    );
  });
});
