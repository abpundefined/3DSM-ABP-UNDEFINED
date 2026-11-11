import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { LoginDto } from "./dto/login.dto";
import { UsuariosRepository } from "./usuarios.repository";

export interface TokenPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const usuario = await this.usuariosRepository.findByEmail(dto.email);

    const senhaValida =
      usuario !== null && (await bcrypt.compare(dto.senha, usuario.senhaHash));

    if (!usuario || !senhaValida) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const payload: TokenPayload = { sub: usuario.id, email: usuario.email };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
