import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Autenticação")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Autenticar e obter token JWT" })
  @ApiResponse({
    status: 200,
    description: "Token de acesso.",
    schema: {
      type: "object",
      properties: { accessToken: { type: "string" } },
    },
  })
  @ApiResponse({ status: 401, description: "Credenciais inválidas." })
  @ApiResponse({ status: 400, description: "Dados de autenticação inválidos." })
  @ApiResponse({
    status: 429,
    description: "Mais de 5 tentativas de login no mesmo minuto.",
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
