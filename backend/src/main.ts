import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { configurarSwagger } from "./swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();
  app.enableShutdownHooks();

  configurarSwagger(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap().catch((error: unknown) => {
  const logger = new Logger("Bootstrap");
  logger.error(
    "Falha ao iniciar a aplicação.",
    error instanceof Error ? error.stack : String(error),
  );
  process.exitCode = 1;
});
