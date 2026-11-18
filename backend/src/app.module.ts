import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validarAmbiente } from "./config/validar-ambiente";
import { DatabaseModule } from "./database/database.module";
import { ColetasModule } from "./modules/coletas/coletas.module";
import { ServicosModule } from "./modules/servicos/servicos.module";
import { MonitoramentoModule } from "./modules/monitoramento/monitoramento.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ConfiguracaoModule } from "./modules/configuracao/configuracao.module";
import { IndicadoresModule } from "./modules/indicadores/indicadores.module";
import { MapaModule } from "./modules/mapa/mapa.module";
import { ComparacaoModule } from "./modules/comparacao/comparacao.module";
import { SimulacaoModule } from "./modules/simulacao/simulacao.module";
import { SaudeModule } from "./modules/saude/saude.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
      validate: validarAmbiente,
    }),
    DatabaseModule,
    ColetasModule,
    ServicosModule,
    MonitoramentoModule,
    AuthModule,
    ConfiguracaoModule,
    IndicadoresModule,
    MapaModule,
    ComparacaoModule,
    SimulacaoModule,
    SaudeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
