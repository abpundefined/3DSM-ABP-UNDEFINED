import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { UsuariosRepository } from "./usuarios.repository";

const CUSTO_HASH = 10;

@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usuariosRepository: UsuariosRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>("ADMIN_EMAIL");
    const senha = this.config.get<string>("ADMIN_PASSWORD");

    if (!email || !senha) {
      this.logger.warn(
        "ADMIN_EMAIL e ADMIN_PASSWORD não definidos: nenhum administrador foi criado.",
      );
      return;
    }

    if (await this.usuariosRepository.findByEmail(email)) {
      return;
    }

    await this.usuariosRepository.create({
      nome: this.config.get<string>("ADMIN_NOME") ?? "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, CUSTO_HASH),
    });

    this.logger.log(`Administrador ${email} criado.`);
  }
}
