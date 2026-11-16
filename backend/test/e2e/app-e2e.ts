import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Client } from "pg";
import { AppModule } from "../../src/app.module";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { MonitoramentoService } from "../../src/modules/monitoramento/monitoramento.service";
import { ServicosService } from "../../src/modules/servicos/servicos.service";
import { urlDoBancoDeTeste } from "./ambiente";

const TABELAS = [
  "Coleta",
  "Servico",
  "Regiao",
  "ConfiguracaoMonitoramento",
  "Usuario",
];

export async function limparBanco(): Promise<void> {
  const cliente = new Client({ connectionString: urlDoBancoDeTeste() });
  await cliente.connect();
  try {
    await cliente.query(
      `TRUNCATE ${TABELAS.map((tabela) => `"${tabela}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );
  } finally {
    await cliente.end();
  }
}

export async function criarAppE2E(): Promise<INestApplication> {
  jest
    .spyOn(MonitoramentoService.prototype, "onModuleInit")
    .mockImplementation(async function (this: {
      servicosService: ServicosService;
    }) {
      await this.servicosService.verificarSchema();
    });

  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  return app;
}

export function executarCicloDeMonitoramento(app: INestApplication) {
  return app.get(MonitoramentoService).pollOnce();
}
