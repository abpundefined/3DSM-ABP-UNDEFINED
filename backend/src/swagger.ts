import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configurarSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("GreenER API")
    .setDescription("API de monitoramento e indicadores ambientais.")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);
}
