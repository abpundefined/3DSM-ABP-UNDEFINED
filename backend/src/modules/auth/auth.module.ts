import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "../../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsuariosRepository } from "./usuarios.repository";

@Module({
  imports: [
    DatabaseModule,
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
  providers: [AuthService, UsuariosRepository],
})
export class AuthModule {}