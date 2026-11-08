import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Aplicação")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Consultar mensagem inicial da API" })
  @ApiResponse({
    status: 200,
    description: "Mensagem inicial.",
    content: {
      "text/html": { schema: { type: "string", example: "Hello World!" } },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
