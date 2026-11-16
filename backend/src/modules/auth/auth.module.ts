import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "../../database/database.module";
import { OPCOES_LIMITE_LOGIN } from "./limite-login";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsuariosRepository } from "./usuarios.repository";
import { AdminSeedService } from "./admin-seed.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot(OPCOES_LIMITE_LOGIN),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: Number(config.get<string>("JWT_EXPIRES_IN") ?? 3600),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsuariosRepository, AdminSeedService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
