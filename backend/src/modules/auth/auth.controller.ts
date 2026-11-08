import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Autenticação")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
